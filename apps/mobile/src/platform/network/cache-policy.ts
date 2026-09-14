export type CacheDomain='REFERENCE'|'FACILITY_DETAIL'|'PUBLIC_LIST'|'AVAILABILITY'|'DUTY';
export interface CachePolicy{readonly staleAfterMs:number;readonly usableOfflineForMs:number;readonly requiresFreshnessWarning:boolean;}
export const CACHE_POLICIES:Readonly<Record<CacheDomain,CachePolicy>>={
 REFERENCE:{staleAfterMs:6*60*60_000,usableOfflineForMs:7*24*60*60_000,requiresFreshnessWarning:false},
 FACILITY_DETAIL:{staleAfterMs:5*60_000,usableOfflineForMs:24*60*60_000,requiresFreshnessWarning:false},
 PUBLIC_LIST:{staleAfterMs:2*60_000,usableOfflineForMs:12*60*60_000,requiresFreshnessWarning:false},
 AVAILABILITY:{staleAfterMs:60_000,usableOfflineForMs:15*60_000,requiresFreshnessWarning:true},
 DUTY:{staleAfterMs:30_000,usableOfflineForMs:5*60_000,requiresFreshnessWarning:true},
};
export function cacheState(domain:CacheDomain,capturedAtMs:number,nowMs=Date.now()):'FRESH'|'STALE_USABLE'|'EXPIRED'{const age=Math.max(0,nowMs-capturedAtMs),p=CACHE_POLICIES[domain];if(age<=p.staleAfterMs)return'FRESH';if(age<=p.usableOfflineForMs)return'STALE_USABLE';return'EXPIRED'}
