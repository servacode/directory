import { asRecord, defineSchema, readIdentifier, readOptionalString, readString, rejectUnknownKeys } from '../common/runtime-schema.js';
import type { Identifier, IsoDateTime } from '../common/types.js';
import type { SystemRole, UserStatus } from '../common/enums.js';

export interface PublicUserDTO {
  readonly id: Identifier;
  readonly fullName: string;
  readonly phone: string;
  readonly provinceId: Identifier;
  readonly profileImageUrl?: string;
  readonly status: UserStatus;
  readonly systemRole: SystemRole;
  readonly createdAt: IsoDateTime;
}

export interface UpdateMyProfileRequest {
  readonly fullName: string;
}

export interface ProfileImageUploadRequest {
  readonly uploadToken: string;
}

export const updateMyProfileRequestSchema = defineSchema<UpdateMyProfileRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['fullName']);
  return { fullName: readString(record, 'fullName', { min: 2, max: 100 }) };
});

export const profileImageUploadRequestSchema = defineSchema<ProfileImageUploadRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['uploadToken']);
  return { uploadToken: readString(record, 'uploadToken', { min: 10, max: 2048, trim: false }) };
});

export interface UserSessionDTO {
  readonly id: Identifier;
  readonly deviceName?: string;
  readonly devicePlatform?: string;
  readonly appVersion?: string;
  readonly lastUsedAt: IsoDateTime;
  readonly expiresAt: IsoDateTime;
  readonly revokedAt?: IsoDateTime;
}
