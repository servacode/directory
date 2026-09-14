import { Injectable } from '@nestjs/common';
import type { CityDTO, NeighborhoodDTO, ProvinceDTO } from '@health/contracts';
import { LocationsRepository } from './locations.repository.js';
import { LocationDomainError } from './location-domain.error.js';

@Injectable()
export class LocationsService {
  constructor(private readonly repository: LocationsRepository) {}

  listProvinces(): Promise<readonly ProvinceDTO[]> { return this.repository.listActiveProvinces(); }

  async listCities(provinceId: string): Promise<readonly CityDTO[]> {
    if (!(await this.repository.activeProvinceExists(provinceId))) {
      throw new LocationDomainError('PROVINCE_NOT_FOUND', 'Active province not found.');
    }
    return this.repository.listActiveCities(provinceId);
  }

  async listNeighborhoods(cityId: string): Promise<readonly NeighborhoodDTO[]> {
    if (!(await this.repository.activeCityExists(cityId))) {
      throw new LocationDomainError('CITY_NOT_FOUND', 'Active city not found.');
    }
    return this.repository.listActiveNeighborhoods(cityId);
  }
}
