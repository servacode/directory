import { Module } from '@nestjs/common';
import { GeoService } from './geo.service.js';

@Module({ providers: [GeoService], exports: [GeoService] })
export class GeoModule {}
