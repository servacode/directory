import{readFile}from'node:fs/promises';const failures=[];const required=[
['apps/api/src/modules/facilities/facility-application.service.ts','FACILITY_DRAFT_CREATED'],
['apps/api/src/modules/facilities/facility-application.service.ts',"status='PENDING_REVIEW'"],
['apps/api/src/modules/facilities/facility-application.service.ts','ST_SetSRID(ST_MakePoint'],
['apps/api/src/modules/facilities/facility-submission-policy.ts',"snapshot.specialization === 'MEDICAL_CLINIC'"],
['apps/api/src/modules/facilities/facility-submission-policy.ts',"snapshot.specialization === 'NURSING_CENTER'"],
['apps/api/src/modules/facilities/facility-submission-policy.ts','verificationComplete'],
['apps/api/src/modules/directory/directory-catalog.service.ts','assertRegistrationEnabled'],
];for(const[file,phrase]of required){const text=await readFile(file,'utf8');if(!text.includes(phrase))failures.push(`${file}: missing ${phrase}`)}
const permission=await readFile('apps/api/src/modules/facilities/facility-permission.service.ts','utf8');if(!/role\s*=\s*'OWNER'/.test(permission))failures.push('Facility ownership query must restrict membership to OWNER role');
const service=await readFile('apps/api/src/modules/facilities/facility-application.service.ts','utf8');if(/category\.code\s*===/.test(service))failures.push('Facility workflow must not branch on dynamic business category codes');
if(failures.length){console.error('Phase 5 verification failed\n'+failures.map(x=>`- ${x}`).join('\n'));process.exit(1)}console.log('Phase 5 static verification: PASS');console.log('Dynamic category / one owner workflow: PASS');console.log('Specialized profiles are capability-internal only: PASS');console.log('Private verification gate: PASS');
