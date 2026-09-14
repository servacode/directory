import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const shell = isWindows;
const failures = [];

function gate(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${detail ? `: ${detail}` : ''}`);
  if (!ok) failures.push(name);
  return ok;
}

function run(name, command, args = [], env = process.env) {
  console.log(`\n== ${name} ==`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell, env });
  const ok = result.status === 0;
  gate(name, ok, ok ? '' : `exit ${result.status ?? 'spawn-error'}`);
  return ok;
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
gate('Node 24+', nodeMajor >= 24, process.version);
gate('pnpm-lock.yaml exists', existsSync('pnpm-lock.yaml'));

const pnpmVersion = spawnSync(isWindows ? 'pnpm.cmd' : 'pnpm', ['--version'], { encoding: 'utf8', shell });
gate('pnpm available', pnpmVersion.status === 0, pnpmVersion.stdout?.trim() ?? '');

if (failures.length) {
  console.error('\nStaging qualification cannot start until the prerequisite gates above pass.');
  process.exit(1);
}

const pnpm = isWindows ? 'pnpm.cmd' : 'pnpm';
run('Frozen dependency install', pnpm, ['install', '--frozen-lockfile']);
run('Environment doctor', pnpm, ['doctor']);
run('Foundation gate', pnpm, ['verify:foundation']);
run('Dynamic directory gate', pnpm, ['verify:dynamic-directory']);
run('Remediation gate', pnpm, ['verify:remediation']);
run('Error-code registry', pnpm, ['verify:error-codes']);
run('Centralization audit', pnpm, ['audit:centralization']);
run('Typecheck', pnpm, ['typecheck']);
run('Lint', pnpm, ['lint']);
run('Tests', pnpm, ['test']);
run('Build', pnpm, ['build']);

const hasDb = Boolean(process.env.DATABASE_URL);
gate('DATABASE_URL configured for staging', hasDb);
if (hasDb) {
  run('Database migrations', pnpm, ['db:migrate']);
  run('Database core seed', pnpm, ['db:seed']);
  run('Live database verification', pnpm, ['db:verify-live']);
}

const nativeExists = existsSync('apps/mobile/android');
gate('Android native scaffold exists', nativeExists);
if (nativeExists) {
  run('Android native scaffold verification', pnpm, ['verify:android-native']);
  const gradle = isWindows ? 'apps/mobile/android/gradlew.bat' : './apps/mobile/android/gradlew';
  const cwd = process.cwd();
  const result = spawnSync(gradle, ['-p', `${cwd}/apps/mobile/android`, 'assembleDebug'], { stdio: 'inherit', shell });
  gate('Android Gradle debug build', result.status === 0);
}

if (failures.length) {
  console.error(`\nSTAGING AUTOMATED QUALIFICATION: NO-GO (${failures.length} failed gate(s))`);
  process.exit(1);
}

console.log('\nSTAGING AUTOMATED QUALIFICATION: PASS');
console.log('Next: execute docs/qa/staging-golden-path.md on a physical Android device and staging HTTPS environment.');
