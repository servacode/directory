import { Injectable } from '@nestjs/common';
import type { FacilityBusinessDayDTO } from '@health/contracts';
import { APP_TIMEZONE } from '@health/config';
import { DatabaseService } from '../../database/database.service.js';
import { evaluateAvailability } from './availability-engine.js';
import { SystemTimeProvider, type TimeProvider } from './time-provider.js';

interface DayRow { id:string; dayOfWeek:FacilityBusinessDayDTO['dayOfWeek']; isClosed:boolean; is24Hours:boolean; }
interface PeriodRow { businessDayId:string; startTime:string; endTime:string; endsNextDay:boolean; }
@Injectable()
export class FacilityAvailabilityService {
  private readonly clock:TimeProvider=new SystemTimeProvider();
  constructor(private readonly db:DatabaseService){}
  async getAvailability(facilityId:string,now=this.clock.now()){
    const facility=await this.db.query<{status:string;specialization:string}>(`SELECT status,specialization FROM facilities WHERE id=$1`,[facilityId]);
    if(facility.rows[0]?.status!=='ACTIVE') return null;
    const days=await this.db.query<DayRow>(`SELECT id,day_of_week AS "dayOfWeek",is_closed AS "isClosed",is_24_hours AS "is24Hours" FROM facility_business_days WHERE facility_id=$1`,[facilityId]);
    const periods=await this.db.query<PeriodRow>(`SELECT p.business_day_id AS "businessDayId",p.start_time::text AS "startTime",p.end_time::text AS "endTime",p.ends_next_day AS "endsNextDay" FROM business_hours_periods p JOIN facility_business_days d ON d.id=p.business_day_id WHERE d.facility_id=$1 ORDER BY p.sort_order`,[facilityId]);
    const schedule:FacilityBusinessDayDTO[]=days.rows.map((day)=>({...day,periods:periods.rows.filter((p)=>p.businessDayId===day.id).map((p)=>({startTime:p.startTime.slice(0,5),endTime:p.endTime.slice(0,5),endsNextDay:p.endsNextDay}))}));
    const closure=await this.db.query<{startsAt:string;endsAt:string}>(`SELECT starts_at AS "startsAt",ends_at AS "endsAt" FROM temporary_closures WHERE facility_id=$1 AND cancelled_at IS NULL AND starts_at <= $2 AND ends_at > $2 ORDER BY starts_at DESC LIMIT 1`,[facilityId,now.toISOString()]);
    const duty=facility.rows[0]?.specialization==='PHARMACY'?await this.db.query<{endsAt:string}>(`SELECT ends_at AS "endsAt" FROM pharmacy_duty_shifts WHERE facility_id=$1 AND cancelled_at IS NULL AND starts_at <= $2 AND ends_at > $2 ORDER BY ends_at DESC LIMIT 1`,[facilityId,now.toISOString()]):null;
    return evaluateAvailability({now,timeZone:APP_TIMEZONE,schedule,...(closure.rows[0]?{temporaryClosure:closure.rows[0]}:{}),...(duty?.rows[0]?{dutyEndsAt:duty.rows[0].endsAt}:{})});
  }
}
