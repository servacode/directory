import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PlatformSettingsService } from '../modules/settings/platform-settings.service.js';
import { FacilityDomainError } from '../modules/facilities/facility-domain.error.js';
import { isMaintenanceBypassRoute } from './maintenance-mode.policy.js';

@Injectable()
export class MaintenanceModeGuard implements CanActivate {
  constructor(private readonly settings: PlatformSettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestPath = request.originalUrl || request.url || request.path || '/';
    if (isMaintenanceBypassRoute(requestPath, request.method)) return true;
    if (!(await this.settings.get('maintenanceMode'))) return true;
    throw new FacilityDomainError('MAINTENANCE_MODE', 'The platform is temporarily under maintenance.');
  }
}
