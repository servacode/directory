import { Controller, Get, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ObjectStorageService } from './object-storage.service.js';
@Controller('media')
export class MediaController {
 constructor(private readonly storage:ObjectStorageService){}
 @Get('facilities/:filename') async facility(@Param('filename')filename:string,@Res({passthrough:true})response:Response){
  if(!/^[0-9a-f-]+\.(jpg|png|webp)$/i.test(filename))throw new NotFoundException();
  try{
   const bytes=await this.storage.read(`facilities/${filename}`);
   response.setHeader('content-type',filename.endsWith('.jpg')?'image/jpeg':filename.endsWith('.png')?'image/png':'image/webp');
   response.setHeader('cache-control','public, max-age=2592000, immutable');
   return new StreamableFile(bytes);
  }catch{throw new NotFoundException()}
 }
}
