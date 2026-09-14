import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../../../../.tmp-auth-core/apps/api/src/modules/auth/core/auth-service.js';
import { AuthDomainError } from '../../../../.tmp-auth-core/apps/api/src/modules/auth/core/auth-error.js';
import { normalizeSyrianMobile } from '../../../../.tmp-auth-core/apps/api/src/modules/auth/core/phone-normalizer.js';

class Store {
  constructor() {
    this.users = new Map(); this.sessions = new Map(); this.activeProvinces = new Set(['22222222-2222-4222-8222-222222222222']);
  }
  async isProvinceActive(id) { return this.activeProvinces.has(id); }
  async findUserByPhone(phone) { return [...this.users.values()].find((u) => u.phone === phone) ?? null; }
  async findUserById(id) { return this.users.get(id) ?? null; }
  async createUser(user) { this.users.set(user.id, { ...user, status: 'ACTIVE', systemRole: 'USER' }); }
  async updateLastLogin() {}
  async updatePassword(id, passwordHash) { this.users.set(id, { ...this.users.get(id), passwordHash }); }
  async createSession(session) { this.sessions.set(session.id, { ...session }); }
  async findSession(id) { return this.sessions.get(id) ?? null; }
  async findSessionForUpdate(id) { return this.sessions.get(id) ?? null; }
  async rotateSession(id, refreshTokenHash, expiresAt) { this.sessions.set(id, { ...this.sessions.get(id), refreshTokenHash, expiresAt }); }
  async revokeSession(id, at) { const s=this.sessions.get(id); if (s) this.sessions.set(id,{...s,revokedAt:at}); }
  async revokeAllUserSessions(userId, at, except) { for (const [id,s] of this.sessions) if (s.userId===userId && id!==except) this.sessions.set(id,{...s,revokedAt:at}); }
}

class Ids { constructor(){this.i=0;} next(){this.i++; return `${String(this.i).padStart(8,'0')}-0000-4000-8000-000000000000`; } }
const clock = { now: () => new Date('2026-09-14T20:00:00.000Z') };
const passwords = { hash: async (p) => `argon:${p}`, verify: async (h,p) => h === `argon:${p}` };
const digest = { hash: (t)=>`sha:${t}`, equals: (h,t)=>h===`sha:${t}` };
class Tokens {
  constructor(){this.n=0;}
  async issuePair({userId,sessionId}) { this.n++; return { accessToken:`a:${userId}:${sessionId}:${this.n}`, accessTokenExpiresAt:'2026-09-14T20:15:00.000Z', refreshToken:`r:${userId}:${sessionId}:${this.n}`, refreshTokenExpiresAt:'2026-10-14T20:00:00.000Z' }; }
  async verifyRefreshToken(raw) { const [kind,userId,sessionId] = raw.split(':'); if(kind!=='r'||!userId||!sessionId) throw new Error('bad'); return {userId,sessionId}; }
  async verifyAccessToken(raw) { const [kind,userId,sessionId] = raw.split(':'); if(kind!=='a'||!userId||!sessionId) throw new Error('bad'); return {userId,sessionId,systemRole:'USER'}; }
}
function service(store=new Store()) { return { store, auth:new AuthService({run:(fn)=>fn(store)},passwords,new Tokens(),digest,new Ids(),clock) }; }
const provinceId='22222222-2222-4222-8222-222222222222';

test('normalizes Syrian local mobile numbers to +963', () => assert.equal(normalizeSyrianMobile('0987654321'), '+963987654321'));
test('rejects non-Syrian mobile numbers', () => assert.throws(() => normalizeSyrianMobile('+905551234567'), AuthDomainError));
test('register creates normalized user and a session', async () => { const {store,auth}=service(); const out=await auth.register({fullName:'Test User',phone:'0987654321',provinceId,password:'password123'}); assert.equal(out.user.phone,'+963987654321'); assert.equal(store.sessions.size,1); });
test('registration rejects inactive province', async () => { const {auth}=service(); await assert.rejects(auth.register({fullName:'Test User',phone:'0987654321',provinceId:'33333333-3333-4333-8333-333333333333',password:'password123'}), (e)=>e.code==='PROVINCE_NOT_FOUND'); });
test('login rejects blocked users', async () => { const {store,auth}=service(); await auth.register({fullName:'Test User',phone:'0987654321',provinceId,password:'password123'}); const user=[...store.users.values()][0]; store.users.set(user.id,{...user,status:'BLOCKED'}); await assert.rejects(auth.login({phone:'0987654321',password:'password123'}),(e)=>e.code==='USER_BLOCKED'); });
test('refresh rotates token and rejects reuse', async () => { const {auth}=service(); const registered=await auth.register({fullName:'Test User',phone:'0987654321',provinceId,password:'password123'}); const old=registered.tokens.refreshToken; const refreshed=await auth.refresh(old); assert.notEqual(refreshed.tokens.refreshToken,old); await assert.rejects(auth.refresh(old),(e)=>e.code==='INVALID_REFRESH_TOKEN'); });
test('change password revokes other sessions and rotates current session', async () => { const {store,auth}=service(); const first=await auth.register({fullName:'Test User',phone:'0987654321',provinceId,password:'password123'}); await auth.login({phone:'0987654321',password:'password123'}); const userId=first.user.id; const currentSessionId=first.tokens.refreshToken.split(':')[2]; await auth.changePassword(userId,currentSessionId,{currentPassword:'password123',newPassword:'newpassword123'}); const sessions=[...store.sessions.values()].filter(s=>s.userId===userId); assert.equal(sessions.filter(s=>s.revokedAt).length,1); await assert.rejects(auth.login({phone:'0987654321',password:'password123'}),(e)=>e.code==='INVALID_CREDENTIALS'); await auth.login({phone:'0987654321',password:'newpassword123'}); });
