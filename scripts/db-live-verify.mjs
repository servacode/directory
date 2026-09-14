import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

function query(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], {
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: process.platform === 'win32',
    });
    let out = '';
    child.stdout?.on('data', (chunk) => { out += String(chunk); });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve(out.trim()) : reject(new Error(`psql exited with ${code}`)));
  });
}

let failed = 0;
const gate = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${detail ? `: ${detail}` : ''}`);
  if (!ok) failed += 1;
};
const scalar = async (sql) => String(await query(sql));

const migrationFiles = (await readdir('infrastructure/database/migrations')).filter((x) => /^\d+_.+\.sql$/.test(x));
const migrationCount = Number(await scalar('SELECT COUNT(*) FROM schema_migrations;'));
gate('all repository migrations are recorded', migrationCount === migrationFiles.length, `${migrationCount}/${migrationFiles.length}`);

gate('PostGIS is installed', Number(await scalar("SELECT COUNT(*) FROM pg_extension WHERE extname='postgis';")) === 1);
gate('all Syrian governorates are seeded', Number(await scalar('SELECT COUNT(*) FROM provinces;')) >= 14);
gate('Raqqa is active', Number(await scalar("SELECT COUNT(*) FROM provinces WHERE name_ar='الرقة' AND is_active=TRUE;")) === 1);
gate('legacy public-scope index is removed', Number(await scalar("SELECT COUNT(*) FROM pg_indexes WHERE indexname='idx_facilities_public_scope';")) === 0);
gate('dynamic category public index exists', Number(await scalar("SELECT COUNT(*) FROM pg_indexes WHERE indexname='idx_facilities_category_public_scope';")) === 1);
gate('facility category is required', String(await scalar("SELECT is_nullable FROM information_schema.columns WHERE table_name='facilities' AND column_name='category_id';")) === 'NO');
gate('re-verification status is accepted', (await scalar("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='facilities_status_check';")).includes('REVERIFICATION_REQUIRED'));

gate('Raqqa pharmacy public ON', Number(await scalar(`SELECT COUNT(*) FROM directory_category_provinces dcp JOIN directory_categories dc ON dc.id=dcp.category_id JOIN provinces p ON p.id=dcp.province_id WHERE p.name_ar='الرقة' AND dc.code='PHARMACY' AND dcp.public_enabled=TRUE;`)) === 1);
gate('Raqqa pharmacy onboarding ON', Number(await scalar(`SELECT COUNT(*) FROM directory_category_provinces dcp JOIN directory_categories dc ON dc.id=dcp.category_id JOIN provinces p ON p.id=dcp.province_id WHERE p.name_ar='الرقة' AND dc.code='PHARMACY' AND dcp.owner_registration_enabled=TRUE;`)) === 1);
gate('other Raqqa seeded categories public OFF', Number(await scalar(`SELECT COUNT(*) FROM directory_category_provinces dcp JOIN directory_categories dc ON dc.id=dcp.category_id JOIN provinces p ON p.id=dcp.province_id WHERE p.name_ar='الرقة' AND dc.code<>'PHARMACY' AND dcp.public_enabled=TRUE;`)) === 0);
gate('audit feed index exists', Number(await scalar("SELECT COUNT(*) FROM pg_indexes WHERE indexname='idx_audit_created_at';")) === 1);

if (failed) {
  console.error(`Live database verification: ${failed} gate(s) failed.`);
  process.exit(1);
}
console.log('Live database verification: PASS');
