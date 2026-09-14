import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthDomainError } from '../core/auth-error.js';
import { AuthApplicationService } from '../auth-application.service.js';
import type { AuthenticatedRequest } from './authenticated-request.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly auth: AuthApplicationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new AuthDomainError('UNAUTHORIZED', 'Bearer token is required.');
    request.auth = await this.auth.authenticateAccessToken(header.slice(7));
    return true;
  }
}
