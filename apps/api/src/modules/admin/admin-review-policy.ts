import type { ApplicationStatus, FacilityStatus } from '@health/contracts';

export type AdminReviewAction = 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE';

export function canReviewApplication(applicationStatus: ApplicationStatus, facilityStatus: FacilityStatus): boolean {
  return applicationStatus === 'PENDING' && facilityStatus === 'PENDING_REVIEW';
}

export function canSuspendFacility(status: FacilityStatus): boolean { return status === 'ACTIVE'; }
export function canReactivateFacility(status: FacilityStatus): boolean { return status === 'SUSPENDED'; }
