import {
  asRecord,
  defineSchema,
  issue,
  parseIdentifier,
  readArray,
  readBoolean,
  readCoordinates,
  readEnum,
  readIdentifier,
  readOptionalIdentifier,
  readOptionalString,
  readString,
  readTime24,
  rejectUnknownKeys,
} from '../common/runtime-schema.js';
import {
  DAYS_OF_WEEK,
  FACILITY_STATUSES,
  type FacilityStatus,
} from '../common/enums.js';
import type { DirectoryCategoryCapabilitiesDTO, FacilitySpecialization } from '../directory/index.js';
import type {
  AvailabilityDTO,
  BusinessHoursPeriodDTO,
  CoordinatesDTO,
  FacilityBusinessDayDTO,
  Identifier,
  IsoDateTime,
} from '../common/types.js';

export interface FacilityImageDTO {
  readonly id: Identifier;
  readonly url: string;
  readonly isPrimary: boolean;
  readonly sortOrder: number;
}

export interface FacilityRatingSummaryDTO {
  readonly average?: number;
  readonly count: number;
}

export interface FacilityListDTO {
  readonly id: Identifier;
  readonly specialization: FacilitySpecialization;
  readonly category: {
    readonly id: Identifier;
    readonly code: string;
    readonly nameAr: string;
    readonly iconKey: string;
    readonly capabilities: DirectoryCategoryCapabilitiesDTO;
  };
  readonly name: string;
  readonly primaryImageUrl?: string;
  readonly shortAddress: string;
  readonly provinceId: Identifier;
  readonly cityId: Identifier;
  readonly distanceMeters?: number;
  readonly availability: AvailabilityDTO;
  readonly rating: FacilityRatingSummaryDTO;
  readonly doctorName?: string;
  readonly specialtyName?: string;
}

export interface FacilityDetailDTO extends FacilityListDTO {
  readonly phone: string;
  readonly description?: string;
  readonly neighborhoodId?: Identifier;
  readonly addressText: string;
  readonly coordinates: CoordinatesDTO;
  readonly images: readonly FacilityImageDTO[];
  readonly businessHours: readonly FacilityBusinessDayDTO[];
}

export interface OwnerFacilityDetailDTO extends OwnerFacilityDTO {
  readonly phone?: string;
  readonly description?: string;
  readonly neighborhoodId?: Identifier;
  readonly addressText?: string;
  readonly coordinates?: CoordinatesDTO;
  readonly businessHours: readonly FacilityBusinessDayDTO[];
  readonly images: readonly FacilityImageDTO[];
  readonly pharmacyProfile?: { readonly licenseNumber?: string; readonly additionalInfo?: string };
  readonly clinicProfile?: { readonly doctorName?: string; readonly specialtyId?: Identifier };
  readonly nursingProfile?: { readonly responsiblePersonName?: string; readonly serviceIds: readonly Identifier[] };
}

export interface OwnerFacilityDTO {
  readonly id: Identifier;
  readonly specialization: FacilitySpecialization;
  readonly categoryId: Identifier;
  readonly categoryCode: string;
  readonly categoryNameAr: string;
  readonly categoryIconKey: string;
  readonly categoryCapabilities: DirectoryCategoryCapabilitiesDTO;
  readonly name?: string;
  readonly status: FacilityStatus;
  readonly provinceId?: Identifier;
  readonly cityId?: Identifier;
  readonly primaryImageUrl?: string;
  readonly rejectionReason?: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface CreateFacilityDraftRequest {
  readonly categoryId: Identifier;
  readonly provinceId: Identifier;
}

export interface UpdateFacilityBasicInfoRequest {
  readonly name: string;
  readonly phone: string;
  readonly description?: string;
  readonly provinceId: Identifier;
  readonly cityId: Identifier;
  readonly neighborhoodId?: Identifier;
  readonly addressText: string;
}

export interface UpdateFacilityLocationRequest {
  readonly coordinates: CoordinatesDTO;
  readonly provinceId: Identifier;
  readonly cityId: Identifier;
  readonly neighborhoodId?: Identifier;
  readonly addressText: string;
}

export interface UpdateBusinessHoursRequest {
  readonly days: readonly FacilityBusinessDayDTO[];
}

export interface SubmitFacilityRequest {
  readonly acknowledgeAccuracy: true;
}

export interface TemporaryClosureRequest {
  readonly startsAt: IsoDateTime;
  readonly endsAt: IsoDateTime;
  readonly reason?: string;
}

export interface TemporaryClosureDTO extends TemporaryClosureRequest {
  readonly id: Identifier;
  readonly facilityId: Identifier;
  readonly cancelledAt?: IsoDateTime;
}

export const createFacilityDraftRequestSchema = defineSchema<CreateFacilityDraftRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['categoryId','provinceId']);
  return { categoryId: readIdentifier(record, 'categoryId'), provinceId: readIdentifier(record, 'provinceId') };
});

const PHONE_RE = /^(?:\+963\d{9}|0\d{9,10})$/;

export const updateFacilityBasicInfoRequestSchema = defineSchema<UpdateFacilityBasicInfoRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['name', 'phone', 'description', 'provinceId', 'cityId', 'neighborhoodId', 'addressText']);
  const phone = readString(record, 'phone', { min: 7, max: 20 });
  if (!PHONE_RE.test(phone.replace(/[\s()-]/g, ''))) issue('$.phone', 'Expected a valid Syrian facility phone');
  const description = readOptionalString(record, 'description', { max: 500 });
  const neighborhoodId = readOptionalIdentifier(record, 'neighborhoodId');
  return {
    name: readString(record, 'name', { min: 2, max: 150 }),
    phone,
    ...(description === undefined ? {} : { description }),
    provinceId: readIdentifier(record, 'provinceId'),
    cityId: readIdentifier(record, 'cityId'),
    ...(neighborhoodId === undefined ? {} : { neighborhoodId }),
    addressText: readString(record, 'addressText', { min: 2, max: 300 }),
  };
});

export const updateFacilityLocationRequestSchema = defineSchema<UpdateFacilityLocationRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['coordinates', 'provinceId', 'cityId', 'neighborhoodId', 'addressText']);
  const neighborhoodId = readOptionalIdentifier(record, 'neighborhoodId');
  return {
    coordinates: readCoordinates(record, 'coordinates'),
    provinceId: readIdentifier(record, 'provinceId'),
    cityId: readIdentifier(record, 'cityId'),
    ...(neighborhoodId === undefined ? {} : { neighborhoodId }),
    addressText: readString(record, 'addressText', { min: 2, max: 300 }),
  };
});

function parseBusinessPeriod(input: unknown, index: number): BusinessHoursPeriodDTO {
  const record = asRecord(input, `$.days[].periods[${index}]`);
  rejectUnknownKeys(record, ['id', 'startTime', 'endTime', 'endsNextDay'], `$.days[].periods[${index}]`);
  const idRaw = record['id'];
  const id = idRaw === undefined ? undefined : parseIdentifier(idRaw, `$.days[].periods[${index}].id`);
  const startTime = readTime24(record, 'startTime');
  const endTime = readTime24(record, 'endTime');
  const endsNextDay = readBoolean(record, 'endsNextDay');
  if (startTime === endTime) issue(`$.days[].periods[${index}]`, 'Start and end times must differ');
  return { ...(id === undefined ? {} : { id }), startTime, endTime, endsNextDay };
}

function parseBusinessDay(input: unknown, index: number): FacilityBusinessDayDTO {
  const record = asRecord(input, `$.days[${index}]`);
  rejectUnknownKeys(record, ['dayOfWeek', 'isClosed', 'is24Hours', 'periods'], `$.days[${index}]`);
  const dayOfWeek = readEnum(record, 'dayOfWeek', DAYS_OF_WEEK);
  const isClosed = readBoolean(record, 'isClosed');
  const is24Hours = readBoolean(record, 'is24Hours');
  const periods = readArray(record, 'periods', parseBusinessPeriod, { max: 4 });
  if (isClosed && is24Hours) issue(`$.days[${index}]`, 'A day cannot be both closed and open 24 hours');
  if ((isClosed || is24Hours) && periods.length > 0) issue(`$.days[${index}].periods`, 'Closed or 24-hour days cannot contain periods');
  if (!isClosed && !is24Hours && periods.length === 0) issue(`$.days[${index}].periods`, 'Open days require at least one period');
  return { dayOfWeek, isClosed, is24Hours, periods };
}

export const updateBusinessHoursRequestSchema = defineSchema<UpdateBusinessHoursRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['days']);
  const days = readArray(record, 'days', parseBusinessDay, { min: 7, max: 7 });
  const uniqueDays = new Set(days.map((day) => day.dayOfWeek));
  if (uniqueDays.size !== 7) issue('$.days', 'All seven unique days of the week are required');
  return { days };
});

export const submitFacilityRequestSchema = defineSchema<SubmitFacilityRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['acknowledgeAccuracy']);
  const acknowledgeAccuracy = readBoolean(record, 'acknowledgeAccuracy');
  if (!acknowledgeAccuracy) issue('$.acknowledgeAccuracy', 'Accuracy acknowledgement is required');
  return { acknowledgeAccuracy: true };
});

export interface PharmacyFacilityDetailDTO extends FacilityDetailDTO {
  readonly specialization: 'PHARMACY';
  readonly licenseNumber?: string;
}

export interface MedicalClinicFacilityDetailDTO extends FacilityDetailDTO {
  readonly specialization: 'MEDICAL_CLINIC';
  readonly doctorName: string;
  readonly specialty: {
    readonly id: Identifier;
    readonly name: string;
  };
}

export interface NursingCenterFacilityDetailDTO extends FacilityDetailDTO {
  readonly specialization: 'NURSING_CENTER';
  readonly responsiblePersonName?: string;
  readonly services: readonly {
    readonly id: Identifier;
    readonly name: string;
  }[];
}

export interface GenericFacilityDetailDTO extends FacilityDetailDTO {
  readonly specialization: 'GENERIC';
}

export type PublicFacilityDetailDTO =
  | PharmacyFacilityDetailDTO
  | MedicalClinicFacilityDetailDTO
  | NursingCenterFacilityDetailDTO
  | GenericFacilityDetailDTO;

export interface FacilityMapPinDTO {
  readonly id: Identifier;
  readonly name: string;
  readonly specialization: FacilitySpecialization;
  readonly categoryId: Identifier;
  readonly categoryCode: string;
  readonly categoryIconKey: string;
  readonly coordinates: CoordinatesDTO;
  readonly availability: AvailabilityDTO;
  readonly rating: FacilityRatingSummaryDTO;
  readonly distanceMeters?: number;
}

export const temporaryClosureRequestSchema = defineSchema<TemporaryClosureRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['startsAt', 'endsAt', 'reason']);
  const startsAtRaw = record['startsAt'];
  const endsAtRaw = record['endsAt'];
  if (typeof startsAtRaw !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(startsAtRaw) || Number.isNaN(Date.parse(startsAtRaw))) {
    issue('$.startsAt', 'Expected an ISO 8601 date-time with timezone');
  }
  if (typeof endsAtRaw !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(endsAtRaw) || Number.isNaN(Date.parse(endsAtRaw))) {
    issue('$.endsAt', 'Expected an ISO 8601 date-time with timezone');
  }
  if (Date.parse(endsAtRaw) <= Date.parse(startsAtRaw)) issue('$.endsAt', 'Temporary closure must end after it starts');
  const reason = readOptionalString(record, 'reason', { max: 300 });
  return {
    startsAt: startsAtRaw,
    endsAt: endsAtRaw,
    ...(reason === undefined ? {} : { reason }),
  };
});
