export const FACILITY_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'REJECTED',
  'REVERIFICATION_REQUIRED',
  'SUSPENDED',
  'CLOSED',
] as const;
export type FacilityStatus = (typeof FACILITY_STATUSES)[number];

export const AVAILABILITY_STATUSES = [
  'OPEN_NOW',
  'CLOSED_NOW',
  'TEMPORARILY_CLOSED',
  'DUTY_NOW',
] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const APPLICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const USER_STATUSES = ['ACTIVE', 'BLOCKED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SYSTEM_ROLES = ['USER', 'ADMIN'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const FACILITY_MEMBER_ROLES = ['OWNER', 'MANAGER'] as const;
export type FacilityMemberRole = (typeof FACILITY_MEMBER_ROLES)[number];

export const DUTY_SHIFT_STATUSES = ['SCHEDULED', 'ACTIVE', 'EXPIRED', 'CANCELLED'] as const;
export type DutyShiftStatus = (typeof DUTY_SHIFT_STATUSES)[number];

export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const LOCATION_MODES = ['DEVICE_LOCATION', 'MANUAL_LOCATION'] as const;
export type LocationMode = (typeof LOCATION_MODES)[number];


export const LOCATION_PERMISSION_STATUSES = [
  'NOT_REQUESTED',
  'GRANTED',
  'DENIED',
  'BLOCKED',
  'UNAVAILABLE',
] as const;
export type LocationPermissionStatus = (typeof LOCATION_PERMISSION_STATUSES)[number];

export const GPS_STATUSES = ['ENABLED', 'DISABLED', 'UNAVAILABLE'] as const;
export type GpsStatus = (typeof GPS_STATUSES)[number];

export const LOCATION_SOURCES = ['GPS', 'NETWORK', 'MANUAL'] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];
