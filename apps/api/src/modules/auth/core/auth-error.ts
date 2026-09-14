import type { ErrorCode } from '@health/contracts';

export class AuthDomainError extends Error {
  constructor(readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'AuthDomainError';
  }
}
