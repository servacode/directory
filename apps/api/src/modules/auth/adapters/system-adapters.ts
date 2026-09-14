import { Injectable } from '@nestjs/common';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { Clock, IdGenerator } from '../core/ports.js';
import type { SecretGenerator, VerificationCodeGenerator } from '../core/recovery-ports.js';

@Injectable()
export class SystemClock implements Clock { now(): Date { return new Date(); } }
@Injectable()
export class UuidGenerator implements IdGenerator { next(): string { return randomUUID(); } }
@Injectable()
export class SixDigitVerificationCodeGenerator implements VerificationCodeGenerator {
  generate(): string { return String(randomInt(100000, 1000000)); }
}
@Injectable()
export class RandomSecretGenerator implements SecretGenerator {
  generate(): string { return randomBytes(32).toString('base64url'); }
}
