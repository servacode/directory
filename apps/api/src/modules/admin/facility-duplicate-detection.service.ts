import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export interface FacilityDuplicateMatch {
  readonly facilityId: string;
  readonly name: string;
  readonly phone?: string;
  readonly distanceMeters?: number;
  readonly nameSimilarity: number;
  readonly exactPhone: boolean;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface MatchRow {
  facilityId: string; name: string; phone: string | null; distanceMeters: number | string | null;
  nameSimilarity: number | string; exactPhone: boolean;
}

@Injectable()
export class FacilityDuplicateDetectionService {
  constructor(private readonly db: DatabaseService) {}

  async findPotentialDuplicates(facilityId: string): Promise<readonly FacilityDuplicateMatch[]> {
    const result = await this.db.query<MatchRow>(
      `WITH target AS (
         SELECT id, LOWER(COALESCE(name,'')) AS normalized_name, phone, location, category_id
           FROM facilities WHERE id=$1
       )
       SELECT candidate.id AS "facilityId", COALESCE(candidate.name,'') AS name, candidate.phone,
              CASE WHEN target.location IS NULL OR candidate.location IS NULL THEN NULL
                   ELSE ST_Distance(target.location, candidate.location) END AS "distanceMeters",
              similarity(LOWER(COALESCE(candidate.name,'')), target.normalized_name) AS "nameSimilarity",
              (candidate.phone IS NOT NULL AND target.phone IS NOT NULL AND candidate.phone=target.phone) AS "exactPhone"
         FROM target
         JOIN facilities candidate ON candidate.id<>target.id AND candidate.category_id=target.category_id
        WHERE candidate.status IN ('ACTIVE','PENDING_REVIEW','REJECTED')
          AND (
            (candidate.phone IS NOT NULL AND target.phone IS NOT NULL AND candidate.phone=target.phone)
            OR similarity(LOWER(COALESCE(candidate.name,'')), target.normalized_name) >= 0.55
            OR (target.location IS NOT NULL AND candidate.location IS NOT NULL AND ST_DWithin(target.location,candidate.location,30))
          )
        ORDER BY "exactPhone" DESC, "nameSimilarity" DESC, "distanceMeters" ASC NULLS LAST
        LIMIT 10`, [facilityId],
    );
    return result.rows.map((row) => {
      const distanceMeters = row.distanceMeters == null ? undefined : Number(row.distanceMeters);
      const nameSimilarity = Number(row.nameSimilarity);
      const high = row.exactPhone || (distanceMeters !== undefined && distanceMeters <= 30 && nameSimilarity >= 0.55);
      const medium = nameSimilarity >= 0.7 || (distanceMeters !== undefined && distanceMeters <= 30);
      return {
        facilityId: row.facilityId,
        name: row.name,
        ...(row.phone ? { phone: row.phone } : {}),
        ...(distanceMeters === undefined ? {} : { distanceMeters }),
        nameSimilarity,
        exactPhone: row.exactPhone,
        riskLevel: high ? 'HIGH' : medium ? 'MEDIUM' : 'LOW',
      };
    });
  }
}
