import { readFileSync, existsSync } from 'node:fs';
const fail=[];
const required=['render.yaml','infrastructure/render/Dockerfile.api','infrastructure/render/Dockerfile.admin','docs/operations/render-staging.md'];
for(const f of required) if(!existsSync(f)) fail.push(`missing ${f}`);
const yaml=readFileSync('render.yaml','utf8');
for(const needle of [
  'directory-api-stg-466ef4d',
  'directory-admin-stg-466ef4d',
  'directory-db-stg-466ef4d',
  'property: connectionString',
  'mountPath: /app/storage',
  'preDeployCommand: node scripts/db-migrate.mjs && node scripts/db-seed.mjs',
  'healthCheckPath: /api/v1/health/ready',
  'ipAllowList: []'
]) if(!yaml.includes(needle)) fail.push(`render.yaml missing ${needle}`);
const api=readFileSync('infrastructure/render/Dockerfile.api','utf8');
if(!api.includes('pnpm install --no-frozen-lockfile')) fail.push('staging API must explicitly document/use connected dependency resolution');
const prod=readFileSync('infrastructure/production/Dockerfile.api','utf8');
if(!prod.includes('pnpm-lock.yaml is required for production builds')||!prod.includes('pnpm install --frozen-lockfile')) fail.push('production lockfile gate was weakened');
if(fail.length){console.error(fail.join('\n'));process.exit(1)}
console.log('Render staging gate: PASS (staging Blueprint + persistence + DB wiring + production lock discipline)');
