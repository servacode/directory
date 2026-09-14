import { Injectable } from '@nestjs/common';
import { PasswordRecoveryService } from './core/password-recovery.service.js';
import { Argon2PasswordHasher } from './adapters/argon2-password-hasher.js';
import { Sha256TokenDigest } from './adapters/token-digest.js';
import { HmacOtpDigest } from './adapters/hmac-otp-digest.js';
import { RandomSecretGenerator, SixDigitVerificationCodeGenerator, SystemClock, UuidGenerator } from './adapters/system-adapters.js';
import { WhatsAppRecoveryChannel } from './adapters/whatsapp-recovery.channel.js';
import { PgAuthUnitOfWork } from './persistence/pg-auth.unit-of-work.js';

@Injectable()
export class PasswordRecoveryApplicationService extends PasswordRecoveryService {
  constructor(
    uow: PgAuthUnitOfWork,
    passwords: Argon2PasswordHasher,
    codeDigest: HmacOtpDigest,
    tokenDigest: Sha256TokenDigest,
    ids: UuidGenerator,
    clock: SystemClock,
    codes: SixDigitVerificationCodeGenerator,
    secrets: RandomSecretGenerator,
    channel: WhatsAppRecoveryChannel,
  ) { super(uow, passwords, codeDigest, tokenDigest, ids, clock, codes, secrets, channel); }
}
