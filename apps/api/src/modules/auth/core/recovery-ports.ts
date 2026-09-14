import type { Identifier, IsoDateTime } from '@health/contracts';
import type { AuthStore } from './ports.js';

export interface RecoveryChallengeRecord {
  readonly id: Identifier;
  readonly userId?: Identifier;
  readonly phone: string;
  readonly verificationCodeHash: string;
  readonly expiresAt: IsoDateTime;
  readonly verifiedAt?: IsoDateTime;
  readonly recoveryTokenHash?: string;
  readonly recoveryTokenExpiresAt?: IsoDateTime;
  readonly consumedAt?: IsoDateTime;
  readonly attempts: number;
}

export interface NewRecoveryChallenge {
  readonly id: Identifier;
  readonly userId?: Identifier;
  readonly phone: string;
  readonly verificationCodeHash: string;
  readonly expiresAt: IsoDateTime;
}

export interface RecoveryStore extends AuthStore {
  createRecoveryChallenge(challenge: NewRecoveryChallenge): Promise<void>;
  findRecoveryChallengeForUpdate(challengeId: Identifier): Promise<RecoveryChallengeRecord | null>;
  incrementRecoveryAttempts(challengeId: Identifier): Promise<void>;
  markRecoveryVerified(challengeId: Identifier, verifiedAt: IsoDateTime, tokenHash: string, tokenExpiresAt: IsoDateTime): Promise<void>;
  consumeRecoveryChallenge(challengeId: Identifier, consumedAt: IsoDateTime): Promise<void>;
}

export interface RecoveryChannel {
  sendVerificationCode(input: { phone: string; code: string }): Promise<void>;
}

export interface SecretGenerator { generate(): string; }
export interface VerificationCodeGenerator { generate(): string; }
