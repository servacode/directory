import type { AuthResponseDTO, LoginRequest, PublicUserDTO, RegisterRequest } from '@health/contracts';
import type { ApiTransport, AuthSessionPort } from '../platform/network/reliable-api-client.js';
import { ReliableApiClient } from '../platform/network/reliable-api-client.js';
import { SecureSessionStore } from '../platform/auth/secure-session-store.js';

export class MobileAuthSession implements AuthSessionPort {
 constructor(private readonly transport:ApiTransport,private readonly store:SecureSessionStore){}
 accessToken(){return this.store.get()?.accessToken}
 async restore(){return this.store.load()}
 async refresh(){const current=this.store.get();if(!current)return undefined;const response=await this.transport.send<AuthResponseDTO>({method:'POST',path:'/auth/refresh',body:{refreshToken:current.refreshToken},authenticated:false});if(response.status!==200){await this.clear();return undefined}await this.saveResponse(response.data);return response.data.tokens.accessToken}
 clear(){return this.store.clear()}
 async saveResponse(data:AuthResponseDTO){await this.store.save(data.tokens)}
}
export class AuthApi {
 private readonly client:ReliableApiClient;
 constructor(private readonly session:MobileAuthSession,transport:ApiTransport){this.client=new ReliableApiClient(transport,session)}
 async register(input:RegisterRequest){const result=await this.client.request<AuthResponseDTO>({method:'POST',path:'/auth/register',body:input,authenticated:false});await this.session.saveResponse(result);return result}
 async login(input:LoginRequest){const result=await this.client.request<AuthResponseDTO>({method:'POST',path:'/auth/login',body:input,authenticated:false});await this.session.saveResponse(result);return result}
 async me(){return this.client.request<PublicUserDTO>({method:'GET',path:'/users/me'})}
 async logout(){try{await this.client.request<{ok:true}>({method:'POST',path:'/auth/logout'})}finally{await this.session.clear()}}
 async changePassword(currentPassword:string,newPassword:string){const tokens=await this.client.request<AuthResponseDTO['tokens']>({method:'POST',path:'/auth/change-password',body:{currentPassword,newPassword}});await this.session.saveResponse({user:await this.me(),tokens});return tokens}
}
