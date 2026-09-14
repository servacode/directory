import {
  asRecord,
  defineSchema,
  issue,
  readIdentifier,
  readIsoDateTime,
  readOptionalString,
  rejectUnknownKeys,
} from '../common/runtime-schema.js';
import type { DutyShiftStatus } from '../common/enums.js';
import type { Identifier, IsoDateTime } from '../common/types.js';


export interface UpdatePharmacyProfileRequest {
  readonly licenseNumber?: string;
  readonly additionalInfo?: string;
}

export const updatePharmacyProfileRequestSchema = defineSchema<UpdatePharmacyProfileRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['licenseNumber', 'additionalInfo']);
  const licenseNumber = readOptionalString(record, 'licenseNumber', { min: 2, max: 120 });
  const additionalInfo = readOptionalString(record, 'additionalInfo', { max: 500 });
  return {
    ...(licenseNumber === undefined ? {} : { licenseNumber }),
    ...(additionalInfo === undefined ? {} : { additionalInfo }),
  };
});

export interface PharmacyDutyShiftDTO {
  readonly id: Identifier;
  readonly facilityId: Identifier;
  readonly startsAt: IsoDateTime;
  readonly endsAt: IsoDateTime;
  readonly status: DutyShiftStatus;
  readonly cancelledAt?: IsoDateTime;
}

export interface QuickDutyRequest {
  readonly endsAt: IsoDateTime;
}

export interface CreateDutyShiftRequest {
  readonly startsAt: IsoDateTime;
  readonly endsAt: IsoDateTime;
}

export interface UpdateDutyShiftRequest {
  readonly startsAt?: IsoDateTime;
  readonly endsAt: IsoDateTime;
}

export interface CancelDutyShiftRequest {
  readonly reason?: string;
}

export const quickDutyRequestSchema = defineSchema<QuickDutyRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['endsAt']);
  return { endsAt: readIsoDateTime(record, 'endsAt') };
});

export const createDutyShiftRequestSchema = defineSchema<CreateDutyShiftRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['startsAt', 'endsAt']);
  const startsAt = readIsoDateTime(record, 'startsAt');
  const endsAt = readIsoDateTime(record, 'endsAt');
  if (Date.parse(endsAt) <= Date.parse(startsAt)) issue('$.endsAt', 'Duty shift must end after it starts');
  return { startsAt, endsAt };
});

export const updateDutyShiftRequestSchema = defineSchema<UpdateDutyShiftRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['startsAt', 'endsAt']);
  const startsAt = record['startsAt'] === undefined ? undefined : readIsoDateTime(record, 'startsAt');
  const endsAt = readIsoDateTime(record, 'endsAt');
  if (startsAt !== undefined && Date.parse(endsAt) <= Date.parse(startsAt)) issue('$.endsAt', 'Duty shift must end after it starts');
  return { ...(startsAt === undefined ? {} : { startsAt }), endsAt };
});

export const cancelDutyShiftRequestSchema = defineSchema<CancelDutyShiftRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['reason']);
  const reason = readOptionalString(record, 'reason', { max: 300 });
  return reason === undefined ? {} : { reason };
});
