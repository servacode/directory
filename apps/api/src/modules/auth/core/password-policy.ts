import { AuthDomainError } from './auth-error.js';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function assertPasswordPolicy(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new AuthDomainError('VALIDATION_ERROR', `Password length must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH}.`);
  }
}
