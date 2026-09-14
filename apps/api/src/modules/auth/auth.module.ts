import { Module } from '@nestjs/common';
import { Argon2PasswordHasher } from './adapters/argon2-password-hasher.js';
import { JoseTokenService } from './adapters/jose-token.service.js';
import { RandomSecretGenerator, SixDigitVerificationCodeGenerator, SystemClock, UuidGenerator } from './adapters/system-adapters.js';
import { Sha256TokenDigest } from './adapters/token-digest.js';
import { HmacOtpDigest } from './adapters/hmac-otp-digest.js';
import { WhatsAppRecoveryChannel } from './adapters/whatsapp-recovery.channel.js';
import { AuthApplicationService } from './auth-application.service.js';
import { PasswordRecoveryApplicationService } from './password-recovery-application.service.js';
import { AccessTokenGuard } from './http/access-token.guard.js';
import { AuthController } from './http/auth.controller.js';
import { RoleGuard } from './http/roles.js';
import { UsersController } from './http/users.controller.js';
import { PgAuthUnitOfWork } from './persistence/pg-auth.unit-of-work.js';
import { UserAccountApplicationService } from './user-account-application.service.js';
import { SecurityThrottleService } from '../../security/security-throttle.service.js';

@Module({
  controllers: [AuthController, UsersController],
  providers: [
    PgAuthUnitOfWork,
    Argon2PasswordHasher,
    JoseTokenService,
    Sha256TokenDigest,
    HmacOtpDigest,
    SystemClock,
    UuidGenerator,
    SixDigitVerificationCodeGenerator,
    RandomSecretGenerator,
    WhatsAppRecoveryChannel,
    AuthApplicationService,
    PasswordRecoveryApplicationService,
    UserAccountApplicationService,
    AccessTokenGuard,
    RoleGuard,
    SecurityThrottleService,
  ],
  exports: [AuthApplicationService, AccessTokenGuard, RoleGuard],
})
export class AuthModule {}
