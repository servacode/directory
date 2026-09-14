import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import {
  createFacilityDraftRequestSchema,
  parseIdentifier,
  submitFacilityRequestSchema,
  updateBusinessHoursRequestSchema,
  updateFacilityBasicInfoRequestSchema,
  updateFacilityLocationRequestSchema,
  updateMedicalClinicProfileRequestSchema,
  updateNursingCenterProfileRequestSchema,
  updatePharmacyProfileRequestSchema,
} from '@health/contracts';
import type { AuthenticatedPrincipal } from '../auth/core/ports.js';
import { AccessTokenGuard } from '../auth/http/access-token.guard.js';
import { CurrentPrincipal } from '../auth/http/current-principal.decorator.js';
import { FacilityApplicationService } from './facility-application.service.js';

@UseGuards(AccessTokenGuard)
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilities: FacilityApplicationService) {}

  @Post('drafts') createDraft(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    return this.facilities.createDraft(principal.userId, createFacilityDraftRequestSchema.parse(body));
  }

  @Get('mine') mine(@CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.facilities.listMine(principal.userId); }

  @Get('mine/:id') mineDetail(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string) { return this.facilities.getMine(principal.userId, parseIdentifier(id, '$.id')); }

  @Patch(':id/basic-info') basic(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    return this.facilities.updateBasicInfo(principal.userId, parseIdentifier(id, '$.id'), updateFacilityBasicInfoRequestSchema.parse(body));
  }

  @Patch(':id/location') location(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    return this.facilities.updateLocation(principal.userId, parseIdentifier(id, '$.id'), updateFacilityLocationRequestSchema.parse(body));
  }

  @Put(':id/business-hours') hours(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    return this.facilities.updateBusinessHours(principal.userId, parseIdentifier(id, '$.id'), updateBusinessHoursRequestSchema.parse(body));
  }

  @Patch(':id/pharmacy-profile') pharmacy(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    return this.facilities.updatePharmacyProfile(principal.userId, parseIdentifier(id, '$.id'), updatePharmacyProfileRequestSchema.parse(body));
  }

  @Patch(':id/clinic-profile') clinic(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    return this.facilities.updateClinicProfile(principal.userId, parseIdentifier(id, '$.id'), updateMedicalClinicProfileRequestSchema.parse(body));
  }

  @Patch(':id/nursing-profile') nursing(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    return this.facilities.updateNursingProfile(principal.userId, parseIdentifier(id, '$.id'), updateNursingCenterProfileRequestSchema.parse(body));
  }

  @Post(':id/request-reverification') requestReverification(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    const reason=typeof body==='object'&&body!==null&&'reason' in body&&typeof (body as {reason?:unknown}).reason==='string'?(body as {reason:string}).reason.trim().slice(0,500):undefined;
    return this.facilities.requestReverification(principal.userId, parseIdentifier(id, '$.id'), reason);
  }

  @Post(':id/submit') submit(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    submitFacilityRequestSchema.parse(body);
    return this.facilities.submit(principal.userId, parseIdentifier(id, '$.id'));
  }
}
