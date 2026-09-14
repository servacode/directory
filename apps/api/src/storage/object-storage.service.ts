import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StoredObject { readonly key:string; readonly publicUrl:string; }
@Injectable()
export class ObjectStorageService {
  private readonly root:string;
  constructor(config:ConfigService){this.root=resolve(config.get<string>('UPLOAD_DIR')??'./var/uploads')}
  async put(scope:'user-profiles'|'facilities'|'verification-evidence',bytes:Buffer,mimeType:string):Promise<StoredObject>{
    const extension=mimeType==='image/jpeg'?'.jpg':mimeType==='image/png'?'.png':mimeType==='image/webp'?'.webp':'';
    if(!extension)throw new Error('Unsupported object MIME type');
    const filename=`${randomUUID()}${extension}`;const dir=join(this.root,scope);await mkdir(dir,{recursive:true});await writeFile(join(dir,filename),bytes,{flag:'wx'});const key=`${scope}/${filename}`;return{key,publicUrl:this.publicUrl(key)};
  }
  publicUrl(key:string):string{return `/api/v1/media/${key}`}
  async delete(key:string):Promise<void>{const path=this.safePath(key);try{await unlink(path)}catch(error){if((error as {code?:string}).code!=='ENOENT')throw error}}
  async read(key:string):Promise<Buffer>{return readFile(this.safePath(key))}
  private safePath(key:string){if(!/^(user-profiles|facilities|verification-evidence)\/[0-9a-f-]+\.(jpg|png|webp)$/i.test(key))throw new Error('Invalid storage key');const p=resolve(this.root,key);const rel=relative(this.root,p);if(rel.startsWith('..')||isAbsolute(rel))throw new Error('Invalid storage path');return p}
}
