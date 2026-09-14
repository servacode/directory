import { Controller, Get, Query } from '@nestjs/common';
import { parseIdentifier } from '@health/contracts';
import { LocationsService } from './locations.service.js';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get('provinces')
  provinces() { return this.locations.listProvinces(); }

  @Get('cities')
  cities(@Query('provinceId') provinceId: string) {
    return this.locations.listCities(parseIdentifier(provinceId, '$.provinceId'));
  }

  @Get('neighborhoods')
  neighborhoods(@Query('cityId') cityId: string) {
    return this.locations.listNeighborhoods(parseIdentifier(cityId, '$.cityId'));
  }
}
