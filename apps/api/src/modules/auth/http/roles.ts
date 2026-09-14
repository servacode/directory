import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SystemRole } from '@health/contracts';
import { AuthDomainError } from '../core/auth-error.js';
import type { AuthenticatedRequest } from './authenticated-request.js';

const ROLE_KEY = 'health:roles';
export const RequireRoles = (...roles: SystemRole[]) => SetMetadata(ROLE_KEY, roles);

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<SystemRole[]>(ROLE_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (required.length === 0) return true;
    const principal = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (!principal || !required.includes(principal.systemRole)) throw new AuthDomainError('FORBIDDEN', 'Insufficient role.');
    return true;
  }
}
