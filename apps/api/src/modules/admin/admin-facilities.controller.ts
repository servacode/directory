import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { APPLICATION_STATUSES, FACILITY_STATUSES, paginationQuerySchema, parseIdentifier, rejectFacilityApplicationRequestSchema, suspendFacilityRequestSchema, type ApplicationStatus, type FacilityStatus } from '@health/contracts';
import type { AuthenticatedPrincipal } from '../auth/core/ports.js';
import { AccessTokenGuard } from '../auth/http/access-token.guard.js';
import { CurrentPrincipal } from '../auth/http/current-principal.decorator.js';
import { RequireRoles, RoleGuard } from '../auth/http/roles.js';
import { AdminFacilityReviewService } from './admin-facility-review.service.js';

@UseGuards(AccessTokenGuard, RoleGuard)
@RequireRoles('ADMIN')
@Controller('admin')
export class AdminFacilitiesController {
  constructor(private readonly review: AdminFacilityReviewService) {}

  @Get('facility-applications')
  listApplications(@Query('status') rawStatus?: string,@Query('page') rawPage?:string,@Query('pageSize') rawPageSize?:string) {
    const status = (rawStatus && APPLICATION_STATUSES.includes(rawStatus as ApplicationStatus) ? rawStatus : 'PENDING') as ApplicationStatus;
    const page=paginationQuerySchema.parse({...(rawPage?{page:Number(rawPage)}:{}),...(rawPageSize?{pageSize:Number(rawPageSize)}:{})});
    return this.review.listApplications(status,page.page??1,page.pageSize??25);
  }

  @Get('facilities')
  listFacilities(@Query('status') rawStatus?:string,@Query('page') rawPage?:string,@Query('pageSize') rawPageSize?:string){
    const status=rawStatus&&FACILITY_STATUSES.includes(rawStatus as FacilityStatus)?rawStatus as FacilityStatus:undefined;
    const page=paginationQuerySchema.parse({...(rawPage?{page:Number(rawPage)}:{}),...(rawPageSize?{pageSize:Number(rawPageSize)}:{})});
    return this.review.listFacilities(status,page.page??1,page.pageSize??25);
  }

  @Get('audit-logs')
  auditLogs(@Query('page') rawPage?:string,@Query('pageSize') rawPageSize?:string){
    const page=paginationQuerySchema.parse({...(rawPage?{page:Number(rawPage)}:{}),...(rawPageSize?{pageSize:Number(rawPageSize)}:{})});
    return this.review.listAuditLogs(page.page??1,page.pageSize??50);
  }

  @Get('facility-applications/:id')
  application(@Param('id') id: string) { return this.review.getApplication(parseIdentifier(id, '$.id')); }

  @Post('facility-applications/:id/approve')
  approve(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.review.approve(principal.userId, parseIdentifier(id, '$.id'));
  }

  @Post('facility-applications/:id/reject')
  reject(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    const input = rejectFacilityApplicationRequestSchema.parse(body);
    return this.review.reject(principal.userId, parseIdentifier(id, '$.id'), input.reason);
  }

  @Post('facilities/:id/suspend')
  suspend(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    const input = suspendFacilityRequestSchema.parse(body);
    return this.review.suspend(principal.userId, parseIdentifier(id, '$.id'), input.reason);
  }

  @Post('facilities/:id/reactivate')
  reactivate(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.review.reactivate(principal.userId, parseIdentifier(id, '$.id'));
  }
}
