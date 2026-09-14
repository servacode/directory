import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir){const out=[];for(const name of readdirSync(dir)){const p=join(dir,name);const st=statSync(p);if(st.isDirectory())out.push(...walk(p));else if(p.endsWith('.ts'))out.push(p)}return out}
const codeText=readFileSync('packages/contracts/src/errors/codes.ts','utf8');
const defined=new Set([...codeText.matchAll(/'([A-Z0-9_]+)'/g)].map(m=>m[1]));
const used=new Set();
for(const file of walk('apps/api/src')){
  const text=readFileSync(file,'utf8');
  for(const m of text.matchAll(/new\s+(?:FacilityDomainError|AuthDomainError|LocationDomainError)\(\s*'([A-Z0-9_]+)'/g))used.add(m[1]);
}
const missing=[...used].filter(x=>!defined.has(x)).sort();
if(missing.length){console.error(`Undefined domain error codes: ${missing.join(', ')}`);process.exit(1)}
console.log(`Domain error code registry: PASS (${used.size} used codes are centrally defined)`);
