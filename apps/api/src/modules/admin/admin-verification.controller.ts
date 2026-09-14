import{Controller,Get,Param,Res,StreamableFile,UseGuards}from'@nestjs/common';
import type{Response}from'express';
import{parseIdentifier}from'@health/contracts';
import type{AuthenticatedPrincipal}from'../auth/core/ports.js';
import{AccessTokenGuard}from'../auth/http/access-token.guard.js';
import{CurrentPrincipal}from'../auth/http/current-principal.decorator.js';
import{RequireRoles,RoleGuard}from'../auth/http/roles.js';
import{FacilityVerificationService}from'../facilities/facility-verification.service.js';
@UseGuards(AccessTokenGuard,RoleGuard)@RequireRoles('ADMIN')@Controller('admin/facilities/:facilityId/verification')
export class AdminVerificationController{
 constructor(private readonly verification:FacilityVerificationService){}
 @Get()summary(@Param('facilityId')facilityId:string){return this.verification.adminSummary(parseIdentifier(facilityId,'$.facilityId'))}
 @Get('evidence/:evidenceId/content')async content(@CurrentPrincipal()principal:AuthenticatedPrincipal,@Param('facilityId')facilityId:string,@Param('evidenceId')evidenceId:string,@Res({passthrough:true})res:Response){
  const data=await this.verification.readForAdmin(principal.userId,parseIdentifier(facilityId,'$.facilityId'),parseIdentifier(evidenceId,'$.evidenceId'));
  res.setHeader('content-type',data.mimeType);res.setHeader('cache-control','private, no-store');res.setHeader('content-disposition','inline');return new StreamableFile(data.bytes)
 }
}
