import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TokenDigest } from '../core/ports.js';

@Injectable()
export class HmacOtpDigest implements TokenDigest {
  private readonly secret: Buffer;
  constructor(config:ConfigService){
    const value=config.get<string>('OTP_HMAC_SECRET');
    if(!value||value.length<32)throw new Error('OTP_HMAC_SECRET must contain at least 32 characters');
    this.secret=Buffer.from(value,'utf8');
  }
  hash(rawToken:string):string{return createHmac('sha256',this.secret).update(rawToken,'utf8').digest('hex')}
  equals(storedHash:string,rawToken:string):boolean{const candidate=this.hash(rawToken);if(storedHash.length!==candidate.length)return false;return timingSafeEqual(Buffer.from(storedHash,'hex'),Buffer.from(candidate,'hex'))}
}
