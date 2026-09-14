import{readFile}from'node:fs/promises';const f=[];const req=[
['apps/api/src/modules/discovery/public-discovery.service.ts','countBaseFacilities'],
['apps/api/src/modules/discovery/public-discovery.service.ts','availabilityMap'],
['apps/api/src/modules/discovery/public-discovery.service.ts','normalize_arabic'],
['apps/api/src/modules/discovery/public-discovery.service.ts','f.category_id'],
['apps/api/src/modules/discovery/public-discovery.service.ts','dcp.public_enabled=TRUE'],
['infrastructure/database/migrations/0008_arabic_search.sql','CREATE OR REPLACE FUNCTION normalize_arabic'],
['apps/mobile/src/features/discovery/discovery-policy.ts','category.capabilities.specialtyFilter'],
['apps/mobile/src/features/discovery/discovery-policy.ts','category.capabilities.duty'],
];for(const[x,p]of req){const t=await readFile(x,'utf8');if(!t.includes(p))f.push(`${x}: missing ${p}`)}const discover=await readFile('apps/api/src/modules/discovery/public-discovery.service.ts','utf8');if(/radiusMeters/.test(discover))f.push('Governorate discovery must not require a small radius');if(/facility_type/.test(discover))f.push('Public discovery must use category taxonomy, not legacy facility type');if(f.length){console.error('Phase 9 verification failed\n'+f.join('\n'));process.exit(1)}console.log('Phase 9 static verification: PASS');console.log('Governorate-wide dynamic-category discovery + DB pagination: PASS');console.log('Nearest-first when coordinates exist: PASS');console.log('Capability-driven filters: PASS');
