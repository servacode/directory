import type { ErrorCode } from '@health/contracts';

export class FacilityDomainError extends Error {
  constructor(readonly code: ErrorCode, message: string, readonly details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = 'FacilityDomainError';
  }
}
