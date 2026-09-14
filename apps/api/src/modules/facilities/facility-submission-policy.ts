import type { FacilitySpecialization, FacilityStatus } from '@health/contracts';

export interface FacilitySubmissionSnapshot {
  readonly specialization: FacilitySpecialization;
  readonly status: FacilityStatus;
  readonly namePresent: boolean;
  readonly phonePresent: boolean;
  readonly provincePresent: boolean;
  readonly cityPresent: boolean;
  readonly addressPresent: boolean;
  readonly locationPresent: boolean;
  readonly provinceActive: boolean;
  readonly cityActive: boolean;
  readonly businessDayCount: number;
  readonly businessHoursRequired: boolean;
  readonly doctorNamePresent: boolean;
  readonly specialtyActive: boolean;
  readonly nursingServiceCount: number;
  readonly verificationComplete: boolean;
  readonly registrationEnabled: boolean;
}

export type FacilitySubmissionIssue =
  | 'STATUS_NOT_EDITABLE'
  | 'NAME_REQUIRED'
  | 'PHONE_REQUIRED'
  | 'PROVINCE_REQUIRED'
  | 'CITY_REQUIRED'
  | 'ADDRESS_REQUIRED'
  | 'LOCATION_REQUIRED'
  | 'REGION_INACTIVE'
  | 'BUSINESS_HOURS_INCOMPLETE'
  | 'DOCTOR_NAME_REQUIRED'
  | 'SPECIALTY_REQUIRED'
  | 'NURSING_SERVICE_REQUIRED'
  | 'VERIFICATION_REQUIRED'
  | 'CATEGORY_REGISTRATION_DISABLED';

export function facilitySubmissionIssues(snapshot: FacilitySubmissionSnapshot): readonly FacilitySubmissionIssue[] {
  const issues: FacilitySubmissionIssue[] = [];
  if (!['DRAFT','REJECTED','REVERIFICATION_REQUIRED'].includes(snapshot.status)) issues.push('STATUS_NOT_EDITABLE');
  if (!snapshot.namePresent) issues.push('NAME_REQUIRED');
  if (!snapshot.phonePresent) issues.push('PHONE_REQUIRED');
  if (!snapshot.provincePresent) issues.push('PROVINCE_REQUIRED');
  if (!snapshot.cityPresent) issues.push('CITY_REQUIRED');
  if (!snapshot.addressPresent) issues.push('ADDRESS_REQUIRED');
  if (!snapshot.locationPresent) issues.push('LOCATION_REQUIRED');
  if (!snapshot.provinceActive || !snapshot.cityActive) issues.push('REGION_INACTIVE');
  if (snapshot.businessHoursRequired && snapshot.businessDayCount !== 7) issues.push('BUSINESS_HOURS_INCOMPLETE');
  if (!snapshot.registrationEnabled) issues.push('CATEGORY_REGISTRATION_DISABLED');
  if (!snapshot.verificationComplete) issues.push('VERIFICATION_REQUIRED');
  if (snapshot.specialization === 'MEDICAL_CLINIC') {
    if (!snapshot.doctorNamePresent) issues.push('DOCTOR_NAME_REQUIRED');
    if (!snapshot.specialtyActive) issues.push('SPECIALTY_REQUIRED');
  }
  if (snapshot.specialization === 'NURSING_CENTER' && snapshot.nursingServiceCount < 1) issues.push('NURSING_SERVICE_REQUIRED');
  return issues;
}
