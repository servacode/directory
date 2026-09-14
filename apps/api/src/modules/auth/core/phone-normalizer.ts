import { AuthDomainError } from './auth-error.js';

const LOCAL = /^09\d{8}$/;
const INTERNATIONAL = /^\+9639\d{8}$/;

export function normalizeSyrianMobile(input: string): string {
  const value = input.replace(/[\s()-]/g, '');
  if (INTERNATIONAL.test(value)) return value;
  if (LOCAL.test(value)) return `+963${value.slice(1)}`;
  throw new AuthDomainError('INVALID_SYRIAN_PHONE', 'Only Syrian mobile numbers are supported.');
}
