import fs from 'node:fs';
import path from 'node:path';

const read=(p)=>fs.readFileSync(p,'utf8');
const checks=[];
const check=(name,ok)=>{checks.push([name,Boolean(ok)]);console.log(`${ok?'PASS':'FAIL'} - ${name}`)};

const contracts=read('packages/contracts/src/directory/index.ts');
const catalog=read('apps/api/src/modules/directory/directory-catalog.service.ts');
const migration=read('infrastructure/database/migrations/0010_dynamic_directory_categories.sql');
const seed=read('infrastructure/database/seeds/001_core_reference_data.sql');
const home=read('apps/mobile/src/screens/HomeScreen.tsx');
const admin=read('apps/admin/src/components/AdminConsole.tsx');
const verification=read('apps/api/src/modules/facilities/facility-verification.service.ts');
const review=read('apps/api/src/modules/admin/admin-facility-review.service.ts');

check('Public taxonomy contracts are dynamic',contracts.includes('DirectoryCategoryDTO')&&contracts.includes('DirectoryCategoryGroupDTO')&&!contracts.includes('FacilityType'));
check('Category DTO carries group display names',contracts.includes('groupNameAr')&&catalog.includes('g.name_ar AS "groupNameAr"'));
check('Categories can move between groups',contracts.includes('readonly groupId: Identifier;')&&catalog.includes('SET group_id=$2')&&admin.includes('setGroupId(category.groupId)'));
check('Admin manages group lifecycle',admin.includes('GroupEditor')&&admin.includes('updateDirectoryGroup')&&admin.includes('group.sortOrder'));
check('Android groups categories from server metadata',home.includes('groupedCategories')&&home.includes('category.groupNameAr'));
check('Province activation has independent public/onboarding switches',migration.includes('public_enabled BOOLEAN')&&migration.includes('owner_registration_enabled BOOLEAN')&&catalog.includes('setProvinceActivation'));
check('New generic categories start disabled in every province',catalog.includes('SELECT $1,id,FALSE,FALSE FROM provinces'));
check('New generic categories receive default private verification',catalog.includes("'STOREFRONT_PHOTO'")&&catalog.includes("'BUSINESS_CARD'"));
check('Verification evidence is stored separately from public facility media',migration.includes('CREATE TABLE facility_verification_evidence')&&verification.includes("this.storage.put('verification-evidence'"));
check('Required evidence gates admin approval',review.includes('this.verification.assertComplete'));
check('Evidence viewing is audit logged',verification.includes('FACILITY_VERIFICATION_EVIDENCE_VIEWED'));
check('Raqqa initial activation is pharmacy-only',seed.includes("c.code='PHARMACY' AND p.name_ar='الرقة'"));
check('Medical laboratory is preconfigured but not auto-enabled',migration.includes("'MEDICAL_LAB','medical-lab'")&&!seed.includes("c.code='MEDICAL_LAB' AND p.name_ar='الرقة'"));
check('Legacy public type column migrated to internal specialization',migration.includes('RENAME COLUMN facility_type TO specialization'));

const sourceRoots=['apps','packages'];
const legacy=[];
const walk=(dir)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='dist'||e.name==='node_modules')continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)){const text=read(p);if(/\bFacilityType\b|MEDICAL_SUPPLIES_CENTER|\bfacility_type\b/.test(text))legacy.push(p)}}};
for(const root of sourceRoots)walk(root);
check('Application/runtime source contains no legacy public FacilityType taxonomy',legacy.length===0);

const failed=checks.filter(([,ok])=>!ok);
if(failed.length){console.error(`Dynamic directory gate: ${checks.length-failed.length}/${checks.length} PASS`);for(const[name]of failed)console.error(`- ${name}`);if(legacy.length)console.error(`Legacy files: ${legacy.join(', ')}`);process.exit(1)}
console.log(`Dynamic directory gate: ${checks.length}/${checks.length} PASS`);
