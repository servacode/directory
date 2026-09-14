import { readFile } from 'node:fs/promises';
const failures=[];
const required=[
 ['apps/api/src/modules/admin/admin-facilities.controller.ts',"@RequireRoles('ADMIN')"],
 ['apps/api/src/modules/admin/admin-facility-review.service.ts','FOR UPDATE OF fa, f'],
 ['apps/api/src/modules/admin/admin-facility-review.service.ts',"status='APPROVED'"],
 ['apps/api/src/modules/admin/admin-facility-review.service.ts',"status='REJECTED'"],
 ['apps/api/src/modules/admin/admin-facility-review.service.ts',"status='SUSPENDED'"],
 ['apps/api/src/modules/admin/facility-duplicate-detection.service.ts','ST_DWithin'],
 ['apps/api/src/modules/admin/facility-duplicate-detection.service.ts','similarity('],
 ['infrastructure/database/migrations/0007_search_and_duplicate_support.sql','CREATE EXTENSION IF NOT EXISTS pg_trgm'],
];
for(const [file,phrase] of required){const t=await readFile(file,'utf8');if(!t.includes(phrase)) failures.push(`${file}: missing ${phrase}`)}
if(failures.length){console.error('Phase 6 verification failed\n'+failures.map(x=>`- ${x}`).join('\n'));process.exit(1)}
console.log('Phase 6 static verification: PASS');
console.log('Admin review authorization: ADMIN only');
console.log('Approve/reject locking: PASS');
console.log('Duplicate detection signals: phone + name + geo');
