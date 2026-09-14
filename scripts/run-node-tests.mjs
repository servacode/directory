import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = process.argv.slice(2);
if (!roots.length) {
  console.error('Usage: node scripts/run-node-tests.mjs <file-or-directory> [...]');
  process.exit(2);
}

const files = [];
function collect(input) {
  const path = resolve(input);
  const stat = statSync(path);
  if (stat.isFile()) {
    if (path.endsWith('.test.mjs')) files.push(path);
    return;
  }
  for (const name of readdirSync(path)) collect(`${path}/${name}`);
}
for (const root of roots) collect(root);
files.sort();
if (!files.length) {
  console.error('No .test.mjs files found.');
  process.exit(2);
}
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
