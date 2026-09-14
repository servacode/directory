import type { FacilityStatus } from '../common/enums.js';

export const FACILITY_STATUS_TRANSITIONS: Readonly<Record<FacilityStatus, readonly FacilityStatus[]>> = {
  DRAFT: ['PENDING_REVIEW', 'CLOSED'],
  PENDING_REVIEW: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['REVERIFICATION_REQUIRED', 'SUSPENDED', 'CLOSED'],
  REJECTED: ['PENDING_REVIEW', 'CLOSED'],
  REVERIFICATION_REQUIRED: ['PENDING_REVIEW', 'CLOSED'],
  SUSPENDED: ['ACTIVE', 'CLOSED'],
  CLOSED: [],
};

export function canTransitionFacilityStatus(from: FacilityStatus, to: FacilityStatus): boolean {
  return FACILITY_STATUS_TRANSITIONS[from].includes(to);
}
