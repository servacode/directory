export interface LocalDateParts { year: number; month: number; day: number; hour: number; minute: number; weekday: string; }

const weekdayMap: Record<string, string> = { Mon:'MONDAY', Tue:'TUESDAY', Wed:'WEDNESDAY', Thu:'THURSDAY', Fri:'FRIDAY', Sat:'SATURDAY', Sun:'SUNDAY' };

export function zonedParts(date: Date, timeZone: string): LocalDateParts {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23', weekday:'short' }).formatToParts(date);
  const get=(type:string)=>parts.find((p)=>p.type===type)?.value ?? '';
  return { year:Number(get('year')), month:Number(get('month')), day:Number(get('day')), hour:Number(get('hour')), minute:Number(get('minute')), weekday:weekdayMap[get('weekday')] ?? 'MONDAY' };
}

export function addLocalDays(input: Pick<LocalDateParts,'year'|'month'|'day'>, days: number) {
  const d=new Date(Date.UTC(input.year,input.month-1,input.day+days));
  return { year:d.getUTCFullYear(), month:d.getUTCMonth()+1, day:d.getUTCDate() };
}

export function zonedLocalToUtc(input:{year:number;month:number;day:number;hour:number;minute:number},timeZone:string):Date {
  let guess=Date.UTC(input.year,input.month-1,input.day,input.hour,input.minute,0,0);
  for(let i=0;i<4;i++){
    const represented=zonedParts(new Date(guess),timeZone);
    const representedAsUtc=Date.UTC(represented.year,represented.month-1,represented.day,represented.hour,represented.minute,0,0);
    const desiredAsUtc=Date.UTC(input.year,input.month-1,input.day,input.hour,input.minute,0,0);
    const correction=desiredAsUtc-representedAsUtc;
    if(correction===0) break;
    guess+=correction;
  }
  return new Date(guess);
}

export function timeToMinutes(value:string):number { const [h,m]=value.split(':').map(Number); return (h ?? 0)*60+(m ?? 0); }
