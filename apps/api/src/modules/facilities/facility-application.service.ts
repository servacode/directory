import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type {
  CreateFacilityDraftRequest,
  FacilityBusinessDayDTO,
  FacilitySpecialization,
  DirectoryCategoryCapabilitiesDTO,
  OwnerFacilityDTO,
  OwnerFacilityDetailDTO,
  UpdateBusinessHoursRequest,
  UpdateFacilityBasicInfoRequest,
  UpdateFacilityLocationRequest,
  UpdateMedicalClinicProfileRequest,
  UpdateNursingCenterProfileRequest,
  UpdatePharmacyProfileRequest,
} from '@health/contracts';
import { DatabaseService } from '../../database/database.service.js';
import { LocationsRepository } from '../locations/locations.repository.js';
import { DirectoryCatalogService } from '../directory/directory-catalog.service.js';
import { FacilityDomainError } from './facility-domain.error.js';
import { FacilityPermissionService } from './facility-permission.service.js';
import { facilitySubmissionIssues, type FacilitySubmissionSnapshot } from './facility-submission-policy.js';
import { PlatformSettingsService } from '../settings/platform-settings.service.js';

interface DraftRow { id:string; specialization:FacilitySpecialization; categoryId:string; categoryCode:string; status:'DRAFT'|'REJECTED'|'REVERIFICATION_REQUIRED'; }
interface SubmissionRow {
  specialization:FacilitySpecialization; status:FacilitySubmissionSnapshot['status']; namePresent:boolean; phonePresent:boolean;
  provincePresent:boolean; cityPresent:boolean; addressPresent:boolean; locationPresent:boolean; provinceActive:boolean; cityActive:boolean;
  businessDayCount:number|string; businessHoursRequired:boolean; doctorNamePresent:boolean; specialtyActive:boolean; nursingServiceCount:number|string;
  verificationComplete:boolean; registrationEnabled:boolean;
}

@Injectable()
export class FacilityApplicationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly permissions: FacilityPermissionService,
    private readonly locations: LocationsRepository,
    private readonly settings: PlatformSettingsService,
    private readonly catalog: DirectoryCatalogService,
  ) {}

  async createDraft(userId: string, input: CreateFacilityDraftRequest): Promise<DraftRow> {
    if (!(await this.settings.get('facilityApplicationsEnabled'))) throw new FacilityDomainError('FEATURE_DISABLED', 'Facility applications are disabled.');
    const category = await this.catalog.assertRegistrationEnabled(input.categoryId,input.provinceId);
    const facilityId = randomUUID();
    return this.db.transaction(async (client) => {
      await client.query(`INSERT INTO facilities (id,specialization,category_id,status,province_id) VALUES ($1,$2,$3,'DRAFT',$4)`, [facilityId,category.specialization,category.id,input.provinceId]);
      await client.query(`INSERT INTO facility_members (id, facility_id, user_id, role) VALUES ($1,$2,$3,'OWNER')`, [randomUUID(), facilityId, userId]);
      if (category.specialization === 'PHARMACY') await client.query('INSERT INTO pharmacy_profiles (facility_id) VALUES ($1)', [facilityId]);
      if (category.specialization === 'MEDICAL_CLINIC') await client.query('INSERT INTO medical_clinic_profiles (facility_id) VALUES ($1)', [facilityId]);
      if (category.specialization === 'NURSING_CENTER') await client.query('INSERT INTO nursing_center_profiles (facility_id) VALUES ($1)', [facilityId]);
      await this.audit(client, userId, 'FACILITY_DRAFT_CREATED', facilityId, { categoryId:category.id,categoryCode:category.code,specialization:category.specialization,provinceId:input.provinceId });
      return { id:facilityId,specialization:category.specialization,categoryId:category.id,categoryCode:category.code,status:'DRAFT' };
    });
  }

  async listMine(userId: string): Promise<readonly OwnerFacilityDTO[]> {
    const result = await this.db.query<OwnerFacilityDTO>(
      `SELECT f.id,c.specialization,c.id AS "categoryId",c.code AS "categoryCode",c.name_ar AS "categoryNameAr",c.icon_key AS "categoryIconKey",c.capabilities AS "categoryCapabilities",f.name,f.status,f.province_id AS "provinceId",f.city_id AS "cityId",
              CASE WHEN img.storage_key IS NULL THEN NULL ELSE '/api/v1/media/' || img.storage_key END AS "primaryImageUrl", last_reject.rejection_reason AS "rejectionReason",
              f.created_at AS "createdAt", f.updated_at AS "updatedAt"
         FROM facility_members fm
         JOIN facilities f ON f.id = fm.facility_id
         JOIN directory_categories c ON c.id=f.category_id
         LEFT JOIN facility_images img ON img.facility_id = f.id AND img.is_primary = TRUE
         LEFT JOIN LATERAL (
           SELECT rejection_reason FROM facility_applications fa
            WHERE fa.facility_id = f.id AND fa.status = 'REJECTED'
            ORDER BY fa.reviewed_at DESC LIMIT 1
         ) last_reject ON TRUE
        WHERE fm.user_id = $1
        ORDER BY f.created_at DESC`, [userId],
    );
    return result.rows;
  }

  async getMine(userId: string, facilityId: string): Promise<OwnerFacilityDetailDTO> {
    await this.permissions.assertOwner(this.db, userId, facilityId);
    const base = await this.db.query<{
      id:string; specialization:FacilitySpecialization; categoryId:string; categoryCode:string; categoryNameAr:string; categoryIconKey:string; categoryCapabilities:DirectoryCategoryCapabilitiesDTO; name?:string; status:OwnerFacilityDTO['status']; provinceId?:string; cityId?:string;
      neighborhoodId?:string; phone?:string; description?:string; addressText?:string; latitude:number|null; longitude:number|null;
      primaryImageUrl?:string; rejectionReason?:string; createdAt:string; updatedAt:string;
      licenseNumber?:string; pharmacyAdditionalInfo?:string; doctorName?:string; specialtyId?:string; responsiblePersonName?:string;
    }>(`SELECT f.id,c.specialization,c.id AS "categoryId",c.code AS "categoryCode",c.name_ar AS "categoryNameAr",c.icon_key AS "categoryIconKey",c.capabilities AS "categoryCapabilities",f.name,f.status,f.province_id AS "provinceId",f.city_id AS "cityId",
               f.neighborhood_id AS "neighborhoodId", f.phone, f.description, f.address_text AS "addressText",
               CASE WHEN f.location IS NULL THEN NULL ELSE ST_Y(f.location::geometry) END AS latitude,
               CASE WHEN f.location IS NULL THEN NULL ELSE ST_X(f.location::geometry) END AS longitude,
               CASE WHEN img.storage_key IS NULL THEN NULL ELSE '/api/v1/media/' || img.storage_key END AS "primaryImageUrl", last_reject.rejection_reason AS "rejectionReason",
               f.created_at AS "createdAt", f.updated_at AS "updatedAt",
               pp.license_number AS "licenseNumber", pp.additional_info AS "pharmacyAdditionalInfo",
               cp.doctor_name AS "doctorName", cp.specialty_id AS "specialtyId", np.responsible_person_name AS "responsiblePersonName"
          FROM facilities f
          JOIN directory_categories c ON c.id=f.category_id
          LEFT JOIN facility_images img ON img.facility_id=f.id AND img.is_primary=TRUE
          LEFT JOIN pharmacy_profiles pp ON pp.facility_id=f.id
          LEFT JOIN medical_clinic_profiles cp ON cp.facility_id=f.id
          LEFT JOIN nursing_center_profiles np ON np.facility_id=f.id
          LEFT JOIN LATERAL (
            SELECT rejection_reason FROM facility_applications fa WHERE fa.facility_id=f.id AND fa.status='REJECTED'
            ORDER BY fa.reviewed_at DESC LIMIT 1
          ) last_reject ON TRUE
         WHERE f.id=$1`, [facilityId]);
    const row=base.rows[0];
    if(!row) throw new FacilityDomainError('FACILITY_NOT_FOUND','Facility not found.');
    const days=await this.db.query<{id:string;dayOfWeek:FacilityBusinessDayDTO['dayOfWeek'];isClosed:boolean;is24Hours:boolean}>(
      `SELECT id,day_of_week AS "dayOfWeek",is_closed AS "isClosed",is_24_hours AS "is24Hours" FROM facility_business_days WHERE facility_id=$1 ORDER BY day_of_week`,[facilityId]);
    const businessHours:FacilityBusinessDayDTO[]=[];
    for(const day of days.rows){
      const periods=await this.db.query<{id:string;startTime:string;endTime:string;endsNextDay:boolean}>(
        `SELECT id,start_time::text AS "startTime",end_time::text AS "endTime",ends_next_day AS "endsNextDay" FROM business_hours_periods WHERE business_day_id=$1 ORDER BY sort_order`,[day.id]);
      businessHours.push({dayOfWeek:day.dayOfWeek,isClosed:day.isClosed,is24Hours:day.is24Hours,periods:periods.rows});
    }
    const nursingServices=row.specialization==='NURSING_CENTER' ? await this.db.query<{id:string}>(`SELECT nursing_service_id AS id FROM facility_nursing_services WHERE facility_id=$1 ORDER BY nursing_service_id`,[facilityId]) : {rows:[] as {id:string}[]};
    const images=await this.db.query<{id:string;storageKey:string;isPrimary:boolean;sortOrder:number}>(`SELECT id,storage_key AS "storageKey",is_primary AS "isPrimary",sort_order AS "sortOrder" FROM facility_images WHERE facility_id=$1 ORDER BY sort_order,id`,[facilityId]);
    return {
      id:row.id,specialization:row.specialization,categoryId:row.categoryId,categoryCode:row.categoryCode,categoryNameAr:row.categoryNameAr,categoryIconKey:row.categoryIconKey,categoryCapabilities:row.categoryCapabilities,status:row.status,createdAt:row.createdAt,updatedAt:row.updatedAt,businessHours,images:images.rows.map(x=>({id:x.id,url:`/api/v1/media/facilities/${x.storageKey.split('/').pop()}`,isPrimary:x.isPrimary,sortOrder:x.sortOrder})),
      ...(row.name?{name:row.name}:{}),...(row.provinceId?{provinceId:row.provinceId}:{}),...(row.cityId?{cityId:row.cityId}:{}),
      ...(row.neighborhoodId?{neighborhoodId:row.neighborhoodId}:{}),...(row.phone?{phone:row.phone}:{}),...(row.description?{description:row.description}:{}),
      ...(row.addressText?{addressText:row.addressText}:{}),...(row.latitude!==null&&row.longitude!==null?{coordinates:{latitude:Number(row.latitude),longitude:Number(row.longitude)}}:{}),
      ...(row.primaryImageUrl?{primaryImageUrl:row.primaryImageUrl}:{}),...(row.rejectionReason?{rejectionReason:row.rejectionReason}:{}),
      ...(row.specialization==='PHARMACY'?{pharmacyProfile:{...(row.licenseNumber?{licenseNumber:row.licenseNumber}:{}),...(row.pharmacyAdditionalInfo?{additionalInfo:row.pharmacyAdditionalInfo}:{})}}:{}),
      ...(row.specialization==='MEDICAL_CLINIC'?{clinicProfile:{...(row.doctorName?{doctorName:row.doctorName}:{}),...(row.specialtyId?{specialtyId:row.specialtyId}:{})}}:{}),
      ...(row.specialization==='NURSING_CENTER'?{nursingProfile:{...(row.responsiblePersonName?{responsiblePersonName:row.responsiblePersonName}:{}),serviceIds:nursingServices.rows.map(x=>x.id)}}:{})
    };
  }

  async updateBasicInfo(userId: string, facilityId: string, input: UpdateFacilityBasicInfoRequest): Promise<{ ok: true }> {
    await this.assertActiveRegion(input.provinceId, input.cityId, input.neighborhoodId);
    await this.db.transaction(async (client) => {
      const facility=await this.permissions.assertSensitiveEditableOwner(client, userId, facilityId);
      await this.assertCategoryAllowedInProvince(client,facilityId,input.provinceId,facility.status);
      await client.query(
        `UPDATE facilities SET name=$2, phone=$3, description=$4, province_id=$5, city_id=$6,
              neighborhood_id=$7, address_text=$8 WHERE id=$1`,
        [facilityId, input.name, input.phone, input.description ?? null, input.provinceId, input.cityId, input.neighborhoodId ?? null, input.addressText],
      );
      await this.audit(client, userId, 'FACILITY_BASIC_INFO_UPDATED', facilityId, {});
    });
    return { ok: true };
  }

  async updateLocation(userId: string, facilityId: string, input: UpdateFacilityLocationRequest): Promise<{ ok: true }> {
    await this.assertActiveRegion(input.provinceId, input.cityId, input.neighborhoodId);
    await this.db.transaction(async (client) => {
      const facility=await this.permissions.assertSensitiveEditableOwner(client, userId, facilityId);
      await this.assertCategoryAllowedInProvince(client,facilityId,input.provinceId,facility.status);
      await client.query(
        `UPDATE facilities
            SET location=ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,
                province_id=$4, city_id=$5, neighborhood_id=$6, address_text=$7
          WHERE id=$1`,
        [facilityId, input.coordinates.longitude, input.coordinates.latitude, input.provinceId, input.cityId, input.neighborhoodId ?? null, input.addressText],
      );
      await this.audit(client, userId, 'FACILITY_LOCATION_UPDATED', facilityId, {});
    });
    return { ok: true };
  }

  async updateBusinessHours(userId: string, facilityId: string, input: UpdateBusinessHoursRequest): Promise<{ ok: true }> {
    await this.db.transaction(async (client) => {
      await this.permissions.assertOperationalEditableOwner(client, userId, facilityId);
      await client.query('DELETE FROM facility_business_days WHERE facility_id = $1', [facilityId]);
      for (const day of input.days) await this.insertBusinessDay(client, facilityId, day);
      await this.audit(client, userId, 'FACILITY_HOURS_UPDATED', facilityId, {});
    });
    return { ok: true };
  }

  async updatePharmacyProfile(userId: string, facilityId: string, input: UpdatePharmacyProfileRequest): Promise<{ ok: true }> {
    await this.db.transaction(async (client) => {
      const facility = await this.permissions.assertSensitiveEditableOwner(client, userId, facilityId);
      if (facility.specialization !== 'PHARMACY') throw new FacilityDomainError('INVALID_FACILITY_TYPE', 'Pharmacy profile requires a pharmacy facility.');
      await client.query(`UPDATE pharmacy_profiles SET license_number=$2, additional_info=$3 WHERE facility_id=$1`, [facilityId, input.licenseNumber ?? null, input.additionalInfo ?? null]);
    });
    return { ok: true };
  }

  async updateClinicProfile(userId: string, facilityId: string, input: UpdateMedicalClinicProfileRequest): Promise<{ ok: true }> {
    await this.db.transaction(async (client) => {
      const facility = await this.permissions.assertSensitiveEditableOwner(client, userId, facilityId);
      if (facility.specialization !== 'MEDICAL_CLINIC') throw new FacilityDomainError('INVALID_FACILITY_TYPE', 'Clinic profile requires a medical clinic facility.');
      const specialty = await client.query<{ exists: boolean }>(`SELECT EXISTS(SELECT 1 FROM doctor_specialties WHERE id=$1 AND is_active=TRUE) AS exists`, [input.specialtyId]);
      if (specialty.rows[0]?.exists !== true) throw new FacilityDomainError('VALIDATION_ERROR', 'Active specialty required.');
      await client.query(`UPDATE medical_clinic_profiles SET doctor_name=$2, specialty_id=$3 WHERE facility_id=$1`, [facilityId, input.doctorName, input.specialtyId]);
    });
    return { ok: true };
  }

  async updateNursingProfile(userId: string, facilityId: string, input: UpdateNursingCenterProfileRequest): Promise<{ ok: true }> {
    await this.db.transaction(async (client) => {
      const facility = await this.permissions.assertSensitiveEditableOwner(client, userId, facilityId);
      if (facility.specialization !== 'NURSING_CENTER') throw new FacilityDomainError('INVALID_FACILITY_TYPE', 'Nursing profile requires a nursing center facility.');
      const active = await client.query<{ id: string }>(`SELECT id FROM nursing_services WHERE id = ANY($1::uuid[]) AND is_active=TRUE`, [input.serviceIds]);
      if (active.rows.length !== input.serviceIds.length) throw new FacilityDomainError('VALIDATION_ERROR', 'All nursing services must be active.');
      await client.query(`UPDATE nursing_center_profiles SET responsible_person_name=$2 WHERE facility_id=$1`, [facilityId, input.responsiblePersonName ?? null]);
      await client.query('DELETE FROM facility_nursing_services WHERE facility_id=$1', [facilityId]);
      for (const serviceId of input.serviceIds) await client.query(`INSERT INTO facility_nursing_services (facility_id,nursing_service_id) VALUES ($1,$2)`, [facilityId, serviceId]);
    });
    return { ok: true };
  }

  async requestReverification(userId:string,facilityId:string,reason?:string):Promise<{status:'REVERIFICATION_REQUIRED'}>{
    await this.db.transaction(async client=>{
      await this.permissions.assertOwner(client,userId,facilityId);
      const row=await client.query<{status:string}>(`SELECT status FROM facilities WHERE id=$1 FOR UPDATE`,[facilityId]);
      const status=row.rows[0]?.status;
      if(!status)throw new FacilityDomainError('FACILITY_NOT_FOUND','Facility not found.');
      if(status!=='ACTIVE')throw new FacilityDomainError('INVALID_FACILITY_TRANSITION','Only active facilities can request re-verification. Suspended facilities require explicit admin reactivation.');
      const now=new Date().toISOString();
      await client.query(`UPDATE facilities SET status='REVERIFICATION_REQUIRED',reverification_requested_at=$2,reverification_requested_by=$3,reverification_reason=$4 WHERE id=$1`,[facilityId,now,userId,reason??null]);
      await this.audit(client,userId,'FACILITY_REVERIFICATION_REQUESTED',facilityId,{previousStatus:status,reason:reason??null});
    });
    return{status:'REVERIFICATION_REQUIRED'};
  }

  async submit(userId: string, facilityId: string): Promise<{ applicationId: string; status: 'PENDING_REVIEW' }> {
    return this.db.transaction(async (client) => {
      await this.permissions.assertOwner(client, userId, facilityId);
      const snapshot = await this.loadSubmissionSnapshot(client, facilityId);
      if (!snapshot) throw new FacilityDomainError('FACILITY_NOT_FOUND', 'Facility not found.');
      const issues = facilitySubmissionIssues(snapshot);
      if (issues.length) throw new FacilityDomainError('VALIDATION_ERROR', 'Facility is incomplete.', { issues });
      const pending = await client.query<{ exists: boolean }>(`SELECT EXISTS(SELECT 1 FROM facility_applications WHERE facility_id=$1 AND status='PENDING') AS exists`, [facilityId]);
      if (pending.rows[0]?.exists) throw new FacilityDomainError('APPLICATION_ALREADY_PENDING', 'Facility already has a pending application.');
      const applicationId = randomUUID();
      await client.query(`INSERT INTO facility_applications (id,facility_id,submitted_by,status) VALUES ($1,$2,$3,'PENDING')`, [applicationId, facilityId, userId]);
      await client.query(`UPDATE facilities SET status='PENDING_REVIEW' WHERE id=$1`, [facilityId]);
      await this.audit(client, userId, snapshot.status === 'DRAFT' ? 'FACILITY_SUBMITTED' : snapshot.status === 'REVERIFICATION_REQUIRED' ? 'FACILITY_REVERIFICATION_SUBMITTED' : 'FACILITY_RESUBMITTED', facilityId, { applicationId });
      return { applicationId, status: 'PENDING_REVIEW' as const };
    });
  }

  private async assertCategoryAllowedInProvince(client: PoolClient,facilityId:string,provinceId:string,status:string):Promise<void>{
    const result=await client.query<{categoryActive:boolean;publicEnabled:boolean;ownerRegistrationEnabled:boolean}>(`SELECT cat.is_active AS "categoryActive",COALESCE(dcp.public_enabled,FALSE) AS "publicEnabled",COALESCE(dcp.owner_registration_enabled,FALSE) AS "ownerRegistrationEnabled" FROM facilities f JOIN directory_categories cat ON cat.id=f.category_id LEFT JOIN directory_category_provinces dcp ON dcp.category_id=f.category_id AND dcp.province_id=$2 WHERE f.id=$1`,[facilityId,provinceId]);
    const row=result.rows[0];
    const allowed=status==='REVERIFICATION_REQUIRED'
      ? row?.categoryActive===true
      : ['ACTIVE','SUSPENDED'].includes(status)
        ? row?.publicEnabled===true
        : row?.ownerRegistrationEnabled===true;
    if(!allowed)throw new FacilityDomainError('FEATURE_DISABLED','This category is not enabled for the selected province.');
  }

  private async assertActiveRegion(provinceId: string, cityId: string, neighborhoodId?: string): Promise<void> {
    if (!(await this.locations.activeProvinceExists(provinceId))) throw new FacilityDomainError('PROVINCE_NOT_FOUND', 'Active province not found.');
    if (!(await this.locations.activeCityExists(cityId, provinceId))) throw new FacilityDomainError('CITY_NOT_FOUND', 'Active city not found in province.');
    if (neighborhoodId && !(await this.locations.activeNeighborhoodExists(neighborhoodId, cityId))) throw new FacilityDomainError('VALIDATION_ERROR', 'Active neighborhood not found in city.');
  }

  private async insertBusinessDay(client: PoolClient, facilityId: string, day: FacilityBusinessDayDTO): Promise<void> {
    const businessDayId = randomUUID();
    await client.query(`INSERT INTO facility_business_days (id,facility_id,day_of_week,is_closed,is_24_hours) VALUES ($1,$2,$3,$4,$5)`, [businessDayId, facilityId, day.dayOfWeek, day.isClosed, day.is24Hours]);
    for (const [index, period] of day.periods.entries()) {
      await client.query(`INSERT INTO business_hours_periods (id,business_day_id,start_time,end_time,ends_next_day,sort_order) VALUES ($1,$2,$3,$4,$5,$6)`, [randomUUID(), businessDayId, period.startTime, period.endTime, period.endsNextDay, index]);
    }
  }

  private async loadSubmissionSnapshot(client: PoolClient, facilityId: string): Promise<FacilitySubmissionSnapshot | null> {
    const result = await client.query<SubmissionRow>(
      `SELECT cat.specialization,f.status,
              (NULLIF(BTRIM(f.name),'') IS NOT NULL) AS "namePresent",
              (NULLIF(BTRIM(f.phone),'') IS NOT NULL) AS "phonePresent",
              (f.province_id IS NOT NULL) AS "provincePresent", (f.city_id IS NOT NULL) AS "cityPresent",
              (NULLIF(BTRIM(f.address_text),'') IS NOT NULL) AS "addressPresent", (f.location IS NOT NULL) AS "locationPresent",
              COALESCE(p.is_active,FALSE) AS "provinceActive", COALESCE(c.is_active,FALSE) AS "cityActive",
              (SELECT COUNT(*) FROM facility_business_days d WHERE d.facility_id=f.id) AS "businessDayCount",
              COALESCE((cat.capabilities->>'businessHours')::boolean,TRUE) AS "businessHoursRequired",
              (NULLIF(BTRIM(cp.doctor_name),'') IS NOT NULL) AS "doctorNamePresent",
              COALESCE(ds.is_active,FALSE) AS "specialtyActive",
              (SELECT COUNT(*) FROM facility_nursing_services ns JOIN nursing_services s ON s.id=ns.nursing_service_id AND s.is_active=TRUE WHERE ns.facility_id=f.id) AS "nursingServiceCount",
              NOT EXISTS (SELECT 1 FROM category_verification_requirements vr WHERE vr.category_id=f.category_id AND vr.is_active=TRUE AND vr.is_required=TRUE AND (SELECT COUNT(*) FROM facility_verification_evidence ve WHERE ve.facility_id=f.id AND ve.requirement_id=vr.id) < vr.min_files) AS "verificationComplete",
              CASE WHEN f.status='REVERIFICATION_REQUIRED' THEN cat.is_active ELSE COALESCE(dcp.owner_registration_enabled,FALSE) END AS "registrationEnabled"
         FROM facilities f
         JOIN directory_categories cat ON cat.id=f.category_id
         LEFT JOIN directory_category_provinces dcp ON dcp.category_id=f.category_id AND dcp.province_id=f.province_id
         LEFT JOIN provinces p ON p.id=f.province_id
         LEFT JOIN cities c ON c.id=f.city_id
         LEFT JOIN medical_clinic_profiles cp ON cp.facility_id=f.id
         LEFT JOIN doctor_specialties ds ON ds.id=cp.specialty_id
        WHERE f.id=$1 FOR UPDATE`, [facilityId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return { ...row,businessDayCount:Number(row.businessDayCount),nursingServiceCount:Number(row.nursingServiceCount) };
  }

  private async audit(client: PoolClient, actorUserId: string, action: string, entityId: string, metadata: Record<string, unknown>): Promise<void> {
    await client.query(`INSERT INTO audit_logs (id,actor_user_id,action,entity_type,entity_id,metadata) VALUES ($1,$2,$3,'FACILITY',$4,$5::jsonb)`, [randomUUID(), actorUserId, action, entityId, JSON.stringify(metadata)]);
  }
}
