import {
  asRecord,
  defineSchema,
  readBoolean,
  readNumber,
  readOptionalString,
  readString,
  rejectUnknownKeys,
  issue,
} from '../common/runtime-schema.js';

export interface ReferenceDataUpsertRequest {
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export const referenceDataUpsertRequestSchema = defineSchema<ReferenceDataUpsertRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['nameAr', 'nameEn', 'isActive', 'sortOrder']);
  const nameEn = readOptionalString(record, 'nameEn', { min: 2, max: 120 });
  return {
    nameAr: readString(record, 'nameAr', { min: 2, max: 120 }),
    ...(nameEn === undefined ? {} : { nameEn }),
    isActive: readBoolean(record, 'isActive'),
    sortOrder: readNumber(record, 'sortOrder', { integer: true, min: 0, max: 100000 }),
  };
});

export interface UpdatePlatformSettingRequest { readonly value: unknown; }
export const updatePlatformSettingRequestSchema = defineSchema<UpdatePlatformSettingRequest>((input) => {
  const record = asRecord(input); rejectUnknownKeys(record, ['value']);
  if (!Object.prototype.hasOwnProperty.call(record, 'value')) issue('$.value', 'Field is required');
  return { value: record['value'] };
});
