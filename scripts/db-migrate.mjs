import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const migrationsDir = resolve('infrastructure/database/migrations');

function run(args, { capture = false, stdin } = {}) {
  return new Promise((resolveRun, reject) => {
    const stdio = stdin === undefined
      ? (capture ? ['ignore', 'pipe', 'inherit'] : 'inherit')
      : ['pipe', capture ? 'pipe' : 'inherit', 'inherit'];
    const child = spawn('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', ...args], {
      stdio,
      shell: process.platform === 'win32',
    });
    let out = '';
    if (capture) child.stdout?.on('data', (chunk) => { out += String(chunk); });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolveRun(out) : reject(new Error(`psql exited with ${code}`)));
    if (stdin !== undefined) child.stdin?.end(stdin);
  });
}

function withAtomicMigrationMarker(sql, file) {
  const commitPattern = /\bCOMMIT\s*;\s*$/i;
  if (!commitPattern.test(sql)) {
    throw new Error(`${file} must end with COMMIT; so its schema change and migration marker are atomic.`);
  }
  const escaped = file.replaceAll("'", "''");
  const marker = `INSERT INTO schema_migrations(name) VALUES('${escaped}') ON CONFLICT DO NOTHING;\nCOMMIT;`;
  return sql.replace(commitPattern, marker);
}

await run(['-c', `CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`]);

const appliedRaw = await run(['-At', '-c', 'SELECT name FROM schema_migrations ORDER BY name'], { capture: true });
const applied = new Set(String(appliedRaw).split(/\r?\n/).map((x) => x.trim()).filter(Boolean));
const files = (await readdir(migrationsDir)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();

for (const file of files) {
  if (applied.has(file)) {
    console.log(`skip ${file}`);
    continue;
  }
  console.log(`apply ${file}`);
  const source = await readFile(resolve(migrationsDir, file), 'utf8');
  await run(['-f', '-'], { stdin: withAtomicMigrationMarker(source, file) });
}

const appliedAfter = await run(['-At', '-c', 'SELECT COUNT(*) FROM schema_migrations'], { capture: true });
if (Number(String(appliedAfter).trim()) !== files.length) {
  throw new Error(`Migration ledger mismatch: expected ${files.length}, found ${String(appliedAfter).trim()}.`);
}
console.log(`Migrations current: ${files.length} files.`);
