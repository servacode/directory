import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_IMAGE_UPLOAD_BYTES } from '@health/config';
import { parseIdentifier } from '@health/contracts';
import type { AuthenticatedPrincipal } from '../auth/core/ports.js';
import { AccessTokenGuard } from '../auth/http/access-token.guard.js';
import { CurrentPrincipal } from '../auth/http/current-principal.decorator.js';
import { FacilityDomainError } from './facility-domain.error.js';
import { FacilityImageService, type UploadedFacilityImageFile } from './facility-image.service.js';

@UseGuards(AccessTokenGuard)
@Controller('facilities/:facilityId/images')
export class FacilityImageController {
  constructor(private readonly images:FacilityImageService){}
  @Get() list(@CurrentPrincipal() p:AuthenticatedPrincipal,@Param('facilityId') facilityId:string){return this.images.list(p.userId,parseIdentifier(facilityId,'$.facilityId'));}
  @Post() @UseInterceptors(FileInterceptor('file',{limits:{fileSize:MAX_IMAGE_UPLOAD_BYTES,files:1}}))
  upload(@CurrentPrincipal() p:AuthenticatedPrincipal,@Param('facilityId') facilityId:string,@UploadedFile() file:UploadedFacilityImageFile){return this.images.upload(p.userId,parseIdentifier(facilityId,'$.facilityId'),file);}
  @Post(':imageId/primary') primary(@CurrentPrincipal() p:AuthenticatedPrincipal,@Param('facilityId') facilityId:string,@Param('imageId') imageId:string){return this.images.makePrimary(p.userId,parseIdentifier(facilityId,'$.facilityId'),parseIdentifier(imageId,'$.imageId'));}
  @Patch('order') order(@CurrentPrincipal() p:AuthenticatedPrincipal,@Param('facilityId') facilityId:string,@Body() body:unknown){
    if(!body||typeof body!=='object'||!Array.isArray((body as {imageIds?:unknown}).imageIds)) throw new FacilityDomainError('VALIDATION_ERROR','imageIds array required.');
    const imageIds=(body as {imageIds:unknown[]}).imageIds.map((value,index)=>parseIdentifier(value,`$.imageIds[${index}]`));
    return this.images.reorder(p.userId,parseIdentifier(facilityId,'$.facilityId'),imageIds);
  }
  @Delete(':imageId') remove(@CurrentPrincipal() p:AuthenticatedPrincipal,@Param('facilityId') facilityId:string,@Param('imageId') imageId:string){return this.images.remove(p.userId,parseIdentifier(facilityId,'$.facilityId'),parseIdentifier(imageId,'$.imageId'));}
}
