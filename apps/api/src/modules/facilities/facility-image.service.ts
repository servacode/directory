import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { MAX_IMAGE_UPLOAD_BYTES } from '@health/config';
import type { FacilityImageDTO } from '@health/contracts';
import { DatabaseService } from '../../database/database.service.js';
import { assertImageSignature } from '../../security/image-security.js';
import { ImageProcessor } from '../../security/image-processor.js';
import { ObjectStorageService } from '../../storage/object-storage.service.js';
import { PlatformSettingsService } from '../settings/platform-settings.service.js';
import { FacilityDomainError } from './facility-domain.error.js';
import { FacilityPermissionService } from './facility-permission.service.js';

export interface UploadedFacilityImageFile { readonly buffer: Buffer; readonly mimetype: string; readonly size: number; }

@Injectable()
export class FacilityImageService {
  constructor(
    private readonly db: DatabaseService,
    private readonly permissions: FacilityPermissionService,
    private readonly settings: PlatformSettingsService,
    private readonly storage: ObjectStorageService,
    private readonly images: ImageProcessor,
  ) {}

  async list(userId: string, facilityId: string): Promise<readonly FacilityImageDTO[]> {
    await this.permissions.assertOwner(this.db, userId, facilityId);
    const result = await this.db.query<{id:string;storageKey:string;isPrimary:boolean;sortOrder:number}>(
      `SELECT id,storage_key AS "storageKey",is_primary AS "isPrimary",sort_order AS "sortOrder"
         FROM facility_images WHERE facility_id=$1 ORDER BY sort_order,id`, [facilityId]);
    return result.rows.map(row => ({id:row.id,url:this.storage.publicUrl(row.storageKey),isPrimary:row.isPrimary,sortOrder:row.sortOrder}));
  }

  async upload(userId: string, facilityId: string, file: UploadedFacilityImageFile): Promise<FacilityImageDTO> {
    // Reject unauthorized/status-invalid uploads before any CPU-heavy image decode.
    await this.permissions.assertEditableOwner(this.db, userId, facilityId);
    const initialMaxImages = await this.settings.get('maxFacilityImages');
    const initialCount = await this.db.query<{count:number|string}>(`SELECT COUNT(*) AS count FROM facility_images WHERE facility_id=$1`, [facilityId]);
    if (Number(initialCount.rows[0]?.count ?? 0) >= initialMaxImages) throw new FacilityDomainError('VALIDATION_ERROR', 'Facility image limit reached.');
    if (!file || !Buffer.isBuffer(file.buffer) || file.size <= 0 || file.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new FacilityDomainError('VALIDATION_ERROR', 'Facility image size is invalid.');
    }
    let detected;
    try { detected = assertImageSignature(file.buffer, file.mimetype); }
    catch { throw new FacilityDomainError('VALIDATION_ERROR', 'Facility image content does not match its declared type.'); }
    let processed;
    try { processed = await this.images.decodeValidateAndReencode(file.buffer, detected); }
    catch { throw new FacilityDomainError('VALIDATION_ERROR', 'Facility image could not be safely decoded.'); }
    const stored = await this.storage.put('facilities', processed.bytes, processed.mimeType);
    try {
      return await this.db.transaction(async client => {
        await this.permissions.assertEditableOwner(client, userId, facilityId);
        const maxImages = await this.settings.get('maxFacilityImages');
        const count = await client.query<{count:number|string}>(`SELECT COUNT(*) AS count FROM facility_images WHERE facility_id=$1`, [facilityId]);
        if (Number(count.rows[0]?.count ?? 0) >= maxImages) throw new FacilityDomainError('VALIDATION_ERROR', 'Facility image limit reached.');
        const last = await client.query<{nextSort:number|string}>(`SELECT COALESCE(MAX(sort_order),-1)+1 AS "nextSort" FROM facility_images WHERE facility_id=$1`, [facilityId]);
        const isPrimary = Number(count.rows[0]?.count ?? 0) === 0;
        const id = randomUUID();
        const sortOrder = Number(last.rows[0]?.nextSort ?? 0);
        await client.query(`INSERT INTO facility_images(id,facility_id,storage_key,mime_type,size_bytes,width,height,is_primary,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id,facilityId,stored.key,processed.mimeType,processed.bytes.byteLength,processed.width,processed.height,isPrimary,sortOrder]);
        await client.query(`INSERT INTO audit_logs(id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'FACILITY_IMAGES_UPDATED','FACILITY',$3,$4::jsonb)`,
          [randomUUID(),userId,facilityId,JSON.stringify({operation:'upload',imageId:id})]);
        return {id,url:this.storage.publicUrl(stored.key),isPrimary,sortOrder};
      });
    } catch (error) {
      await this.storage.delete(stored.key);
      throw error;
    }
  }

  async makePrimary(userId:string, facilityId:string, imageId:string):Promise<{ok:true}> {
    await this.db.transaction(async client => {
      await this.permissions.assertEditableOwner(client,userId,facilityId);
      const exists=await client.query<{exists:boolean}>(`SELECT EXISTS(SELECT 1 FROM facility_images WHERE id=$1 AND facility_id=$2) AS exists`,[imageId,facilityId]);
      if(exists.rows[0]?.exists!==true) throw new FacilityDomainError('NOT_FOUND','Facility image not found.');
      await client.query(`UPDATE facility_images SET is_primary=FALSE WHERE facility_id=$1 AND is_primary=TRUE`,[facilityId]);
      await client.query(`UPDATE facility_images SET is_primary=TRUE WHERE id=$1 AND facility_id=$2`,[imageId,facilityId]);
    });
    return {ok:true};
  }

  async reorder(userId:string, facilityId:string, imageIds:readonly string[]):Promise<{ok:true}> {
    await this.db.transaction(async client => {
      await this.permissions.assertEditableOwner(client,userId,facilityId);
      const current=await client.query<{id:string}>(`SELECT id FROM facility_images WHERE facility_id=$1 ORDER BY sort_order,id`,[facilityId]);
      const have=new Set(current.rows.map(x=>x.id));
      if(imageIds.length!==have.size || new Set(imageIds).size!==have.size || imageIds.some(id=>!have.has(id))) throw new FacilityDomainError('VALIDATION_ERROR','Image order must contain each facility image exactly once.');
      for(const [sortOrder,id] of imageIds.entries()) await client.query(`UPDATE facility_images SET sort_order=$3 WHERE id=$1 AND facility_id=$2`,[id,facilityId,sortOrder]);
    });
    return {ok:true};
  }

  async remove(userId:string, facilityId:string, imageId:string):Promise<{ok:true}> {
    let key:string|undefined;
    await this.db.transaction(async client => {
      await this.permissions.assertEditableOwner(client,userId,facilityId);
      const row=await client.query<{storageKey:string;isPrimary:boolean}>(`SELECT storage_key AS "storageKey",is_primary AS "isPrimary" FROM facility_images WHERE id=$1 AND facility_id=$2 FOR UPDATE`,[imageId,facilityId]);
      if(!row.rows[0]) throw new FacilityDomainError('NOT_FOUND','Facility image not found.');
      key=row.rows[0].storageKey;
      await client.query(`DELETE FROM facility_images WHERE id=$1`,[imageId]);
      if(row.rows[0].isPrimary){
        const next=await client.query<{id:string}>(`SELECT id FROM facility_images WHERE facility_id=$1 ORDER BY sort_order,id LIMIT 1`,[facilityId]);
        if(next.rows[0]) await client.query(`UPDATE facility_images SET is_primary=TRUE WHERE id=$1`,[next.rows[0].id]);
      }
    });
    if(key) await this.storage.delete(key);
    return {ok:true};
  }
}
