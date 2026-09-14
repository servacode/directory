import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const migrationsDir = resolve('infrastructure/database/migrations');
const seedFile = resolve('infrastructure/database/seeds/001_core_reference_data.sql');
const migrationFiles = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
const requiredMigrationPrefix = [
  '0001_extensions_and_helpers.sql',
  '0002_reference_geography.sql',
  '0003_identity_and_facilities.sql',
  '0004_hours_duty_ratings.sql',
  '0005_applications_audit.sql',
];
const failures = [];
if (JSON.stringify(migrationFiles.slice(0, requiredMigrationPrefix.length)) !== JSON.stringify(requiredMigrationPrefix)) failures.push('Required Phase 2 migration prefix/order mismatch');
const sql = (await Promise.all(migrationFiles.map((file) => readFile(resolve(migrationsDir, file), 'utf8')))).join('\n');
const requiredTables = [
  'provinces','cities','neighborhoods','doctor_specialties','nursing_services','users','user_sessions','facilities',
  'facility_members','pharmacy_profiles','medical_clinic_profiles','nursing_center_profiles','facility_nursing_services',
  'facility_images','facility_business_days','business_hours_periods','temporary_closures','pharmacy_duty_shifts','ratings',
  'facility_applications','audit_logs','directory_category_groups','directory_categories','directory_category_provinces','category_verification_requirements','facility_verification_evidence',
];
for (const table of requiredTables) {
  if (!sql.includes(`CREATE TABLE ${table}`)) failures.push(`Missing table: ${table}`);
}
for (const phrase of [
  'CREATE EXTENSION IF NOT EXISTS postgis',
  'CREATE EXTENSION IF NOT EXISTS btree_gist',
  'GEOGRAPHY(POINT, 4326)',
  'idx_facilities_location',
  'idx_facility_single_owner',
  'idx_facility_one_primary_image',
  'pharmacy_duty_shifts_no_overlap',
  'temporary_closures_no_overlap',
  'ratings_user_facility_unique',
  'idx_facility_single_pending_application',
  'ALTER TABLE facilities RENAME COLUMN facility_type TO specialization',
  "CHECK (specialization IN ('GENERIC','PHARMACY','MEDICAL_CLINIC','NURSING_CENTER'))",
  'directory_category_provinces',
  'facility_verification_evidence',
  "phone ~ '^\\+9639[0-9]{8}$'",
]) {
  if (!sql.includes(phrase)) failures.push(`Missing schema invariant: ${phrase}`);
}
const seed = await readFile(seedFile, 'utf8');
const provinceRows = [...seed.matchAll(/'10000000-0000-4000-8000-0000000000\d{2}'/g)].length;
if (provinceRows < 14) failures.push(`Expected all 14 Syrian governorates in seed; found ${provinceRows}`);
if (!seed.includes("'الرقة','Raqqa',TRUE")) failures.push('Raqqa must be active in core seed');
if (!seed.includes('ON CONFLICT')) failures.push('Core seed must be idempotent');
if (!seed.includes("c.code='PHARMACY' AND p.name_ar='الرقة'")) failures.push('Only pharmacy must be enabled for initial Raqqa directory launch');
if (!sql.includes("'MEDICAL_LAB','medical-lab'")) failures.push('Medical laboratory must be preconfigured as a hidden dynamic category');
if (!sql.includes("'STOREFRONT_PHOTO'") || !sql.includes("'BUSINESS_CARD'")) failures.push('Default private verification requirements are missing');
if (failures.length) {
  console.error('Database schema verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Database static schema verification: PASS');
console.log(`Migrations: ${migrationFiles.length}`);
console.log(`Required tables: ${requiredTables.length}`);
console.log('Syrian governorates seeded: 14');
console.log('Raqqa pharmacy-only launch activation: PASS');
console.log('Dynamic directory + private verification schema: PASS');
