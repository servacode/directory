import { spawn } from 'node:child_process';
const [backup]=process.argv.slice(2);const url=process.env.RESTORE_TEST_DATABASE_URL;if(!backup)throw new Error('Usage: node scripts/db-restore-test.mjs <backup.dump>');if(!url)throw new Error('RESTORE_TEST_DATABASE_URL is required');
async function run(command,args){const child=spawn(command,args,{stdio:'inherit',shell:process.platform==='win32'});const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});if(code!==0)throw new Error(`${command} exited with ${code}`)}
await run('pg_restore',['--clean','--if-exists','--no-owner','--no-acl','--dbname',url,backup]);
await run('psql',[url,'-v','ON_ERROR_STOP=1','-c',"SELECT PostGIS_Version(); SELECT COUNT(*) AS provinces FROM provinces; SELECT COUNT(*) AS active_raqqa FROM provinces WHERE name_ar='الرقة' AND is_active=TRUE;"]);
