import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CreateDutyShiftRequest, PharmacyDutyShiftDTO, QuickDutyRequest, UpdateDutyShiftRequest } from '@health/contracts';
import { DatabaseService } from '../../database/database.service.js';
import { FacilityDomainError } from '../facilities/facility-domain.error.js';
import { FacilityPermissionService } from '../facilities/facility-permission.service.js';
import { SystemTimeProvider } from '../availability/time-provider.js';
import { PlatformSettingsService } from '../settings/platform-settings.service.js';
import { dutyShiftStatus,validateDutyRange } from './duty-policy.js';
interface ShiftRow{ id:string;facilityId:string;startsAt:string;endsAt:string;cancelledAt:string|null; }
@Injectable()
export class PharmacyDutyService{
 private readonly clock=new SystemTimeProvider();
 constructor(private readonly db:DatabaseService,private readonly permissions:FacilityPermissionService,private readonly settings:PlatformSettingsService){}
 async quickDuty(userId:string,facilityId:string,input:QuickDutyRequest){const startsAt=this.clock.now().toISOString();return this.create(userId,facilityId,{startsAt,endsAt:input.endsAt},true)}
 async create(userId:string,facilityId:string,input:CreateDutyShiftRequest,allowNow=false){
  return this.db.transaction(async(client)=>{
   await this.permissions.assertOwner(client,userId,facilityId);await this.assertActivePharmacy(client,facilityId);
   const now=this.clock.now();const maxDurationHours=await this.settings.get('maxDutyShiftDurationHours');const result=validateDutyRange({startsAt:input.startsAt,endsAt:input.endsAt,now,maxDurationHours,allowStarted:allowNow});this.throwRange(result);
   const id=randomUUID();
   try{await client.query(`INSERT INTO pharmacy_duty_shifts(id,facility_id,starts_at,ends_at,created_by) VALUES($1,$2,$3,$4,$5)`,[id,facilityId,input.startsAt,input.endsAt,userId]);}
   catch(error){const pg=error as {code?:string};if(pg.code==='23P01')throw new FacilityDomainError('SHIFT_OVERLAP','Duty shift overlaps another shift.');throw error;}
   await client.query(`INSERT INTO audit_logs(id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'PHARMACY_DUTY_CREATED','FACILITY',$3,$4::jsonb)`,[randomUUID(),userId,facilityId,JSON.stringify({shiftId:id})]);
   return {id,facilityId,startsAt:input.startsAt,endsAt:input.endsAt,status:dutyShiftStatus({startsAt:input.startsAt,endsAt:input.endsAt,now})};
  });
 }
 async list(userId:string,facilityId:string):Promise<readonly PharmacyDutyShiftDTO[]>{
  await this.permissions.assertOwner(this.db,userId,facilityId);
  const now=this.clock.now();const r=await this.db.query<ShiftRow>(`SELECT id,facility_id AS "facilityId",starts_at AS "startsAt",ends_at AS "endsAt",cancelled_at AS "cancelledAt" FROM pharmacy_duty_shifts WHERE facility_id=$1 ORDER BY starts_at DESC LIMIT 100`,[facilityId]);
  return r.rows.map(x=>({...x,status:dutyShiftStatus({...x,now}),...(x.cancelledAt?{cancelledAt:x.cancelledAt}:{})}));
 }
 async update(userId:string,facilityId:string,shiftId:string,input:UpdateDutyShiftRequest){
  return this.db.transaction(async(client)=>{
   await this.permissions.assertOwner(client,userId,facilityId);await this.assertActivePharmacy(client,facilityId);
   const r=await client.query<ShiftRow>(`SELECT id,facility_id AS "facilityId",starts_at AS "startsAt",ends_at AS "endsAt",cancelled_at AS "cancelledAt" FROM pharmacy_duty_shifts WHERE id=$1 AND facility_id=$2 FOR UPDATE`,[shiftId,facilityId]);const shift=r.rows[0];
   if(!shift)throw new FacilityDomainError('SHIFT_NOT_FOUND','Duty shift not found.');if(shift.cancelledAt)throw new FacilityDomainError('SHIFT_ALREADY_CANCELLED','Duty shift already cancelled.');
   const now=this.clock.now();const status=dutyShiftStatus({...shift,now});if(status==='EXPIRED')throw new FacilityDomainError('SHIFT_ALREADY_ENDED','Duty shift already ended.');
   const startsAt=status==='ACTIVE'?shift.startsAt:(input.startsAt??shift.startsAt);const endsAt=input.endsAt;
   const maxDurationHours=await this.settings.get('maxDutyShiftDurationHours');const vr=validateDutyRange({startsAt,endsAt,now,maxDurationHours,allowStarted:status==='ACTIVE'});this.throwRange(vr);
   try{await client.query(`UPDATE pharmacy_duty_shifts SET starts_at=$3,ends_at=$4 WHERE id=$1 AND facility_id=$2`,[shiftId,facilityId,startsAt,endsAt]);}catch(error){const pg=error as {code?:string};if(pg.code==='23P01')throw new FacilityDomainError('SHIFT_OVERLAP','Duty shift overlaps another shift.');throw error;}
   return {id:shiftId,facilityId,startsAt,endsAt,status:dutyShiftStatus({startsAt,endsAt,now})};
  });
 }
 async cancel(userId:string,facilityId:string,shiftId:string,reason?:string){return this.db.transaction(async(client)=>{await this.permissions.assertOwner(client,userId,facilityId);const r=await client.query<ShiftRow>(`SELECT id,facility_id AS "facilityId",starts_at AS "startsAt",ends_at AS "endsAt",cancelled_at AS "cancelledAt" FROM pharmacy_duty_shifts WHERE id=$1 AND facility_id=$2 FOR UPDATE`,[shiftId,facilityId]);const shift=r.rows[0];if(!shift)throw new FacilityDomainError('SHIFT_NOT_FOUND','Duty shift not found.');if(shift.cancelledAt)throw new FacilityDomainError('SHIFT_ALREADY_CANCELLED','Duty shift already cancelled.');if(this.clock.now().getTime()>=Date.parse(shift.endsAt))throw new FacilityDomainError('SHIFT_ALREADY_ENDED','Duty shift already ended.');await client.query(`UPDATE pharmacy_duty_shifts SET cancelled_at=NOW(),cancellation_reason=$3 WHERE id=$1 AND facility_id=$2`,[shiftId,facilityId,reason??null]);return{ok:true as const}})}
 private async assertActivePharmacy(client:import('pg').PoolClient,facilityId:string){const r=await client.query<{specialization:string;status:string}>(`SELECT specialization,status FROM facilities WHERE id=$1 FOR UPDATE`,[facilityId]);const f=r.rows[0];if(!f)throw new FacilityDomainError('FACILITY_NOT_FOUND','Facility not found.');if(f.specialization!=='PHARMACY')throw new FacilityDomainError('FACILITY_NOT_PHARMACY','Duty is pharmacy-only.');if(f.status!=='ACTIVE')throw new FacilityDomainError('FACILITY_NOT_ACTIVE','Only active pharmacies can create duty shifts.');}
 private throwRange(result:ReturnType<typeof validateDutyRange>){if(result==='OK')return;if(result==='DURATION_TOO_LONG')throw new FacilityDomainError('SHIFT_MAX_DURATION_EXCEEDED','Duty shift exceeds maximum duration.');throw new FacilityDomainError('INVALID_SHIFT_RANGE','Invalid duty shift time range.');}
}
