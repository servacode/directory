import type { Identifier, IsoDateTime, SystemRole, UserStatus } from '@health/contracts';

export interface AuthUserRecord {
  readonly id: Identifier;
  readonly fullName: string;
  readonly phone: string;
  readonly provinceId: Identifier;
  readonly passwordHash: string;
  readonly status: UserStatus;
  readonly systemRole: SystemRole;
  readonly profileImageKey?: string;
  readonly createdAt: IsoDateTime;
}

export interface AuthSessionRecord {
  readonly id: Identifier;
  readonly userId: Identifier;
  readonly refreshTokenHash: string;
  readonly expiresAt: IsoDateTime;
  readonly revokedAt?: IsoDateTime;
}

export interface NewUserRecord {
  readonly id: Identifier;
  readonly fullName: string;
  readonly phone: string;
  readonly provinceId: Identifier;
  readonly passwordHash: string;
}

export interface NewSessionRecord {
  readonly id: Identifier;
  readonly userId: Identifier;
  readonly refreshTokenHash: string;
  readonly expiresAt: IsoDateTime;
  readonly deviceName?: string;
  readonly devicePlatform?: string;
  readonly appVersion?: string;
}

export interface SessionMetadata {
  readonly deviceName?: string;
  readonly devicePlatform?: string;
  readonly appVersion?: string;
}

export interface AuthStore {
  isProvinceActive(provinceId: Identifier): Promise<boolean>;
  findUserByPhone(phone: string): Promise<AuthUserRecord | null>;
  findUserById(userId: Identifier): Promise<AuthUserRecord | null>;
  createUser(user: NewUserRecord): Promise<void>;
  updateLastLogin(userId: Identifier, at: IsoDateTime): Promise<void>;
  updatePassword(userId: Identifier, passwordHash: string): Promise<void>;
  updateFullName(userId: Identifier, fullName: string): Promise<void>;
  createSession(session: NewSessionRecord): Promise<void>;
  findSession(sessionId: Identifier): Promise<AuthSessionRecord | null>;
  findSessionForUpdate(sessionId: Identifier): Promise<AuthSessionRecord | null>;
  rotateSession(sessionId: Identifier, refreshTokenHash: string, expiresAt: IsoDateTime, at: IsoDateTime): Promise<void>;
  revokeSession(sessionId: Identifier, at: IsoDateTime): Promise<void>;
  revokeAllUserSessions(userId: Identifier, at: IsoDateTime, exceptSessionId?: Identifier): Promise<void>;
}

export interface AuthUnitOfWork {
  run<T>(work: (store: AuthStore) => Promise<T>): Promise<T>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

export interface TokenDigest {
  hash(rawToken: string): string;
  equals(storedHash: string, rawToken: string): boolean;
}

export interface TokenPair {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: IsoDateTime;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: IsoDateTime;
}

export interface AuthenticatedPrincipal {
  readonly userId: Identifier;
  readonly sessionId: Identifier;
  readonly systemRole: SystemRole;
}

export interface VerifiedRefreshToken {
  readonly userId: Identifier;
  readonly sessionId: Identifier;
}

export interface TokenService {
  issuePair(input: { userId: Identifier; sessionId: Identifier; systemRole: SystemRole }): Promise<TokenPair>;
  verifyRefreshToken(rawToken: string): Promise<VerifiedRefreshToken>;
  verifyAccessToken(rawToken: string): Promise<AuthenticatedPrincipal>;
}

export interface IdGenerator { next(): Identifier; }
export interface Clock { now(): Date; }
