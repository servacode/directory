import type { AuthResponseDTO, ChangePasswordRequest, LoginRequest, RegisterRequest } from '@health/contracts';
import { AuthDomainError } from './auth-error.js';
import { assertPasswordPolicy } from './password-policy.js';
import { normalizeSyrianMobile } from './phone-normalizer.js';
import type { AuthenticatedPrincipal, AuthStore, AuthUnitOfWork, Clock, IdGenerator, PasswordHasher, SessionMetadata, TokenDigest, TokenPair, TokenService } from './ports.js';

function iso(date: Date): string { return date.toISOString(); }

export class AuthService {
  constructor(
    private readonly uow: AuthUnitOfWork,
    private readonly passwords: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly tokenDigest: TokenDigest,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async register(input: RegisterRequest, metadata: SessionMetadata = {}): Promise<AuthResponseDTO> {
    const phone = normalizeSyrianMobile(input.phone);
    assertPasswordPolicy(input.password);
    return this.uow.run(async (store) => {
      if (!(await store.isProvinceActive(input.provinceId))) throw new AuthDomainError('PROVINCE_NOT_FOUND', 'Selected province is not active.');
      if (await store.findUserByPhone(phone)) throw new AuthDomainError('PHONE_ALREADY_EXISTS', 'Phone is already registered.');
      const userId = this.ids.next();
      const sessionId = this.ids.next();
      const passwordHash = await this.passwords.hash(input.password);
      await store.createUser({ id: userId, fullName: input.fullName.trim(), phone, provinceId: input.provinceId, passwordHash });
      const pair = await this.tokens.issuePair({ userId, sessionId, systemRole: 'USER' });
      await store.createSession({ id: sessionId, userId, refreshTokenHash: this.tokenDigest.hash(pair.refreshToken), expiresAt: pair.refreshTokenExpiresAt, ...metadata });
      return this.response({ id: userId, fullName: input.fullName.trim(), phone, provinceId: input.provinceId, status: 'ACTIVE', systemRole: 'USER' }, pair);
    });
  }

  async login(input: LoginRequest, metadata: SessionMetadata = {}, requiredSystemRole?: 'USER'|'ADMIN'): Promise<AuthResponseDTO> {
    const phone = normalizeSyrianMobile(input.phone);
    return this.uow.run(async (store) => {
      const user = await store.findUserByPhone(phone);
      if (!user || !(await this.passwords.verify(user.passwordHash, input.password))) throw new AuthDomainError('INVALID_CREDENTIALS', 'Invalid credentials.');
      this.assertActive(user.status);
      if (requiredSystemRole && user.systemRole !== requiredSystemRole) throw new AuthDomainError('UNAUTHORIZED','Invalid credentials.');
      const sessionId = this.ids.next();
      const pair = await this.tokens.issuePair({ userId: user.id, sessionId, systemRole: user.systemRole });
      await store.createSession({ id: sessionId, userId: user.id, refreshTokenHash: this.tokenDigest.hash(pair.refreshToken), expiresAt: pair.refreshTokenExpiresAt, ...metadata });
      await store.updateLastLogin(user.id, iso(this.clock.now()));
      return this.response(user, pair);
    });
  }

  async refresh(rawRefreshToken: string): Promise<AuthResponseDTO> {
    let claims;
    try { claims = await this.tokens.verifyRefreshToken(rawRefreshToken); }
    catch { throw new AuthDomainError('INVALID_REFRESH_TOKEN', 'Invalid refresh token.'); }
    return this.uow.run(async (store) => {
      const session = await store.findSessionForUpdate(claims.sessionId);
      const now = this.clock.now();
      if (!session || session.userId !== claims.userId || session.revokedAt || Date.parse(session.expiresAt) <= now.getTime()) {
        throw new AuthDomainError('SESSION_REVOKED', 'Session is not active.');
      }
      if (!this.tokenDigest.equals(session.refreshTokenHash, rawRefreshToken)) {
        await store.revokeSession(session.id, iso(now));
        throw new AuthDomainError('INVALID_REFRESH_TOKEN', 'Refresh token reuse detected.');
      }
      const user = await store.findUserById(session.userId);
      if (!user) throw new AuthDomainError('UNAUTHORIZED', 'User not found.');
      this.assertActive(user.status);
      const pair = await this.tokens.issuePair({ userId: user.id, sessionId: session.id, systemRole: user.systemRole });
      await store.rotateSession(session.id, this.tokenDigest.hash(pair.refreshToken), pair.refreshTokenExpiresAt, iso(now));
      return this.response(user, pair);
    });
  }


  async authenticateAccessToken(rawAccessToken: string): Promise<AuthenticatedPrincipal> {
    let claims: AuthenticatedPrincipal;
    try { claims = await this.tokens.verifyAccessToken(rawAccessToken); }
    catch { throw new AuthDomainError('UNAUTHORIZED', 'Invalid access token.'); }
    return this.uow.run(async (store) => {
      const session = await store.findSession(claims.sessionId);
      if (!session || session.userId !== claims.userId || session.revokedAt || Date.parse(session.expiresAt) <= this.clock.now().getTime()) {
        throw new AuthDomainError('SESSION_REVOKED', 'Session is not active.');
      }
      const user = await store.findUserById(claims.userId);
      if (!user) throw new AuthDomainError('UNAUTHORIZED', 'User not found.');
      this.assertActive(user.status);
      return { userId: user.id, sessionId: session.id, systemRole: user.systemRole };
    });
  }

  async logout(sessionId: string): Promise<void> {
    await this.uow.run((store) => store.revokeSession(sessionId, iso(this.clock.now())));
  }

  async logoutAll(userId: string): Promise<void> {
    await this.uow.run((store) => store.revokeAllUserSessions(userId, iso(this.clock.now())));
  }

  async changePassword(userId: string, currentSessionId: string, input: ChangePasswordRequest): Promise<TokenPair> {
    assertPasswordPolicy(input.newPassword);
    return this.uow.run(async (store) => {
      const user = await store.findUserById(userId);
      if (!user || !(await this.passwords.verify(user.passwordHash, input.currentPassword))) throw new AuthDomainError('INVALID_CREDENTIALS', 'Current password is incorrect.');
      this.assertActive(user.status);
      const session = await store.findSessionForUpdate(currentSessionId);
      if (!session || session.userId !== userId || session.revokedAt) throw new AuthDomainError('SESSION_REVOKED', 'Current session is not active.');
      const passwordHash = await this.passwords.hash(input.newPassword);
      await store.updatePassword(userId, passwordHash);
      await store.revokeAllUserSessions(userId, iso(this.clock.now()), currentSessionId);
      const pair = await this.tokens.issuePair({ userId, sessionId: currentSessionId, systemRole: user.systemRole });
      await store.rotateSession(currentSessionId, this.tokenDigest.hash(pair.refreshToken), pair.refreshTokenExpiresAt, iso(this.clock.now()));
      return pair;
    });
  }

  private assertActive(status: string): void {
    if (status === 'BLOCKED') throw new AuthDomainError('USER_BLOCKED', 'User is blocked.');
  }

  private response(user: { id: string; fullName: string; phone: string; provinceId: string; status: 'ACTIVE' | 'BLOCKED'; systemRole: 'USER' | 'ADMIN'; profileImageKey?: string }, tokens: TokenPair): AuthResponseDTO {
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        provinceId: user.provinceId,
        status: user.status,
        systemRole: user.systemRole,
      },
      tokens,
    };
  }
}
