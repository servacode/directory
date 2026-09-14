import { existsSync, readFileSync } from 'node:fs';
const envFile=process.argv[2]??'infrastructure/production/.env.production';
function parseEnv(file){if(!existsSync(file))return{};return Object.fromEntries(readFileSync(file,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#')).map(line=>{const i=line.indexOf('=');return i<0?[line,'']:[line.slice(0,i),line.slice(i+1)]}))}
const env={...parseEnv(envFile),...process.env};let failed=0;const gate=(name,ok,detail='')=>{console.log(`${ok?'PASS':'FAIL'} - ${name}${detail?`: ${detail}`:''}`);if(!ok)failed++};
const domain=env.APP_DOMAIN??'';const access=env.ACCESS_TOKEN_SECRET??'';const refresh=env.REFRESH_TOKEN_SECRET??'';const otp=env.OTP_HMAC_SECRET??'';const dbPassword=env.POSTGRES_PASSWORD??'';const dbUrl=env.DATABASE_URL??'';
gate('production env file exists',existsSync(envFile),envFile);
gate('pnpm lockfile exists',existsSync('pnpm-lock.yaml'),'required for reproducible production build');
gate('Android native scaffold exists',existsSync('apps/mobile/android'),'required before signed AAB');
gate('APP_DOMAIN looks real',Boolean(domain)&&!domain.includes('example.')&&!/^https?:/.test(domain));
gate('TLS_EMAIL configured',Boolean(env.TLS_EMAIL)&&!String(env.TLS_EMAIL).includes('example.com'));
gate('access secret >=32 and not placeholder',access.length>=32&&!access.includes('replace-with'));
gate('refresh secret >=32 and distinct',refresh.length>=32&&refresh!==access&&!refresh.includes('replace-with'));
gate('OTP HMAC secret >=32 and distinct',otp.length>=32&&otp!==access&&otp!==refresh&&!otp.includes('replace-with'));
gate('database password not placeholder',dbPassword.length>=16&&!dbPassword.includes('replace-with'));
gate('DATABASE_URL uses postgres service',dbUrl.includes('@postgres:5432/'));
gate('production mobile env template present',existsSync('apps/mobile/.env.production.example'));
gate('production compose present',existsSync('infrastructure/production/docker-compose.yml'));
gate('Caddy config present',existsSync('infrastructure/production/Caddyfile'));
if(failed){console.error(`Production preflight: ${failed} blocking gate(s).`);process.exit(1)}console.log('Production preflight: PASS');
