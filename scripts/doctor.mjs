import { execFileSync } from 'node:child_process';
const failures = [];
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < 24) failures.push(`Node.js 24+ required; current=${process.versions.node}`);
for (const cmd of ['git']) {
  try { execFileSync(cmd, ['--version'], { stdio: 'ignore' }); } catch { failures.push(`${cmd} not found`); }
}
if (failures.length) {
  console.error('Environment doctor found blockers:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Environment doctor: PASS');
