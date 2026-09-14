import type { PoolClient } from 'pg';
import { AuthDomainError } from '../core/auth-error.js';
import type {
  AuthSessionRecord,
  AuthStore,
  AuthUserRecord,
  NewSessionRecord,
  NewUserRecord,
} from '../core/ports.js';
import type {
  NewRecoveryChallenge,
  RecoveryChallengeRecord,
  RecoveryStore,
} from '../core/recovery-ports.js';

export class PgAuthStore implements AuthStore, RecoveryStore {
  constructor(private readonly client: PoolClient) {}

  async isProvinceActive(provinceId: string): Promise<boolean> {
    const result = await this.client.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM provinces WHERE id = $1 AND is_active = TRUE) AS exists', [provinceId],
    );
    return result.rows[0]?.exists === true;
  }

  async findUserByPhone(phone: string): Promise<AuthUserRecord | null> {
    return this.findUser('phone = $1', phone);
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    return this.findUser('id = $1', userId);
  }

  private async findUser(where: string, value: string): Promise<AuthUserRecord | null> {
    const result = await this.client.query<AuthUserRecord>(
      `SELECT id, full_name AS "fullName", phone, province_id AS "provinceId", password_hash AS "passwordHash",
              status, system_role AS "systemRole", profile_image_key AS "profileImageKey", created_at AS "createdAt"
         FROM users WHERE ${where} AND deleted_at IS NULL LIMIT 1`, [value],
    );
    return result.rows[0] ?? null;
  }

  async createUser(user: NewUserRecord): Promise<void> {
    try {
      await this.client.query(
        `INSERT INTO users (id, full_name, phone, password_hash, province_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, user.fullName, user.phone, user.passwordHash, user.provinceId],
      );
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === '23505' && pgError.constraint === 'users_phone_key') {
        throw new AuthDomainError('PHONE_ALREADY_EXISTS', 'Phone is already registered.');
      }
      throw error;
    }
  }

  async updateLastLogin(userId: string, at: string): Promise<void> {
    await this.client.query('UPDATE users SET last_login_at = $2 WHERE id = $1', [userId, at]);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.client.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
  }

  async updateFullName(userId: string, fullName: string): Promise<void> {
    await this.client.query('UPDATE users SET full_name = $2 WHERE id = $1', [userId, fullName]);
  }

  async createSession(session: NewSessionRecord): Promise<void> {
    await this.client.query(
      `INSERT INTO user_sessions
         (id, user_id, refresh_token_hash, device_name, device_platform, app_version, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [session.id, session.userId, session.refreshTokenHash, session.deviceName ?? null, session.devicePlatform ?? null, session.appVersion ?? null, session.expiresAt],
    );
  }

  async findSession(sessionId: string): Promise<AuthSessionRecord | null> {
    return this.selectSession(sessionId, false);
  }

  async findSessionForUpdate(sessionId: string): Promise<AuthSessionRecord | null> {
    return this.selectSession(sessionId, true);
  }

  private async selectSession(sessionId: string, lock: boolean): Promise<AuthSessionRecord | null> {
    const result = await this.client.query<AuthSessionRecord>(
      `SELECT id, user_id AS "userId", refresh_token_hash AS "refreshTokenHash",
              expires_at AS "expiresAt", revoked_at AS "revokedAt"
         FROM user_sessions WHERE id = $1${lock ? ' FOR UPDATE' : ''}`,
      [sessionId],
    );
    return result.rows[0] ?? null;
  }

  async rotateSession(sessionId: string, refreshTokenHash: string, expiresAt: string, at: string): Promise<void> {
    await this.client.query(
      `UPDATE user_sessions
          SET refresh_token_hash = $2, expires_at = $3, last_used_at = $4
        WHERE id = $1 AND revoked_at IS NULL`,
      [sessionId, refreshTokenHash, expiresAt, at],
    );
  }

  async revokeSession(sessionId: string, at: string): Promise<void> {
    await this.client.query(
      'UPDATE user_sessions SET revoked_at = COALESCE(revoked_at, $2) WHERE id = $1', [sessionId, at],
    );
  }

  async revokeAllUserSessions(userId: string, at: string, exceptSessionId?: string): Promise<void> {
    if (exceptSessionId) {
      await this.client.query(
        `UPDATE user_sessions SET revoked_at = COALESCE(revoked_at, $2)
          WHERE user_id = $1 AND id <> $3 AND revoked_at IS NULL`, [userId, at, exceptSessionId],
      );
      return;
    }
    await this.client.query(
      'UPDATE user_sessions SET revoked_at = COALESCE(revoked_at, $2) WHERE user_id = $1 AND revoked_at IS NULL', [userId, at],
    );
  }

  async createRecoveryChallenge(challenge: NewRecoveryChallenge): Promise<void> {
    await this.client.query(
      `INSERT INTO password_recovery_challenges
         (id, user_id, phone, verification_code_hash, expires_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [challenge.id, challenge.userId ?? null, challenge.phone, challenge.verificationCodeHash, challenge.expiresAt],
    );
  }

  async findRecoveryChallengeForUpdate(challengeId: string): Promise<RecoveryChallengeRecord | null> {
    const result = await this.client.query<RecoveryChallengeRecord>(
      `SELECT id, user_id AS "userId", phone, verification_code_hash AS "verificationCodeHash",
              expires_at AS "expiresAt", verified_at AS "verifiedAt", recovery_token_hash AS "recoveryTokenHash",
              recovery_token_expires_at AS "recoveryTokenExpiresAt", consumed_at AS "consumedAt", attempts
         FROM password_recovery_challenges WHERE id = $1 FOR UPDATE`, [challengeId],
    );
    return result.rows[0] ?? null;
  }

  async incrementRecoveryAttempts(challengeId: string): Promise<void> {
    await this.client.query('UPDATE password_recovery_challenges SET attempts = attempts + 1 WHERE id = $1', [challengeId]);
  }

  async markRecoveryVerified(challengeId: string, verifiedAt: string, tokenHash: string, tokenExpiresAt: string): Promise<void> {
    await this.client.query(
      `UPDATE password_recovery_challenges
          SET verified_at = $2, recovery_token_hash = $3, recovery_token_expires_at = $4
        WHERE id = $1`, [challengeId, verifiedAt, tokenHash, tokenExpiresAt],
    );
  }

  async consumeRecoveryChallenge(challengeId: string, consumedAt: string): Promise<void> {
    await this.client.query('UPDATE password_recovery_challenges SET consumed_at = $2 WHERE id = $1', [challengeId, consumedAt]);
  }
}
