/** Public, non-secret platform configuration exposed to Android/web clients. */
export interface PublicPlatformConfigDTO {
  readonly userRegistrationEnabled: boolean;
  readonly passwordRecoveryEnabled: boolean;
  readonly facilityApplicationsEnabled: boolean;
  readonly ratingsEnabled: boolean;
  readonly englishEnabled: boolean;
  readonly notificationsEnabled: boolean;
  readonly maintenanceMode: boolean;
  readonly maxFacilityImages: number;
  readonly maxDutyShiftDurationHours: number;
  readonly defaultSearchRadiusMeters: number;
  readonly homeDutyLimit: number;
  readonly homeNearbyLimit: number;
}
