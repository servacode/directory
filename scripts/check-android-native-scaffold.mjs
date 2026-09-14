import { existsSync, readFileSync } from 'node:fs';

const required = [
  'apps/mobile/android',
  'apps/mobile/android/gradlew',
  'apps/mobile/android/app/src/main/AndroidManifest.xml',
  'apps/mobile/app.json',
  'apps/mobile/metro.config.js',
  'apps/mobile/babel.config.js',
];
let failed = 0;
for (const path of required) {
  const ok = existsSync(path);
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${path}`);
  if (!ok) failed += 1;
}

const pkgPath = 'apps/mobile/package.json';
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const hasDirectCli = Boolean(pkg.devDependencies?.['@react-native-community/cli'] || pkg.dependencies?.['@react-native-community/cli']);
  console.log(`${!hasDirectCli ? 'PASS' : 'FAIL'} - standalone RN CLI is not pinned in mobile package`);
  if (hasDirectCli) failed += 1;
}

if (failed) {
  console.error(`Android native scaffold check: ${failed} blocking item(s). See docs/operations/android-native-bootstrap.md`);
  process.exit(1);
}
console.log('Android native scaffold check: PASS');
