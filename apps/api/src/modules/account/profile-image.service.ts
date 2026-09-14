import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { ObjectStorageService } from '../../storage/object-storage.service.js';
import { assertImageSignature } from '../../security/image-security.js';
import { ImageProcessor } from '../../security/image-processor.js';
import { AuthDomainError } from '../auth/core/auth-error.js';

export interface UploadedImageFile { readonly buffer: Buffer; readonly mimetype: string; readonly size: number; }

@Injectable()
export class ProfileImageService {
  constructor(private readonly db: DatabaseService, private readonly storage: ObjectStorageService, private readonly images: ImageProcessor) {}

  async replace(userId: string, file: UploadedImageFile) {
    if (!file || !Buffer.isBuffer(file.buffer) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
      throw new AuthDomainError('VALIDATION_ERROR', 'Profile image size is invalid.');
    }
    let detected;
    try { detected = assertImageSignature(file.buffer, file.mimetype); }
    catch { throw new AuthDomainError('VALIDATION_ERROR', 'Profile image content does not match its declared type.'); }
    let processed;
    try { processed = await this.images.decodeValidateAndReencode(file.buffer, detected); }
    catch { throw new AuthDomainError('VALIDATION_ERROR', 'Profile image could not be safely decoded.'); }
    const user = await this.db.query<{profileImageKey:string|null}>(
      `SELECT profile_image_key AS "profileImageKey" FROM users WHERE id=$1 AND deleted_at IS NULL`,[userId]);
    if (!user.rows[0]) throw new AuthDomainError('UNAUTHORIZED','User not found.');
    const stored = await this.storage.put('user-profiles', processed.bytes, processed.mimeType);
    try {
      await this.db.query(`UPDATE users SET profile_image_key=$2 WHERE id=$1`,[userId,stored.key]);
    } catch (error) {
      await this.storage.delete(stored.key);
      throw error;
    }
    if (user.rows[0].profileImageKey) await this.storage.delete(user.rows[0].profileImageKey);
    return { profileImageUrl: '/api/v1/users/me/profile-image/content' };
  }

  async read(userId:string) {
    const r=await this.db.query<{profileImageKey:string|null}>(`SELECT profile_image_key AS "profileImageKey" FROM users WHERE id=$1 AND deleted_at IS NULL`,[userId]);
    const key=r.rows[0]?.profileImageKey;if(!key)throw new AuthDomainError('NOT_FOUND','Profile image not found.');
    const bytes=await this.storage.read(key);const mimeType=assertImageSignature(bytes,key.endsWith('.jpg')?'image/jpeg':key.endsWith('.png')?'image/png':'image/webp');
    return{bytes,mimeType};
  }

  async remove(userId:string) {
    const r=await this.db.query<{profileImageKey:string|null}>(`SELECT profile_image_key AS "profileImageKey" FROM users WHERE id=$1 AND deleted_at IS NULL`,[userId]);
    if(!r.rows[0])throw new AuthDomainError('UNAUTHORIZED','User not found.');
    await this.db.query(`UPDATE users SET profile_image_key=NULL WHERE id=$1`,[userId]);
    const key=r.rows[0].profileImageKey;if(key)await this.storage.delete(key);
    return {ok:true as const};
  }
}
