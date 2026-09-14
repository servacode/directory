import { Global, Module } from '@nestjs/common';
import { ImageProcessor } from './image-processor.js';

@Global()
@Module({ providers: [ImageProcessor], exports: [ImageProcessor] })
export class SecurityModule {}
