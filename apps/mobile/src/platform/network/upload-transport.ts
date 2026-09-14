import type { AuthSessionPort } from './reliable-api-client.js';
export interface NativeUploadFile{readonly uri:string;readonly type:string;readonly name:string;}
export class UploadTransport{
 constructor(private readonly baseUrl:string,private readonly auth:AuthSessionPort){}
 async image<T=void>(path:string,file:NativeUploadFile):Promise<T>{const token=this.auth.accessToken();if(!token)throw new Error('AUTH_REQUIRED');const form=new FormData();form.append('file',{uri:file.uri,type:file.type,name:file.name} as never);const response=await fetch(`${this.baseUrl}${path}`,{method:'POST',headers:{authorization:`Bearer ${token}`},body:form});if(!response.ok)throw new Error(`UPLOAD_${response.status}`);const text=await response.text();return (text?JSON.parse(text):undefined) as T}
}
