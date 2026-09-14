import { AuthDomainError } from './auth-error.js';
import { assertPasswordPolicy } from './password-policy.js';
import { normalizeSyrianMobile } from './phone-normalizer.js';
import type { AuthUnitOfWork, Clock, IdGenerator, PasswordHasher, TokenDigest } from './ports.js';
import type { RecoveryChannel, RecoveryStore, SecretGenerator, VerificationCodeGenerator } from './recovery-ports.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const RECOVERY_TOKEN_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export class PasswordRecoveryService {
  constructor(
    private readonly uow: AuthUnitOfWork,
    private readonly passwords: PasswordHasher,
    private readonly codeDigest: TokenDigest,
    private readonly tokenDigest: TokenDigest,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly codes: VerificationCodeGenerator,
    private readonly secrets: SecretGenerator,
    private readonly channel: RecoveryChannel,
  ) {}

  async start(phoneInput: string): Promise<{ challengeId: string }> {
    const phone = normalizeSyrianMobile(phoneInput);
    const challengeId = this.ids.next();
    const code = this.codes.generate();
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + CODE_TTL_MS).toISOString();
    const user = await this.uow.run((store) => store.findUserByPhone(phone));
    await this.uow.run(async (store) => {
      const recovery = store as RecoveryStore;
      await recovery.createRecoveryChallenge({
        id: challengeId,
        ...(user ? { userId: user.id } : {}),
        phone,
        verificationCodeHash: this.codeDigest.hash(code),
        expiresAt,
      });
    });
    // Preserve account privacy: the API returns the same shape whether the account exists or not.
    if (user) void this.channel.sendVerificationCode({ phone, code }).catch(()=>undefined);
    return { challengeId };
  }

  async verify(challengeId: string, code: string): Promise<{ recoveryToken: string }> {
    return this.uow.run(async (store) => {
      const recovery = store as RecoveryStore;
      const challenge = await recovery.findRecoveryChallengeForUpdate(challengeId);
      const now = this.clock.now();
      if (!challenge || challenge.consumedAt || Date.parse(challenge.expiresAt) <= now.getTime()) throw new AuthDomainError('UNAUTHORIZED', 'Recovery challenge is invalid or expired.');
      if (challenge.attempts >= MAX_ATTEMPTS) throw new AuthDomainError('RATE_LIMIT_EXCEEDED', 'Too many verification attempts.');
      if (!this.codeDigest.equals(challenge.verificationCodeHash, code)) {
        await recovery.incrementRecoveryAttempts(challengeId);
        throw new AuthDomainError('UNAUTHORIZED', 'Verification code is invalid.');
      }
      if (!challenge.userId) throw new AuthDomainError('UNAUTHORIZED', 'Recovery challenge is invalid.');
      const recoveryToken = this.secrets.generate();
      const tokenExpiresAt = new Date(now.getTime() + RECOVERY_TOKEN_TTL_MS).toISOString();
      await recovery.markRecoveryVerified(challengeId, now.toISOString(), this.tokenDigest.hash(recoveryToken), tokenExpiresAt);
      return { recoveryToken };
    });
  }

  async complete(challengeId: string, recoveryToken: string, newPassword: string): Promise<void> {
    assertPasswordPolicy(newPassword);
    await this.uow.run(async (store) => {
      const recovery = store as RecoveryStore;
      const challenge = await recovery.findRecoveryChallengeForUpdate(challengeId);
      const now = this.clock.now();
      if (!challenge?.userId || challenge.consumedAt || !challenge.verifiedAt || !challenge.recoveryTokenHash || !challenge.recoveryTokenExpiresAt) throw new AuthDomainError('UNAUTHORIZED', 'Recovery is not verified.');
      if (Date.parse(challenge.recoveryTokenExpiresAt) <= now.getTime() || !this.tokenDigest.equals(challenge.recoveryTokenHash, recoveryToken)) throw new AuthDomainError('UNAUTHORIZED', 'Recovery token is invalid or expired.');
      const passwordHash = await this.passwords.hash(newPassword);
      await recovery.updatePassword(challenge.userId, passwordHash);
      await recovery.revokeAllUserSessions(challenge.userId, now.toISOString());
      await recovery.consumeRecoveryChallenge(challengeId, now.toISOString());
    });
  }
}
