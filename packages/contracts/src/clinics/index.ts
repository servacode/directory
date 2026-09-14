import { asRecord, defineSchema, readIdentifier, readString, rejectUnknownKeys } from '../common/runtime-schema.js';
import type { Identifier } from '../common/types.js';

export interface DoctorSpecialtyDTO {
  readonly id: Identifier;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface UpdateMedicalClinicProfileRequest {
  readonly doctorName: string;
  readonly specialtyId: Identifier;
}

export const updateMedicalClinicProfileRequestSchema = defineSchema<UpdateMedicalClinicProfileRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['doctorName', 'specialtyId']);
  return {
    doctorName: readString(record, 'doctorName', { min: 2, max: 120 }),
    specialtyId: readIdentifier(record, 'specialtyId'),
  };
});
