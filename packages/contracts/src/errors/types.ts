import type { ErrorCode } from './codes.js';

export interface ApiErrorResponse {
  readonly code: ErrorCode;
  readonly messageKey: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly requestId: string;
}
