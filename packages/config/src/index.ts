export const APP_TIMEZONE = 'Asia/Damascus' as const;
export const supportedLocales = ['ar','en'] as const;
export interface PublicRuntimeConfig {
  apiBaseUrl: string;
  defaultLocale: 'ar'|'en';
  appTimezone: typeof APP_TIMEZONE;
}
export function requireNonEmpty(name: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`Missing required environment value: ${name}`);
  return value;
}


export const GEO_DEFAULT_SEARCH_RADIUS_METERS = 5_000 as const;
export const GEO_MAX_SEARCH_RADIUS_METERS = 100_000 as const;
export const LOCATION_TIMEOUT_MS = 12_000 as const;
export const LOCATION_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
export const MAP_DEFAULT_ZOOM = 12 as const;
export const MAP_FACILITY_ZOOM = 16 as const;
export const MAP_CLUSTER_RADIUS = 48 as const;

export interface GeoRuntimeConfig {
  readonly defaultSearchRadiusMeters: number;
  readonly maxSearchRadiusMeters: number;
  readonly locationTimeoutMs: number;
  readonly locationCacheMaxAgeMs: number;
}

export const defaultGeoRuntimeConfig: GeoRuntimeConfig = {
  defaultSearchRadiusMeters: GEO_DEFAULT_SEARCH_RADIUS_METERS,
  maxSearchRadiusMeters: GEO_MAX_SEARCH_RADIUS_METERS,
  locationTimeoutMs: LOCATION_TIMEOUT_MS,
  locationCacheMaxAgeMs: LOCATION_CACHE_MAX_AGE_MS,
};

export const DUTY_MAX_DURATION_HOURS = 36 as const;
export const MAX_IMAGE_UPLOAD_BYTES = 5_242_880 as const;

export const PLATFORM_SETTING_DEFINITIONS = {
  userRegistrationEnabled: { type: 'boolean', defaultValue: true, public: true },
  passwordRecoveryEnabled: { type: 'boolean', defaultValue: false, public: true },
  facilityApplicationsEnabled: { type: 'boolean', defaultValue: true, public: true },
  ratingsEnabled: { type: 'boolean', defaultValue: true, public: true },
  englishEnabled: { type: 'boolean', defaultValue: false, public: true },
  notificationsEnabled: { type: 'boolean', defaultValue: false, public: true },
  maintenanceMode: { type: 'boolean', defaultValue: false, public: true },
  verificationEvidenceRetentionDays: { type: 'integer', defaultValue: 90, min: 30, max: 730, public: false },
  maxFacilityImages: { type: 'integer', defaultValue: 5, min: 1, max: 20, public: true },
  maxDutyShiftDurationHours: { type: 'integer', defaultValue: 36, min: 1, max: 72, public: true },
  defaultSearchRadiusMeters: { type: 'integer', defaultValue: 5000, min: 100, max: 100000, public: true },
  maxSearchRadiusMeters: { type: 'integer', defaultValue: 100000, min: 1000, max: 200000, public: false },
  homeDutyLimit: { type: 'integer', defaultValue: 10, min: 1, max: 50, public: true },
  homeNearbyLimit: { type: 'integer', defaultValue: 20, min: 1, max: 100, public: true },
} as const;
export type PlatformSettingKey = keyof typeof PLATFORM_SETTING_DEFINITIONS;
export function isPlatformSettingKey(value: string): value is PlatformSettingKey { return value in PLATFORM_SETTING_DEFINITIONS; }
export function validatePlatformSettingValue(key: PlatformSettingKey, value: unknown): boolean {
  const def = PLATFORM_SETTING_DEFINITIONS[key];
  if (def.type === 'boolean') return typeof value === 'boolean';
  if (typeof value !== 'number' || !Number.isInteger(value)) return false;
  const numericDef = def as { min: number; max: number };
  return value >= numericDef.min && value <= numericDef.max;
}

export const SYRIA_MAP_BOUNDS = Object.freeze({ north: 37.6, south: 32.2, east: 42.5, west: 35.6 });
export const LAUNCH_DEFAULT_MAP_CENTER = Object.freeze({ latitude: 35.9594, longitude: 39.0008 });
