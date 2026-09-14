import type { ReliableApiClient } from '../platform/network/reliable-api-client.js';
export class RecoveryApi{
 constructor(private readonly client:ReliableApiClient){}
 start(phone:string){return this.client.request<{challengeId:string}>({method:'POST',path:'/auth/password-recovery/start',body:{phone},authenticated:false})}
 verify(challengeId:string,verificationCode:string){return this.client.request<{recoveryToken:string}>({method:'POST',path:'/auth/password-recovery/verify',body:{challengeId,verificationCode},authenticated:false})}
 complete(challengeId:string,recoveryToken:string,newPassword:string){return this.client.request<{ok:true}>({method:'POST',path:'/auth/password-recovery/complete',body:{challengeId,recoveryToken,newPassword},authenticated:false})}
}
