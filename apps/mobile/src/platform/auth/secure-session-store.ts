import * as Keychain from 'react-native-keychain';
const SERVICE='health-directory-session';
export interface StoredSession{readonly accessToken:string;readonly refreshToken:string;readonly accessTokenExpiresAt:string;readonly refreshTokenExpiresAt:string;}
export class SecureSessionStore {
 private current:StoredSession|undefined;
 async load():Promise<StoredSession|undefined>{const record=await Keychain.getGenericPassword({service:SERVICE});if(!record)return undefined;try{this.current=JSON.parse(record.password) as StoredSession;return this.current}catch{await this.clear();return undefined}}
 get():StoredSession|undefined{return this.current}
 async save(session:StoredSession):Promise<void>{this.current=session;await Keychain.setGenericPassword('session',JSON.stringify(session),{service:SERVICE})}
 async clear():Promise<void>{this.current=undefined;await Keychain.resetGenericPassword({service:SERVICE})}
}
