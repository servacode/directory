import type { AvailabilityDTO, DayOfWeek, FacilityBusinessDayDTO, IsoDateTime } from '@health/contracts';
import { addLocalDays, timeToMinutes, zonedLocalToUtc, zonedParts } from './time-zone.js';

const WEEK: readonly DayOfWeek[]=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
export interface TemporaryClosureWindow { startsAt: IsoDateTime; endsAt: IsoDateTime; }

export function evaluateAvailability(input:{now:Date;timeZone:string;schedule:readonly FacilityBusinessDayDTO[];temporaryClosure?:TemporaryClosureWindow;dutyEndsAt?:IsoDateTime}):AvailabilityDTO {
  const nowMs=input.now.getTime();
  if(input.temporaryClosure && Date.parse(input.temporaryClosure.startsAt)<=nowMs && nowMs<Date.parse(input.temporaryClosure.endsAt)){
    return {status:'TEMPORARILY_CLOSED',temporaryCloseEndsAt:input.temporaryClosure.endsAt,labelKey:'facility.status.temporarily_closed'};
  }
  if(input.dutyEndsAt && nowMs<Date.parse(input.dutyEndsAt)){
    return {status:'DUTY_NOW',dutyEndsAt:input.dutyEndsAt,labelKey:'facility.status.duty_now'};
  }
  if(isOpenAt(input.now,input.timeZone,input.schedule)) return {status:'OPEN_NOW',labelKey:'facility.status.open_now'};
  const nextOpen=nextOpeningAfter(input.now,input.timeZone,input.schedule);
  return {status:'CLOSED_NOW',...(nextOpen?{nextOpenAt:nextOpen.toISOString()}:{}),labelKey:'facility.status.closed_now'};
}

export function isOpenAt(now:Date,timeZone:string,schedule:readonly FacilityBusinessDayDTO[]):boolean {
  const local=zonedParts(now,timeZone);
  const currentMinutes=local.hour*60+local.minute;
  const current=getDay(schedule,local.weekday as DayOfWeek);
  if(current?.is24Hours) return true;
  if(current && !current.isClosed){
    for(const p of current.periods){
      const start=timeToMinutes(p.startTime), end=timeToMinutes(p.endTime);
      if(!p.endsNextDay && currentMinutes>=start && currentMinutes<end) return true;
      if(p.endsNextDay && currentMinutes>=start) return true;
    }
  }
  const index=WEEK.indexOf(local.weekday as DayOfWeek);
  const previous=getDay(schedule,WEEK[(index+6)%7]!);
  if(previous && !previous.isClosed){
    for(const p of previous.periods){
      if(p.endsNextDay && currentMinutes<timeToMinutes(p.endTime)) return true;
    }
  }
  return false;
}

export function nextOpeningAfter(now:Date,timeZone:string,schedule:readonly FacilityBusinessDayDTO[]):Date|undefined {
  const local=zonedParts(now,timeZone);
  const currentIndex=WEEK.indexOf(local.weekday as DayOfWeek);
  const currentMinutes=local.hour*60+local.minute;
  for(let offset=0;offset<=7;offset++){
    const dayName=WEEK[(currentIndex+offset)%7]!;
    const day=getDay(schedule,dayName);
    if(!day || day.isClosed) continue;
    const date=addLocalDays(local,offset);
    if(day.is24Hours){
      if(offset>0) return zonedLocalToUtc({...date,hour:0,minute:0},timeZone);
      continue;
    }
    const starts=day.periods.map((p)=>timeToMinutes(p.startTime)).sort((a,b)=>a-b);
    for(const start of starts){
      if(offset===0 && start<=currentMinutes) continue;
      const hour=Math.floor(start/60), minute=start%60;
      const candidate=zonedLocalToUtc({...date,hour,minute},timeZone);
      if(candidate.getTime()>now.getTime()) return candidate;
    }
  }
  return undefined;
}

function getDay(schedule:readonly FacilityBusinessDayDTO[],day:DayOfWeek){return schedule.find((item)=>item.dayOfWeek===day);}
