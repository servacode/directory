import type { Request } from 'express';
import type { AuthenticatedPrincipal } from '../core/ports.js';

export interface AuthenticatedRequest extends Request {
  auth: AuthenticatedPrincipal;
}
