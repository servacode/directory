export interface RateLimitRule { readonly limit: number; readonly windowMs: number; }
interface Bucket { count:number; resetAt:number; }

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string,Bucket>();
  constructor(private readonly now:()=>number = ()=>Date.now()){}
  consume(key:string,rule:RateLimitRule):{allowed:true;remaining:number;resetAt:number}|{allowed:false;retryAfterMs:number;resetAt:number}{
    const time=this.now(); const existing=this.buckets.get(key);
    const bucket=!existing||existing.resetAt<=time?{count:0,resetAt:time+rule.windowMs}:existing;
    bucket.count+=1; this.buckets.set(key,bucket);
    this.cleanup(time);
    if(bucket.count>rule.limit)return{allowed:false,retryAfterMs:Math.max(1,bucket.resetAt-time),resetAt:bucket.resetAt};
    return{allowed:true,remaining:Math.max(0,rule.limit-bucket.count),resetAt:bucket.resetAt};
  }
  private cleanup(time:number){if(this.buckets.size<5000)return;for(const [key,bucket] of this.buckets){if(bucket.resetAt<=time)this.buckets.delete(key)}}
}
