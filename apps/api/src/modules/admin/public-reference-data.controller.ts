import { Controller, Get } from '@nestjs/common';
import { ReferenceDataService } from './reference-data.service.js';
@Controller()
export class PublicReferenceDataController {
  constructor(private readonly refs:ReferenceDataService){}
  @Get('specialties') specialties(){return this.refs.listActive('specialties')}
  @Get('nursing-services') nursingServices(){return this.refs.listActive('nursing-services')}
}
