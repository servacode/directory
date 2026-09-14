import { Injectable } from '@nestjs/common';
import { AuthService } from './core/auth-service.js';
import { Argon2PasswordHasher } from './adapters/argon2-password-hasher.js';
import { JoseTokenService } from './adapters/jose-token.service.js';
import { Sha256TokenDigest } from './adapters/token-digest.js';
import { SystemClock, UuidGenerator } from './adapters/system-adapters.js';
import { PgAuthUnitOfWork } from './persistence/pg-auth.unit-of-work.js';
import { PlatformSettingsService } from '../settings/platform-settings.service.js';
import type { RegisterRequest, AuthResponseDTO } from '@health/contracts';
import type { SessionMetadata } from './core/ports.js';
import { AuthDomainError } from './core/auth-error.js';

@Injectable()
export class AuthApplicationService extends AuthService {
  constructor(
    uow: PgAuthUnitOfWork,
    passwords: Argon2PasswordHasher,
    tokens: JoseTokenService,
    digest: Sha256TokenDigest,
    ids: UuidGenerator,
    clock: SystemClock,
    private readonly settings: PlatformSettingsService,
  ) { super(uow, passwords, tokens, digest, ids, clock); }


  async loginAdmin(input: import('@health/contracts').LoginRequest, metadata: SessionMetadata = {}): Promise<AuthResponseDTO> {
    return super.login(input, metadata, 'ADMIN');
  }

  override async register(input: RegisterRequest, metadata: SessionMetadata = {}): Promise<AuthResponseDTO> {
    if (!(await this.settings.get('userRegistrationEnabled'))) throw new AuthDomainError('FEATURE_DISABLED', 'User registration is disabled.');
    return super.register(input, metadata);
  }
}
