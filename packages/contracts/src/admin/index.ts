import {
  asRecord,
  defineSchema,
  readBoolean,
  readOptionalString,
  readString,
  rejectUnknownKeys,
} from '../common/runtime-schema.js';
import type { ApplicationStatus, FacilityStatus } from '../common/enums.js';
import type { FacilitySpecialization } from '../directory/index.js';
import type { Identifier, IsoDateTime } from '../common/types.js';

export interface FacilityApplicationDTO {
  readonly id: Identifier;
  readonly facilityId: Identifier;
  readonly submittedBy: Identifier;
  readonly status: ApplicationStatus;
  readonly submittedAt: IsoDateTime;
  readonly reviewedBy?: Identifier;
  readonly reviewedAt?: IsoDateTime;
  readonly rejectionReason?: string;
}

export interface AdminFacilityApplicationListItemDTO {
  readonly id: Identifier;
  readonly facilityId: Identifier;
  readonly facilityName: string;
  readonly categoryId: Identifier;
  readonly categoryCode: string;
  readonly categoryNameAr: string;
  readonly specialization: FacilitySpecialization;
  readonly facilityStatus: FacilityStatus;
  readonly ownerName: string;
  readonly cityName: string;
  readonly submittedAt: IsoDateTime;
  readonly status: ApplicationStatus;
}

export interface RejectFacilityApplicationRequest {
  readonly reason: string;
}

export interface SuspendFacilityRequest {
  readonly reason: string;
}

export interface AdminReferenceDataUpsertRequest {
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export const rejectFacilityApplicationRequestSchema = defineSchema<RejectFacilityApplicationRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['reason']);
  return { reason: readString(record, 'reason', { min: 3, max: 500 }) };
});

export const suspendFacilityRequestSchema = defineSchema<SuspendFacilityRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['reason']);
  return { reason: readString(record, 'reason', { min: 3, max: 500 }) };
});
export * from './reference-data.js';
