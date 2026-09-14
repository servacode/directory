import type { ErrorCode } from '@health/contracts';

export class LocationDomainError extends Error {
  constructor(readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'LocationDomainError';
  }
}
