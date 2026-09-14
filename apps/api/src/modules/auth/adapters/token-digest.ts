import { Injectable } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { TokenDigest } from '../core/ports.js';

@Injectable()
export class Sha256TokenDigest implements TokenDigest {
  hash(rawToken: string): string { return createHash('sha256').update(rawToken, 'utf8').digest('hex'); }
  equals(storedHash: string, rawToken: string): boolean {
    const candidate = this.hash(rawToken);
    if (storedHash.length !== candidate.length) return false;
    return timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(candidate, 'hex'));
  }
}
