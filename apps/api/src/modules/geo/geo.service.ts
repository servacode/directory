import { Injectable } from '@nestjs/common';
import type { CoordinatesDTO, FacilitySpecialization, GeoBoundsDTO } from '@health/contracts';
import { DatabaseService } from '../../database/database.service.js';

export interface GeoFacilityRecord {
  readonly id: string;
  readonly categoryId: string;
  readonly categoryCode: string;
  readonly specialization: FacilitySpecialization;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly distanceMeters?: number;
}

interface GeoRow {
  id:string;categoryId:string;categoryCode:string;specialization:FacilitySpecialization;name:string;
  latitude:number|string;longitude:number|string;distanceMeters?:number|string;
}

@Injectable()
export class GeoService {
  constructor(private readonly db: DatabaseService) {}

  async nearestActiveFacilities(input: {
    coordinates: CoordinatesDTO;
    provinceId: string;
    cityId?: string;
    categoryId?: string;
    radiusMeters?: number;
    limit?: number;
  }): Promise<readonly GeoFacilityRecord[]> {
    const { coordinates } = input;
    const params: unknown[] = [coordinates.longitude, coordinates.latitude, input.provinceId];
    const clauses = [
      `f.status = 'ACTIVE'`, 'f.location IS NOT NULL', 'f.province_id = $3', 'p.is_active = TRUE', 'c.is_active = TRUE',
      'cat.is_active = TRUE', 'dcp.public_enabled = TRUE',
    ];
    if (input.cityId) { params.push(input.cityId); clauses.push(`f.city_id = $${params.length}`); }
    if (input.categoryId) { params.push(input.categoryId); clauses.push(`f.category_id = $${params.length}`); }
    if (input.radiusMeters !== undefined) {
      params.push(input.radiusMeters);
      clauses.push(`ST_DWithin(f.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $${params.length})`);
    }
    const limit = Math.max(1, Math.min(input.limit ?? 50, 100)); params.push(limit);
    const result = await this.db.query<GeoRow>(
      `SELECT f.id,f.category_id AS "categoryId",cat.code AS "categoryCode",cat.specialization,f.name,
              ST_Y(f.location::geometry) AS latitude,ST_X(f.location::geometry) AS longitude,
              ST_Distance(f.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS "distanceMeters"
         FROM facilities f
         JOIN directory_categories cat ON cat.id=f.category_id
         JOIN directory_category_provinces dcp ON dcp.category_id=f.category_id AND dcp.province_id=f.province_id
         JOIN provinces p ON p.id=f.province_id JOIN cities c ON c.id=f.city_id
        WHERE ${clauses.join(' AND ')}
        ORDER BY f.location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, f.id
        LIMIT $${params.length}`,
      params,
    );
    return result.rows.map(row=>this.mapRow(row));
  }

  async activeFacilitiesInBounds(input: {
    bounds: GeoBoundsDTO;
    provinceId: string;
    cityId?: string;
    categoryId?: string;
    limit?: number;
  }): Promise<readonly GeoFacilityRecord[]> {
    const params: unknown[] = [input.bounds.west, input.bounds.south, input.bounds.east, input.bounds.north, input.provinceId];
    const clauses = [
      `f.status = 'ACTIVE'`,'f.location IS NOT NULL','f.province_id = $5','p.is_active = TRUE','c.is_active = TRUE','cat.is_active=TRUE','dcp.public_enabled=TRUE',
      `ST_Intersects(f.location::geometry, ST_MakeEnvelope($1, $2, $3, $4, 4326))`,
    ];
    if(input.cityId){params.push(input.cityId);clauses.push(`f.city_id = $${params.length}`)}
    if(input.categoryId){params.push(input.categoryId);clauses.push(`f.category_id = $${params.length}`)}
    const limit=Math.max(1,Math.min(input.limit??500,1000));params.push(limit);
    const result=await this.db.query<GeoRow>(`SELECT f.id,f.category_id AS "categoryId",cat.code AS "categoryCode",cat.specialization,f.name,ST_Y(f.location::geometry) AS latitude,ST_X(f.location::geometry) AS longitude
      FROM facilities f JOIN directory_categories cat ON cat.id=f.category_id JOIN directory_category_provinces dcp ON dcp.category_id=f.category_id AND dcp.province_id=f.province_id JOIN provinces p ON p.id=f.province_id JOIN cities c ON c.id=f.city_id
      WHERE ${clauses.join(' AND ')} ORDER BY f.id LIMIT $${params.length}`,params);
    return result.rows.map(row=>this.mapRow(row));
  }

  async distanceMeters(from: CoordinatesDTO, to: CoordinatesDTO): Promise<number> {
    const result = await this.db.query<{ distanceMeters: number | string }>(
      `SELECT ST_Distance(ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,ST_SetSRID(ST_MakePoint($3,$4),4326)::geography) AS "distanceMeters"`,
      [from.longitude,from.latitude,to.longitude,to.latitude],
    );
    return Number(result.rows[0]?.distanceMeters??0);
  }

  private mapRow(row:GeoRow):GeoFacilityRecord{return{id:row.id,categoryId:row.categoryId,categoryCode:row.categoryCode,specialization:row.specialization,name:row.name,latitude:Number(row.latitude),longitude:Number(row.longitude),...(row.distanceMeters===undefined?{}:{distanceMeters:Number(row.distanceMeters)})}}
}
