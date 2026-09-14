import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const url=process.env.DATABASE_URL;if(!url)throw new Error('DATABASE_URL is required');
const dir=resolve(process.env.BACKUP_DIR??'./backups');await mkdir(dir,{recursive:true});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');const target=resolve(dir,`health-directory-${stamp}.dump`);
const child=spawn('pg_dump',['--format=custom','--no-owner','--no-acl','--file',target,url],{stdio:'inherit',shell:process.platform==='win32'});
const code=await new Promise((resolveCode,reject)=>{child.on('error',reject);child.on('exit',resolveCode)});if(code!==0)throw new Error(`pg_dump exited with ${code}`);console.log(target);
