import { Injectable } from '@nestjs/common';
import type { CityDTO, NeighborhoodDTO, ProvinceDTO } from '@health/contracts';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class LocationsRepository {
  constructor(private readonly db: DatabaseService) {}

  async listActiveProvinces(): Promise<readonly ProvinceDTO[]> {
    const result = await this.db.query<ProvinceDTO>(
      `SELECT id, name_ar AS "nameAr", name_en AS "nameEn", is_active AS "isActive", sort_order AS "sortOrder"
         FROM provinces
        WHERE is_active = TRUE
        ORDER BY sort_order ASC, name_ar ASC`,
    );
    return result.rows;
  }

  async listActiveCities(provinceId: string): Promise<readonly CityDTO[]> {
    const result = await this.db.query<CityDTO>(
      `SELECT id, province_id AS "provinceId", name_ar AS "nameAr", name_en AS "nameEn",
              is_active AS "isActive", sort_order AS "sortOrder"
         FROM cities
        WHERE province_id = $1 AND is_active = TRUE
          AND EXISTS (SELECT 1 FROM provinces p WHERE p.id = cities.province_id AND p.is_active = TRUE)
        ORDER BY sort_order ASC, name_ar ASC`,
      [provinceId],
    );
    return result.rows;
  }

  async listActiveNeighborhoods(cityId: string): Promise<readonly NeighborhoodDTO[]> {
    const result = await this.db.query<NeighborhoodDTO>(
      `SELECT n.id, n.city_id AS "cityId", n.name_ar AS "nameAr", n.name_en AS "nameEn",
              n.is_active AS "isActive", n.sort_order AS "sortOrder"
         FROM neighborhoods n
         JOIN cities c ON c.id = n.city_id AND c.is_active = TRUE
         JOIN provinces p ON p.id = c.province_id AND p.is_active = TRUE
        WHERE n.city_id = $1 AND n.is_active = TRUE
        ORDER BY n.sort_order ASC, n.name_ar ASC`,
      [cityId],
    );
    return result.rows;
  }

  async activeProvinceExists(provinceId: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM provinces WHERE id = $1 AND is_active = TRUE) AS exists',
      [provinceId],
    );
    return result.rows[0]?.exists === true;
  }

  async activeNeighborhoodExists(neighborhoodId: string, cityId: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM neighborhoods n
         JOIN cities c ON c.id=n.city_id AND c.is_active=TRUE
         JOIN provinces p ON p.id=c.province_id AND p.is_active=TRUE
         WHERE n.id=$1 AND n.city_id=$2 AND n.is_active=TRUE
       ) AS exists`, [neighborhoodId, cityId],
    );
    return result.rows[0]?.exists === true;
  }

  async activeCityExists(cityId: string, provinceId?: string): Promise<boolean> {
    const params: unknown[] = [cityId];
    const provinceClause = provinceId ? ' AND c.province_id = $2' : '';
    if (provinceId) params.push(provinceId);
    const result = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM cities c
         JOIN provinces p ON p.id = c.province_id AND p.is_active = TRUE
         WHERE c.id = $1 AND c.is_active = TRUE${provinceClause}
       ) AS exists`,
      params,
    );
    return result.rows[0]?.exists === true;
  }
}
