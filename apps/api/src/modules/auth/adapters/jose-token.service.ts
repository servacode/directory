import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import type { AuthenticatedPrincipal, TokenPair, TokenService, VerifiedRefreshToken } from '../core/ports.js';

const ISSUER = 'health-directory-api';
const AUDIENCE = 'health-directory-clients';

@Injectable()
export class JoseTokenService implements TokenService {
  private readonly accessSecret: Uint8Array;
  private readonly refreshSecret: Uint8Array;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(config: ConfigService) {
    const accessSecret = config.get<string>('ACCESS_TOKEN_SECRET');
    const refreshSecret = config.get<string>('REFRESH_TOKEN_SECRET');
    if (!accessSecret || accessSecret.length < 32) throw new Error('ACCESS_TOKEN_SECRET must contain at least 32 characters');
    if (!refreshSecret || refreshSecret.length < 32) throw new Error('REFRESH_TOKEN_SECRET must contain at least 32 characters');
    this.accessSecret = new TextEncoder().encode(accessSecret);
    this.refreshSecret = new TextEncoder().encode(refreshSecret);
    this.accessTtlSeconds = Number(config.get('ACCESS_TOKEN_TTL_SECONDS') ?? 900);
    this.refreshTtlSeconds = Number(config.get('REFRESH_TOKEN_TTL_SECONDS') ?? 2592000);
  }

  async issuePair(input: { userId: string; sessionId: string; systemRole: 'USER' | 'ADMIN' }): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);
    const accessExp = now + this.accessTtlSeconds;
    const refreshExp = now + this.refreshTtlSeconds;
    const common = { sid: input.sessionId };
    const accessToken = await new SignJWT({ ...common, typ: 'access', role: input.systemRole })
      .setProtectedHeader({ alg: 'HS256' }).setSubject(input.userId).setIssuer(ISSUER).setAudience(AUDIENCE)
      .setIssuedAt(now).setExpirationTime(accessExp).sign(this.accessSecret);
    const refreshToken = await new SignJWT({ ...common, typ: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' }).setSubject(input.userId).setIssuer(ISSUER).setAudience(AUDIENCE)
      .setIssuedAt(now).setExpirationTime(refreshExp).sign(this.refreshSecret);
    return {
      accessToken,
      accessTokenExpiresAt: new Date(accessExp * 1000).toISOString(),
      refreshToken,
      refreshTokenExpiresAt: new Date(refreshExp * 1000).toISOString(),
    };
  }

  async verifyRefreshToken(rawToken: string): Promise<VerifiedRefreshToken> {
    const { payload } = await jwtVerify(rawToken, this.refreshSecret, { issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'] });
    if (payload.typ !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') throw new Error('Invalid refresh claims');
    return { userId: payload.sub, sessionId: payload.sid };
  }

  async verifyAccessToken(rawToken: string): Promise<AuthenticatedPrincipal> {
    const { payload } = await jwtVerify(rawToken, this.accessSecret, { issuer: ISSUER, audience: AUDIENCE, algorithms: ['HS256'] });
    if (payload.typ !== 'access' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') throw new Error('Invalid access claims');
    if (payload.role !== 'USER' && payload.role !== 'ADMIN') throw new Error('Invalid role claim');
    return { userId: payload.sub, sessionId: payload.sid, systemRole: payload.role };
  }
}
