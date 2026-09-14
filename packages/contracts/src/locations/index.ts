import {
  asRecord,
  defineSchema,
  issue,
  parseCoordinates,
  readCoordinates,
  readEnum,
  readIdentifier,
  readIsoDateTime,
  readNumber,
  readOptionalIdentifier,
  readOptionalNumber,
  rejectUnknownKeys,
} from '../common/runtime-schema.js';
import {
  GPS_STATUSES,
  LOCATION_MODES,
  LOCATION_PERMISSION_STATUSES,
  LOCATION_SOURCES,
  type GpsStatus,
  type LocationMode,
  type LocationPermissionStatus,
  type LocationSource,
} from '../common/enums.js';
import type { CoordinatesDTO, Identifier, IsoDateTime } from '../common/types.js';

export interface ProvinceDTO {
  readonly id: Identifier;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface CityDTO {
  readonly id: Identifier;
  readonly provinceId: Identifier;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface NeighborhoodDTO {
  readonly id: Identifier;
  readonly cityId: Identifier;
  readonly nameAr: string;
  readonly nameEn?: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface ManualLocationSelection {
  readonly provinceId: Identifier;
  readonly cityId?: Identifier;
  readonly neighborhoodId?: Identifier;
}

export interface DeviceLocationDTO {
  readonly coordinates: CoordinatesDTO;
  readonly accuracyMeters: number;
  readonly capturedAt: IsoDateTime;
  readonly source: Exclude<LocationSource, 'MANUAL'>;
}

export interface LocationRuntimeStateDTO {
  readonly mode: LocationMode;
  readonly permissionStatus: LocationPermissionStatus;
  readonly gpsStatus: GpsStatus;
  readonly provinceId?: Identifier;
  readonly cityId?: Identifier;
  readonly neighborhoodId?: Identifier;
  readonly deviceLocation?: DeviceLocationDTO;
}

export interface NearbyQuery {
  readonly coordinates: CoordinatesDTO;
  readonly provinceId?: Identifier;
  readonly cityId?: Identifier;
  readonly radiusMeters?: number;
}

export interface GeoBoundsDTO {
  readonly north: number;
  readonly south: number;
  readonly east: number;
  readonly west: number;
}


export interface DistanceDTO {
  readonly distanceMeters: number;
}

export const manualLocationSelectionSchema = defineSchema<ManualLocationSelection>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['provinceId', 'cityId', 'neighborhoodId']);
  const cityId = readOptionalIdentifier(record, 'cityId');
  const neighborhoodId = readOptionalIdentifier(record, 'neighborhoodId');
  if (neighborhoodId !== undefined && cityId === undefined) issue('$.neighborhoodId', 'Neighborhood requires a city');
  return {
    provinceId: readIdentifier(record, 'provinceId'),
    ...(cityId === undefined ? {} : { cityId }),
    ...(neighborhoodId === undefined ? {} : { neighborhoodId }),
  };
});

export const deviceLocationSchema = defineSchema<DeviceLocationDTO>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['coordinates', 'accuracyMeters', 'capturedAt', 'source']);
  const source = readEnum(record, 'source', LOCATION_SOURCES);
  if (source === 'MANUAL') issue('$.source', 'Device location source cannot be MANUAL');
  return {
    coordinates: readCoordinates(record, 'coordinates'),
    accuracyMeters: readNumber(record, 'accuracyMeters', { min: 0, max: 100000 }),
    capturedAt: readIsoDateTime(record, 'capturedAt'),
    source,
  };
});

export const locationRuntimeStateSchema = defineSchema<LocationRuntimeStateDTO>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['mode', 'permissionStatus', 'gpsStatus', 'provinceId', 'cityId', 'neighborhoodId', 'deviceLocation']);
  const mode = readEnum(record, 'mode', LOCATION_MODES);
  const permissionStatus = readEnum(record, 'permissionStatus', LOCATION_PERMISSION_STATUSES);
  const gpsStatus = readEnum(record, 'gpsStatus', GPS_STATUSES);
  const provinceId = readOptionalIdentifier(record, 'provinceId');
  const cityId = readOptionalIdentifier(record, 'cityId');
  const neighborhoodId = readOptionalIdentifier(record, 'neighborhoodId');
  const rawDeviceLocation = record['deviceLocation'];
  const deviceLocation = rawDeviceLocation === undefined ? undefined : deviceLocationSchema.parse(rawDeviceLocation);
  if (mode === 'DEVICE_LOCATION' && deviceLocation === undefined) issue('$.deviceLocation', 'Device location mode requires a device location');
  if (neighborhoodId !== undefined && cityId === undefined) issue('$.neighborhoodId', 'Neighborhood requires cityId');
  return {
    mode,
    permissionStatus,
    gpsStatus,
    ...(provinceId === undefined ? {} : { provinceId }),
    ...(cityId === undefined ? {} : { cityId }),
    ...(neighborhoodId === undefined ? {} : { neighborhoodId }),
    ...(deviceLocation === undefined ? {} : { deviceLocation }),
  };
});

export const nearbyQuerySchema = defineSchema<NearbyQuery>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['coordinates', 'provinceId', 'cityId', 'radiusMeters']);
  const provinceId = readOptionalIdentifier(record, 'provinceId');
  const cityId = readOptionalIdentifier(record, 'cityId');
  const radiusMeters = readOptionalNumber(record, 'radiusMeters', { min: 100, max: 100000, integer: true });
  return {
    coordinates: readCoordinates(record, 'coordinates'),
    ...(provinceId === undefined ? {} : { provinceId }),
    ...(cityId === undefined ? {} : { cityId }),
    ...(radiusMeters === undefined ? {} : { radiusMeters }),
  };
});

function parseBounds(input: unknown): GeoBoundsDTO {
  const record = asRecord(input, '$.bounds');
  rejectUnknownKeys(record, ['north', 'south', 'east', 'west'], '$.bounds');
  const north = readNumber(record, 'north', { min: -90, max: 90 });
  const south = readNumber(record, 'south', { min: -90, max: 90 });
  const east = readNumber(record, 'east', { min: -180, max: 180 });
  const west = readNumber(record, 'west', { min: -180, max: 180 });
  if (north <= south) issue('$.bounds', 'north must be greater than south');
  // Antimeridian-crossing bounds are intentionally rejected in v1; Syria never needs them.
  if (east <= west) issue('$.bounds', 'east must be greater than west');
  return { north, south, east, west };
}



export function coordinatesFromLngLat(longitude: number, latitude: number): CoordinatesDTO {
  return parseCoordinates({ latitude, longitude });
}
