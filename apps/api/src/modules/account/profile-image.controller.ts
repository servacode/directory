import { Controller, Delete, Get, Post, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AuthenticatedPrincipal } from '../auth/core/ports.js';
import { AccessTokenGuard } from '../auth/http/access-token.guard.js';
import { CurrentPrincipal } from '../auth/http/current-principal.decorator.js';
import { ProfileImageService, type UploadedImageFile } from './profile-image.service.js';

@UseGuards(AccessTokenGuard)
@Controller('users/me/profile-image')
export class ProfileImageController {
  constructor(private readonly images: ProfileImageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024,files:1}}))
  replace(@CurrentPrincipal() p:AuthenticatedPrincipal,@UploadedFile() file:UploadedImageFile){return this.images.replace(p.userId,file)}

  @Get('content')
  async content(@CurrentPrincipal() p:AuthenticatedPrincipal,@Res({passthrough:true}) response:Response){
    const image=await this.images.read(p.userId);
    response.setHeader('content-type',image.mimeType);
    response.setHeader('cache-control','private, max-age=300');
    return new StreamableFile(image.bytes);
  }

  @Delete()
  remove(@CurrentPrincipal() p:AuthenticatedPrincipal){return this.images.remove(p.userId)}
}
