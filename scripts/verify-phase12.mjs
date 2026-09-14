import fs from 'node:fs';
function read(path){return fs.readFileSync(path,'utf8')}
const checks=[];
function check(name,condition){checks.push([name,Boolean(condition)]);if(!condition)process.exitCode=1}
const profile=read('apps/api/src/modules/account/profile-image.service.ts');
const storage=read('apps/api/src/storage/object-storage.service.ts');
const imageProcessor=read('apps/api/src/security/image-processor.ts');
const recovery=read('apps/api/src/modules/auth/core/password-recovery.service.ts');
const hmac=read('apps/api/src/modules/auth/adapters/hmac-otp-digest.ts');
const auth=read('apps/api/src/modules/auth/http/auth.controller.ts');
const duty=read('apps/api/src/modules/duty/pharmacy-duty.service.ts');
const discovery=read('apps/api/src/modules/discovery/public-discovery.controller.ts');
const sourceFiles=[];
for(const base of ['apps/api/src','apps/mobile/src']){const walk=(dir)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(e.name))sourceFiles.push(p)}};walk(base)}
check('Profile image signature validation',profile.includes('assertImageSignature'));
check('Uploads use decoder/re-encoder',profile.includes('decodeValidateAndReencode')&&imageProcessor.includes('.webp(')&&imageProcessor.includes('limitInputPixels'));
check('Re-encoder omits source metadata',imageProcessor.includes('.rotate()')&&!imageProcessor.includes('withMetadata('));
check('Storage path uses relative containment',storage.includes('relative(this.root,p)')&&!storage.includes('p.startsWith(this.root)'));
check('OTP verification codes use keyed HMAC',hmac.includes('createHmac')&&recovery.includes('codeDigest'));
check('Auth endpoints centrally throttled',auth.includes('SecurityThrottleService')&&auth.includes("'login'")&&auth.includes("'recovery-start'"));
check('Duty limit comes from platform settings',duty.includes("settings.get('maxDutyShiftDurationHours')"));
check('Discovery coordinate parser is strict',discovery.includes('parseCoordinates')&&discovery.includes('latitude and longitude must be provided together'));
check('No console logging in production sources',sourceFiles.every((p)=>!/console\.(log|debug|info|warn|error)\s*\(/.test(read(p))));
check('Authorization matrix exists',fs.existsSync('docs/security/authorization-matrix.md'));
check('File upload security doc exists',fs.existsSync('docs/security/file-upload-security.md'));
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} - ${name}`);
if(process.exitCode)throw new Error('Phase 12 verification failed');
console.log(`Phase 12 static audit: ${checks.length}/${checks.length} PASS`);
