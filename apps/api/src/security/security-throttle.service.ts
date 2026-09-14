import { Injectable } from '@nestjs/common';
import { AuthDomainError } from '../modules/auth/core/auth-error.js';
import { FixedWindowRateLimiter, type RateLimitRule } from './fixed-window-rate-limiter.js';

@Injectable()
export class SecurityThrottleService {
  private readonly limiter=new FixedWindowRateLimiter();
  assert(scope:string,subject:string,rule:RateLimitRule):void{
    const result=this.limiter.consume(`${scope}:${subject}`,rule);
    if(!result.allowed)throw new AuthDomainError('RATE_LIMIT_EXCEEDED','Too many requests.');
  }
}
