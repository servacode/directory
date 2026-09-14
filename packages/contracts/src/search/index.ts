import {
  asRecord,
  defineSchema,
  issue,
  readCoordinates,
  readEnum,
  readIdentifier,
  readOptionalBoolean,
  readOptionalIdentifier,
  readOptionalNumber,
  readOptionalString,
  rejectUnknownKeys,
} from '../common/runtime-schema.js';
import type { CoordinatesDTO, Identifier, PaginationQuery } from '../common/types.js';

export interface FacilityDiscoveryQuery extends PaginationQuery {
  readonly provinceId: Identifier;
  readonly categoryId: Identifier;
  readonly coordinates?: CoordinatesDTO;
  readonly cityId?: Identifier;
  readonly specialtyId?: Identifier;
  readonly nursingServiceId?: Identifier;
  readonly openNow?: boolean;
  readonly dutyNow?: boolean;
}

export interface SearchQueryContract extends PaginationQuery {
  readonly query: string;
  readonly provinceId: Identifier;
  readonly coordinates?: CoordinatesDTO;
  readonly categoryId?: Identifier;
  readonly specialtyId?: Identifier;
  readonly nursingServiceId?: Identifier;
  readonly openNow?: boolean;
  readonly dutyNow?: boolean;
}

export interface MapBoundsQuery {
  readonly north: number;
  readonly south: number;
  readonly east: number;
  readonly west: number;
  readonly provinceId: Identifier;
  readonly categoryId?: Identifier;
  readonly openNow?: boolean;
  readonly dutyNow?: boolean;
}

function pagination(record: Record<string, unknown>) {
  const page = readOptionalNumber(record, 'page', { integer: true, min: 1 });
  const pageSize = readOptionalNumber(record, 'pageSize', { integer: true, min: 1, max: 100 });
  return {
    ...(page === undefined ? {} : { page }),
    ...(pageSize === undefined ? {} : { pageSize }),
  };
}

export const facilityDiscoveryQuerySchema = defineSchema<FacilityDiscoveryQuery>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, [
    'provinceId', 'categoryId', 'coordinates', 'cityId', 'specialtyId', 'nursingServiceId',
    'openNow', 'dutyNow', 'page', 'pageSize',
  ]);
  const categoryId = readIdentifier(record, 'categoryId');
  const coordinates = record['coordinates'] === undefined ? undefined : readCoordinates(record, 'coordinates');
  const cityId = readOptionalIdentifier(record, 'cityId');
  const specialtyId = readOptionalIdentifier(record, 'specialtyId');
  const nursingServiceId = readOptionalIdentifier(record, 'nursingServiceId');
  const openNow = readOptionalBoolean(record, 'openNow');
  const dutyNow = readOptionalBoolean(record, 'dutyNow');


  return {
    provinceId: readIdentifier(record, 'provinceId'),
    categoryId,
    ...(coordinates === undefined ? {} : { coordinates }),
    ...(cityId === undefined ? {} : { cityId }),
    ...(specialtyId === undefined ? {} : { specialtyId }),
    ...(nursingServiceId === undefined ? {} : { nursingServiceId }),
    ...(openNow === undefined ? {} : { openNow }),
    ...(dutyNow === undefined ? {} : { dutyNow }),
    ...pagination(record),
  };
});

export const searchQuerySchema = defineSchema<SearchQueryContract>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, [
    'query', 'provinceId', 'coordinates', 'categoryId', 'specialtyId', 'nursingServiceId',
    'openNow', 'dutyNow', 'page', 'pageSize',
  ]);
  const query = readStringStrict(record, 'query');
  const coordinates = record['coordinates'] === undefined ? undefined : readCoordinates(record, 'coordinates');
  const categoryId = readOptionalIdentifier(record, 'categoryId');
  const specialtyId = readOptionalIdentifier(record, 'specialtyId');
  const nursingServiceId = readOptionalIdentifier(record, 'nursingServiceId');
  const openNow = readOptionalBoolean(record, 'openNow');
  const dutyNow = readOptionalBoolean(record, 'dutyNow');
  return {
    query,
    provinceId: readIdentifier(record, 'provinceId'),
    ...(coordinates === undefined ? {} : { coordinates }),
    ...(categoryId === undefined ? {} : { categoryId }),
    ...(specialtyId === undefined ? {} : { specialtyId }),
    ...(nursingServiceId === undefined ? {} : { nursingServiceId }),
    ...(openNow === undefined ? {} : { openNow }),
    ...(dutyNow === undefined ? {} : { dutyNow }),
    ...pagination(record),
  };
});

function readStringStrict(record: Record<string, unknown>, key: string): string {
  const value = readOptionalString(record, key, { min: 2, max: 100 });
  if (value === undefined) issue(`$.${key}`, 'Field is required');
  return value;
}

export const mapBoundsQuerySchema = defineSchema<MapBoundsQuery>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['north', 'south', 'east', 'west', 'provinceId', 'categoryId', 'openNow', 'dutyNow']);
  const north = readRequiredNumber(record, 'north', -90, 90);
  const south = readRequiredNumber(record, 'south', -90, 90);
  const east = readRequiredNumber(record, 'east', -180, 180);
  const west = readRequiredNumber(record, 'west', -180, 180);
  if (north <= south) issue('$', 'north must be greater than south');
  if (east <= west) issue('$', 'east must be greater than west');
  const categoryId = readOptionalIdentifier(record, 'categoryId');
  const openNow = readOptionalBoolean(record, 'openNow');
  const dutyNow = readOptionalBoolean(record, 'dutyNow');
  return {
    north, south, east, west,
    provinceId: readIdentifier(record, 'provinceId'),
    ...(categoryId === undefined ? {} : { categoryId }),
    ...(openNow === undefined ? {} : { openNow }),
    ...(dutyNow === undefined ? {} : { dutyNow }),
  };
});

function readRequiredNumber(record: Record<string, unknown>, key: string, min: number, max: number): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    issue(`$.${key}`, `Expected number between ${min} and ${max}`);
  }
  return value;
}
