import test from 'node:test';
import assert from 'node:assert/strict';
import { PasswordRecoveryService } from '../../../../.tmp-auth-core/apps/api/src/modules/auth/core/password-recovery.service.js';

class RecoveryStore {
  constructor() { this.users=new Map(); this.sessions=new Map(); this.challenges=new Map(); }
  async isProvinceActive(){return true;}
  async findUserByPhone(phone){return [...this.users.values()].find(u=>u.phone===phone)??null;}
  async findUserById(id){return this.users.get(id)??null;}
  async createUser(user){this.users.set(user.id,{...user,status:'ACTIVE',systemRole:'USER'});}
  async updateLastLogin(){}
  async updatePassword(id,passwordHash){this.users.set(id,{...this.users.get(id),passwordHash});}
  async createSession(s){this.sessions.set(s.id,{...s});}
  async findSession(id){return this.sessions.get(id)??null;}
  async findSessionForUpdate(id){return this.sessions.get(id)??null;}
  async rotateSession(){}
  async revokeSession(id,at){const s=this.sessions.get(id);if(s)this.sessions.set(id,{...s,revokedAt:at});}
  async revokeAllUserSessions(userId,at){for(const [id,s] of this.sessions)if(s.userId===userId)this.sessions.set(id,{...s,revokedAt:at});}
  async createRecoveryChallenge(c){this.challenges.set(c.id,{...c,attempts:0});}
  async findRecoveryChallengeForUpdate(id){return this.challenges.get(id)??null;}
  async incrementRecoveryAttempts(id){const c=this.challenges.get(id);this.challenges.set(id,{...c,attempts:c.attempts+1});}
  async markRecoveryVerified(id,verifiedAt,recoveryTokenHash,recoveryTokenExpiresAt){const c=this.challenges.get(id);this.challenges.set(id,{...c,verifiedAt,recoveryTokenHash,recoveryTokenExpiresAt});}
  async consumeRecoveryChallenge(id,consumedAt){const c=this.challenges.get(id);this.challenges.set(id,{...c,consumedAt});}
}
class Ids { constructor(){this.i=0;} next(){this.i++;return `${String(this.i).padStart(8,'0')}-0000-4000-8000-000000000000`;} }
const clock={now:()=>new Date('2026-09-14T20:00:00.000Z')};
const passwords={hash:async p=>`argon:${p}`,verify:async(h,p)=>h===`argon:${p}`};
const digests={hash:t=>`hash:${t}`,equals:(h,t)=>h===`hash:${t}`};
function fixture(){
 const store=new RecoveryStore();
 store.users.set('11111111-1111-4111-8111-111111111111',{id:'11111111-1111-4111-8111-111111111111',fullName:'User',phone:'+963987654321',provinceId:'22222222-2222-4222-8222-222222222222',passwordHash:'argon:oldpassword',status:'ACTIVE',systemRole:'USER'});
 store.sessions.set('33333333-3333-4333-8333-333333333333',{id:'33333333-3333-4333-8333-333333333333',userId:'11111111-1111-4111-8111-111111111111',refreshTokenHash:'x',expiresAt:'2026-10-14T20:00:00.000Z'});
 const sent=[];
 const service=new PasswordRecoveryService({run:fn=>fn(store)},passwords,digests,digests,new Ids(),clock,{generate:()=> '123456'},{generate:()=> 'recovery-secret-token-1234567890'},{sendVerificationCode:async x=>sent.push(x)});
 return {store,sent,service};
}

test('recovery sends code only for an existing account but always returns a challenge', async()=>{const {service,sent}=fixture();const a=await service.start('0987654321');const b=await service.start('0999999999');await new Promise(r=>setTimeout(r,0));assert.ok(a.challengeId);assert.ok(b.challengeId);assert.equal(sent.length,1);assert.equal(sent[0].phone,'+963987654321');});
test('wrong recovery code increments attempts', async()=>{const {service,store}=fixture();const {challengeId}=await service.start('0987654321');await assert.rejects(service.verify(challengeId,'000000'));assert.equal(store.challenges.get(challengeId).attempts,1);});
test('verified recovery resets password and revokes sessions without sending the new password to channel', async()=>{const {service,store,sent}=fixture();const {challengeId}=await service.start('0987654321');await new Promise(r=>setTimeout(r,0));const {recoveryToken}=await service.verify(challengeId,'123456');await service.complete(challengeId,recoveryToken,'newpassword123');const user=store.users.get('11111111-1111-4111-8111-111111111111');assert.equal(user.passwordHash,'argon:newpassword123');assert.ok(store.sessions.get('33333333-3333-4333-8333-333333333333').revokedAt);assert.equal(sent.length,1);assert.deepEqual(Object.keys(sent[0]).sort(),['code','phone']);});
