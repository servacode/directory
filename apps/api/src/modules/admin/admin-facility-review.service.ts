import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { ApplicationStatus, FacilityStatus } from '@health/contracts';
import { DatabaseService } from '../../database/database.service.js';
import { FacilityDomainError } from '../facilities/facility-domain.error.js';
import { FacilityVerificationService } from '../facilities/facility-verification.service.js';
import { FacilityDuplicateDetectionService } from './facility-duplicate-detection.service.js';
import { canReactivateFacility, canReviewApplication, canSuspendFacility } from './admin-review-policy.js';

interface ReviewRow { applicationId: string; applicationStatus: ApplicationStatus; facilityId: string; facilityStatus: FacilityStatus; }

@Injectable()
export class AdminFacilityReviewService {
  constructor(private readonly db: DatabaseService, private readonly duplicates: FacilityDuplicateDetectionService, private readonly verification: FacilityVerificationService) {}

  async listApplications(status: ApplicationStatus = 'PENDING', page=1, pageSize=25) {
    const result = await this.db.query(
      `SELECT fa.id, fa.facility_id AS "facilityId", COALESCE(f.name,'') AS "facilityName", f.category_id AS "categoryId", cat.code AS "categoryCode", cat.name_ar AS "categoryNameAr", cat.specialization,
              f.status AS "facilityStatus", u.full_name AS "ownerName", COALESCE(c.name_ar,'') AS "cityName",
              fa.submitted_at AS "submittedAt", fa.status, COUNT(*) OVER()::int AS "totalItems"
         FROM facility_applications fa
         JOIN facilities f ON f.id=fa.facility_id
         JOIN directory_categories cat ON cat.id=f.category_id
         JOIN users u ON u.id=fa.submitted_by
         LEFT JOIN cities c ON c.id=f.city_id
        WHERE fa.status=$1
        ORDER BY fa.submitted_at DESC
        LIMIT $2 OFFSET $3`, [status,pageSize,(page-1)*pageSize],
    );
    const totalItems=Number((result.rows[0] as {totalItems?:number}|undefined)?.totalItems??0);
    return {items:result.rows.map(({totalItems:_,...row}:any)=>row),pagination:{page,pageSize,totalItems,totalPages:Math.max(1,Math.ceil(totalItems/pageSize))}};
  }

  async listFacilities(status?: FacilityStatus, page=1, pageSize=25) {
    const params: unknown[]=[];
    const where=status ? `WHERE f.status=$1` : '';
    if(status) params.push(status);
    params.push(pageSize,(page-1)*pageSize);
    const limitIndex=params.length-1, offsetIndex=params.length;
    const result=await this.db.query(
      `SELECT f.id,f.name,f.category_id AS "categoryId",cat.code AS "categoryCode",cat.name_ar AS "categoryNameAr",cat.specialization,f.status,f.phone,p.name_ar AS "provinceName",c.name_ar AS "cityName",
              u.full_name AS "ownerName",f.updated_at AS "updatedAt",COUNT(*) OVER()::int AS "totalItems"
         FROM facilities f
         JOIN directory_categories cat ON cat.id=f.category_id
         LEFT JOIN provinces p ON p.id=f.province_id
         LEFT JOIN cities c ON c.id=f.city_id
         LEFT JOIN facility_members fm ON fm.facility_id=f.id AND fm.role='OWNER'
         LEFT JOIN users u ON u.id=fm.user_id
         ${where}
        ORDER BY f.updated_at DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params,
    );
    const totalItems=Number((result.rows[0] as {totalItems?:number}|undefined)?.totalItems??0);
    return {items:result.rows.map(({totalItems:_,...row}:any)=>row),pagination:{page,pageSize,totalItems,totalPages:Math.max(1,Math.ceil(totalItems/pageSize))}};
  }

  async listAuditLogs(page=1,pageSize=50) {
    const result=await this.db.query(
      `SELECT a.id,a.actor_user_id AS "actorUserId",u.full_name AS "actorName",a.action,a.entity_type AS "entityType",a.entity_id AS "entityId",a.metadata,a.request_id AS "requestId",a.created_at AS "createdAt",COUNT(*) OVER()::int AS "totalItems"
         FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id
        ORDER BY a.created_at DESC
        LIMIT $1 OFFSET $2`,[pageSize,(page-1)*pageSize],
    );
    const totalItems=Number((result.rows[0] as {totalItems?:number}|undefined)?.totalItems??0);
    return {items:result.rows.map(({totalItems:_,...row}:any)=>row),pagination:{page,pageSize,totalItems,totalPages:Math.max(1,Math.ceil(totalItems/pageSize))}};
  }

  async getApplication(applicationId: string) {
    const result = await this.db.query(
      `SELECT fa.id, fa.status, fa.submitted_at AS "submittedAt", fa.reviewed_at AS "reviewedAt", fa.rejection_reason AS "rejectionReason",
              f.id AS "facilityId", f.category_id AS "categoryId", cat.code AS "categoryCode", cat.name_ar AS "categoryNameAr", cat.icon_key AS "categoryIconKey", cat.specialization, cat.capabilities, f.status AS "facilityStatus", f.name AS "facilityName",
              f.phone, f.description, f.address_text AS "addressText", f.province_id AS "provinceId", f.city_id AS "cityId", f.reverification_reason AS "reverificationReason", f.reverification_requested_at AS "reverificationRequestedAt",
              CASE WHEN f.location IS NULL THEN NULL ELSE ST_Y(f.location::geometry) END AS latitude,
              CASE WHEN f.location IS NULL THEN NULL ELSE ST_X(f.location::geometry) END AS longitude,
              u.id AS "ownerId", u.full_name AS "ownerName", u.phone AS "ownerPhone", u.status AS "ownerStatus",
              cp.doctor_name AS "doctorName", cp.specialty_id AS "specialtyId",
              np.responsible_person_name AS "responsiblePersonName", pp.license_number AS "licenseNumber"
         FROM facility_applications fa
         JOIN facilities f ON f.id=fa.facility_id
         JOIN directory_categories cat ON cat.id=f.category_id
         JOIN users u ON u.id=fa.submitted_by
         LEFT JOIN medical_clinic_profiles cp ON cp.facility_id=f.id
         LEFT JOIN nursing_center_profiles np ON np.facility_id=f.id
         LEFT JOIN pharmacy_profiles pp ON pp.facility_id=f.id
        WHERE fa.id=$1`, [applicationId],
    );
    const application = result.rows[0];
    if (!application) throw new FacilityDomainError('APPLICATION_NOT_FOUND', 'Application not found.');
    const facilityId=(application as { facilityId: string }).facilityId;
    const [duplicates,verification]=await Promise.all([this.duplicates.findPotentialDuplicates(facilityId),this.verification.adminSummary(facilityId)]);
    return { application, duplicates, verification };
  }

  approve(adminUserId: string, applicationId: string) {
    return this.db.transaction(async (client) => {
      const row = await this.lockReview(client, applicationId);
      if (!canReviewApplication(row.applicationStatus, row.facilityStatus)) throw new FacilityDomainError('APPLICATION_ALREADY_REVIEWED', 'Application is not pending review.');
      await this.verification.assertComplete(row.facilityId,client);
      const now = new Date().toISOString();
      await client.query(`UPDATE facility_applications SET status='APPROVED', reviewed_by=$2, reviewed_at=$3 WHERE id=$1`, [applicationId, adminUserId, now]);
      await client.query(`UPDATE facilities SET status='ACTIVE', approved_by=$2, approved_at=$3, suspended_at=NULL, suspended_by=NULL, suspension_reason=NULL,reverification_requested_at=NULL,reverification_requested_by=NULL,reverification_reason=NULL WHERE id=$1`, [row.facilityId, adminUserId, now]);
      await this.audit(client, adminUserId, 'FACILITY_APPROVED', row.facilityId, { applicationId });
      return { facilityId: row.facilityId, status: 'ACTIVE' as const };
    });
  }

  reject(adminUserId: string, applicationId: string, reason: string) {
    return this.db.transaction(async (client) => {
      const row = await this.lockReview(client, applicationId);
      if (!canReviewApplication(row.applicationStatus, row.facilityStatus)) throw new FacilityDomainError('APPLICATION_ALREADY_REVIEWED', 'Application is not pending review.');
      const now = new Date().toISOString();
      await client.query(`UPDATE facility_applications SET status='REJECTED', reviewed_by=$2, reviewed_at=$3, rejection_reason=$4 WHERE id=$1`, [applicationId, adminUserId, now, reason]);
      await client.query(`UPDATE facilities SET status='REJECTED',reverification_requested_at=NULL,reverification_requested_by=NULL,reverification_reason=NULL WHERE id=$1`, [row.facilityId]);
      await this.audit(client, adminUserId, 'FACILITY_REJECTED', row.facilityId, { applicationId, reason });
      return { facilityId: row.facilityId, status: 'REJECTED' as const };
    });
  }

  suspend(adminUserId: string, facilityId: string, reason: string) {
    return this.db.transaction(async (client) => {
      const result = await client.query<{ status: FacilityStatus }>(`SELECT status FROM facilities WHERE id=$1 FOR UPDATE`, [facilityId]);
      const status = result.rows[0]?.status;
      if (!status) throw new FacilityDomainError('FACILITY_NOT_FOUND', 'Facility not found.');
      if (!canSuspendFacility(status)) throw new FacilityDomainError('INVALID_FACILITY_TRANSITION', 'Only active facilities can be suspended.');
      const now = new Date().toISOString();
      await client.query(`UPDATE facilities SET status='SUSPENDED', suspended_at=$2, suspended_by=$3, suspension_reason=$4 WHERE id=$1`, [facilityId, now, adminUserId, reason]);
      await this.audit(client, adminUserId, 'FACILITY_SUSPENDED', facilityId, { reason });
      return { facilityId, status: 'SUSPENDED' as const };
    });
  }

  reactivate(adminUserId: string, facilityId: string) {
    return this.db.transaction(async (client) => {
      const result = await client.query<{ status: FacilityStatus }>(`SELECT status FROM facilities WHERE id=$1 FOR UPDATE`, [facilityId]);
      const status = result.rows[0]?.status;
      if (!status) throw new FacilityDomainError('FACILITY_NOT_FOUND', 'Facility not found.');
      if (!canReactivateFacility(status)) throw new FacilityDomainError('INVALID_FACILITY_TRANSITION', 'Only suspended facilities can be reactivated.');
      await client.query(`UPDATE facilities SET status='ACTIVE', suspended_at=NULL, suspended_by=NULL, suspension_reason=NULL WHERE id=$1`, [facilityId]);
      await this.audit(client, adminUserId, 'FACILITY_REACTIVATED', facilityId, {});
      return { facilityId, status: 'ACTIVE' as const };
    });
  }

  private async lockReview(client: import('pg').PoolClient, applicationId: string): Promise<ReviewRow> {
    const result = await client.query<ReviewRow>(
      `SELECT fa.id AS "applicationId", fa.status AS "applicationStatus", f.id AS "facilityId", f.status AS "facilityStatus"
         FROM facility_applications fa JOIN facilities f ON f.id=fa.facility_id
        WHERE fa.id=$1 FOR UPDATE OF fa, f`, [applicationId],
    );
    const row = result.rows[0];
    if (!row) throw new FacilityDomainError('APPLICATION_NOT_FOUND', 'Application not found.');
    return row;
  }

  private async audit(client: import('pg').PoolClient, actor: string, action: string, facilityId: string, metadata: Record<string, unknown>) {
    await client.query(`INSERT INTO audit_logs (id,actor_user_id,action,entity_type,entity_id,metadata) VALUES ($1,$2,$3,'FACILITY',$4,$5::jsonb)`, [randomUUID(), actor, action, facilityId, JSON.stringify(metadata)]);
  }
}
