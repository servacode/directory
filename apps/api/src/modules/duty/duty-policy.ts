import type { DutyShiftStatus } from '@health/contracts';
export function dutyShiftStatus(input:{startsAt:string;endsAt:string;cancelledAt?:string|null;now:Date}):DutyShiftStatus {
 if(input.cancelledAt) return 'CANCELLED';
 const now=input.now.getTime(),start=Date.parse(input.startsAt),end=Date.parse(input.endsAt);
 if(now<start)return 'SCHEDULED';
 if(now>=end)return 'EXPIRED';
 return 'ACTIVE';
}
export function validateDutyRange(input:{startsAt:string;endsAt:string;now:Date;maxDurationHours:number;allowStarted?:boolean}):'OK'|'START_IN_PAST'|'END_NOT_AFTER_START'|'DURATION_TOO_LONG' {
 const start=Date.parse(input.startsAt),end=Date.parse(input.endsAt),now=input.now.getTime();
 if(end<=start)return 'END_NOT_AFTER_START';
 if(!input.allowStarted && start<now)return 'START_IN_PAST';
 if(end-start>input.maxDurationHours*60*60*1000)return 'DURATION_TOO_LONG';
 return 'OK';
}
