import { asRecord, defineSchema, issue, parseIdentifier, readArray, readOptionalString, rejectUnknownKeys } from '../common/runtime-schema.js';
import type { Identifier } from '../common/types.js';

export interface NursingServiceDTO {
  readonly id: Identifier;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface UpdateNursingCenterProfileRequest {
  readonly responsiblePersonName?: string;
  readonly serviceIds: readonly Identifier[];
}

export const updateNursingCenterProfileRequestSchema = defineSchema<UpdateNursingCenterProfileRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['responsiblePersonName', 'serviceIds']);
  const responsiblePersonName = readOptionalString(record, 'responsiblePersonName', { min: 2, max: 120 });
  const serviceIds = readArray(record, 'serviceIds', (item, index) => parseIdentifier(item, `$.serviceIds[${index}]`), { min: 1, max: 30 });
  if (new Set(serviceIds).size !== serviceIds.length) issue('$.serviceIds', 'Duplicate nursing service IDs are not allowed');
  return { ...(responsiblePersonName === undefined ? {} : { responsiblePersonName }), serviceIds };
});
