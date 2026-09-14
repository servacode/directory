import { existsSync, readFileSync } from 'node:fs';
const required = [
  'package.json','pnpm-workspace.yaml','tsconfig.base.json','apps/api/src/main.ts','apps/admin/app/page.tsx','apps/mobile/src/App.tsx',
  'packages/design-tokens/src/index.ts','packages/i18n/src/index.ts','packages/icon-registry/src/index.ts','docs/qa/phase-0-closure.md'
];
const missing = required.filter((p) => !existsSync(new URL(`../${p}`, import.meta.url)));
if (missing.length) { console.error(`Missing foundation files: ${missing.join(', ')}`); process.exit(1); }
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (pkg.packageManager !== 'pnpm@12.4.1') throw new Error('Unexpected package manager pin');
console.log('Foundation structural verification: PASS');
