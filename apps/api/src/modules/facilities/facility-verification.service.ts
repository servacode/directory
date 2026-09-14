import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { MAX_IMAGE_UPLOAD_BYTES } from '@health/config';
import { DatabaseService } from '../../database/database.service.js';
import { assertImageSignature } from '../../security/image-security.js';
import { ImageProcessor } from '../../security/image-processor.js';
import { ObjectStorageService } from '../../storage/object-storage.service.js';
import { FacilityDomainError } from './facility-domain.error.js';
import { FacilityPermissionService, type SqlExecutor } from './facility-permission.service.js';

export interface UploadedVerificationFile {readonly buffer:Buffer;readonly mimetype:string;readonly size:number;}

@Injectable()
export class FacilityVerificationService{
 constructor(private readonly db:DatabaseService,private readonly permissions:FacilityPermissionService,private readonly storage:ObjectStorageService,private readonly images:ImageProcessor){}

 async ownerSummary(userId:string,facilityId:string){
  await this.permissions.assertOwner(this.db,userId,facilityId);
  return this.summary(facilityId);
 }

 async adminSummary(facilityId:string){return this.summary(facilityId)}

 async assertComplete(facilityId:string,executor:SqlExecutor=this.db):Promise<void>{
  const r=await executor.query<{missingCount:number|string}>(`SELECT COUNT(*) AS "missingCount" FROM category_verification_requirements vr JOIN facilities f ON f.category_id=vr.category_id WHERE f.id=$1 AND vr.is_active=TRUE AND vr.is_required=TRUE AND (SELECT COUNT(*) FROM facility_verification_evidence ve WHERE ve.facility_id=f.id AND ve.requirement_id=vr.id) < vr.min_files`,[facilityId]);
  if(Number(r.rows[0]?.missingCount??0)>0)throw new FacilityDomainError('VERIFICATION_REQUIRED','Required verification evidence is incomplete.');
 }

 private async summary(facilityId:string){
  const r=await this.db.query<any>(`SELECT vr.id,vr.code,vr.label_ar AS "labelAr",vr.instructions_ar AS "instructionsAr",vr.is_required AS "isRequired",vr.min_files AS "minFiles",vr.max_files AS "maxFiles",COUNT(ve.id)::int AS "uploadedCount",
    COALESCE(json_agg(json_build_object('id',ve.id,'mimeType',ve.mime_type,'sizeBytes',ve.size_bytes,'createdAt',ve.created_at) ORDER BY ve.created_at) FILTER(WHERE ve.id IS NOT NULL),'[]'::json) AS evidence
    FROM facilities f JOIN category_verification_requirements vr ON vr.category_id=f.category_id AND vr.is_active=TRUE
    LEFT JOIN facility_verification_evidence ve ON ve.requirement_id=vr.id AND ve.facility_id=f.id
    WHERE f.id=$1 GROUP BY vr.id ORDER BY vr.sort_order,vr.code`,[facilityId]);
  return{facilityId,requirements:r.rows.map((x:any)=>({...x,complete:Number(x.uploadedCount)>=Number(x.minFiles)})),complete:r.rows.every((x:any)=>!x.isRequired||Number(x.uploadedCount)>=Number(x.minFiles))};
 }

 async upload(userId:string,facilityId:string,requirementId:string,file:UploadedVerificationFile){
  // Authorization/status validation must happen before image decoding to prevent authenticated CPU abuse.
  await this.permissions.assertSensitiveEditableOwner(this.db,userId,facilityId);
  const initialReq=await this.db.query<{maxFiles:number|string}>(`SELECT vr.max_files AS "maxFiles" FROM facilities f JOIN category_verification_requirements vr ON vr.category_id=f.category_id WHERE f.id=$1 AND vr.id=$2 AND vr.is_active=TRUE`,[facilityId,requirementId]);
  if(!initialReq.rows[0])throw new FacilityDomainError('VALIDATION_ERROR','Verification requirement is not valid for this facility category.');
  const initialCount=await this.db.query<{count:number|string}>(`SELECT COUNT(*) AS count FROM facility_verification_evidence WHERE facility_id=$1 AND requirement_id=$2`,[facilityId,requirementId]);
  if(Number(initialCount.rows[0]?.count??0)>=Number(initialReq.rows[0].maxFiles))throw new FacilityDomainError('VALIDATION_ERROR','Verification evidence limit reached for this requirement.');
  if(!file||!Buffer.isBuffer(file.buffer)||file.size<=0||file.size>MAX_IMAGE_UPLOAD_BYTES)throw new FacilityDomainError('VALIDATION_ERROR','Verification image size is invalid.');
  let detected:string;try{detected=assertImageSignature(file.buffer,file.mimetype)}catch{throw new FacilityDomainError('VALIDATION_ERROR','Verification image content does not match its declared type.');}
  let processed;try{processed=await this.images.decodeValidateAndReencode(file.buffer,detected)}catch{throw new FacilityDomainError('VALIDATION_ERROR','Verification image could not be safely decoded.')}const stored=await this.storage.put('verification-evidence',processed.bytes,processed.mimeType);
  try{return await this.db.transaction(async client=>{
    await this.permissions.assertSensitiveEditableOwner(client,userId,facilityId);
    const req=await client.query<{maxFiles:number|string}>(`SELECT vr.max_files AS "maxFiles" FROM facilities f JOIN category_verification_requirements vr ON vr.category_id=f.category_id WHERE f.id=$1 AND vr.id=$2 AND vr.is_active=TRUE FOR UPDATE`,[facilityId,requirementId]);
    if(!req.rows[0])throw new FacilityDomainError('VALIDATION_ERROR','Verification requirement is not valid for this facility category.');
    const count=await client.query<{count:number|string}>(`SELECT COUNT(*) AS count FROM facility_verification_evidence WHERE facility_id=$1 AND requirement_id=$2`,[facilityId,requirementId]);
    if(Number(count.rows[0]?.count??0)>=Number(req.rows[0].maxFiles))throw new FacilityDomainError('VALIDATION_ERROR','Verification evidence limit reached for this requirement.');
    const id=randomUUID();await client.query(`INSERT INTO facility_verification_evidence(id,facility_id,requirement_id,storage_key,mime_type,size_bytes,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,facilityId,requirementId,stored.key,processed.mimeType,processed.bytes.byteLength,userId]);
    await client.query(`INSERT INTO audit_logs(id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'FACILITY_VERIFICATION_EVIDENCE_ADDED','FACILITY',$3,$4::jsonb)`,[randomUUID(),userId,facilityId,JSON.stringify({requirementId,evidenceId:id})]);
    return{id,requirementId,mimeType:processed.mimeType,sizeBytes:processed.bytes.byteLength};
  })}catch(error){await this.storage.delete(stored.key);throw error}
 }

 async remove(userId:string,facilityId:string,evidenceId:string){let key:string|undefined;await this.db.transaction(async client=>{
  await this.permissions.assertSensitiveEditableOwner(client,userId,facilityId);const r=await client.query<{storageKey:string}>(`DELETE FROM facility_verification_evidence WHERE id=$1 AND facility_id=$2 RETURNING storage_key AS "storageKey"`,[evidenceId,facilityId]);
  if(!r.rows[0])throw new FacilityDomainError('NOT_FOUND','Verification evidence not found.');key=r.rows[0].storageKey;
  await client.query(`INSERT INTO audit_logs(id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'FACILITY_VERIFICATION_EVIDENCE_REMOVED','FACILITY',$3,$4::jsonb)`,[randomUUID(),userId,facilityId,JSON.stringify({evidenceId})]);
 });if(key)await this.storage.delete(key);return{ok:true as const}}

 async readForAdmin(adminUserId:string,facilityId:string,evidenceId:string){const r=await this.db.query<{storageKey:string;mimeType:string}>(`SELECT storage_key AS "storageKey",mime_type AS "mimeType" FROM facility_verification_evidence WHERE id=$1 AND facility_id=$2`,[evidenceId,facilityId]);const row=r.rows[0];if(!row)throw new FacilityDomainError('NOT_FOUND','Verification evidence not found.');await this.db.query(`INSERT INTO audit_logs(id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'FACILITY_VERIFICATION_EVIDENCE_VIEWED','FACILITY',$3,$4::jsonb)`,[randomUUID(),adminUserId,facilityId,JSON.stringify({evidenceId})]);return{bytes:await this.storage.read(row.storageKey),mimeType:row.mimeType}}
}
