import type { ApiRequest, ApiTransport, ApiTransportResponse } from './reliable-api-client.js';
import { ApiTransportError } from './reliable-api-client.js';
export class FetchApiTransport implements ApiTransport {
 constructor(private readonly baseUrl:string){}
 async send<T>(request:ApiRequest&{readonly accessToken?:string}):Promise<ApiTransportResponse<T>>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),request.timeoutMs??10_000);
  try{
   const response=await fetch(`${this.baseUrl}${request.path}`,{method:request.method,headers:{accept:'application/json',...(request.body===undefined?{}:{'content-type':'application/json'}),...(request.accessToken?{authorization:`Bearer ${request.accessToken}`} : {}),...request.headers},...(request.body===undefined?{}:{body:JSON.stringify(request.body)}),signal:controller.signal});
   const text=await response.text();let data:unknown=undefined;if(text){try{data=JSON.parse(text)}catch{data=text}}
   return{status:response.status,data:data as T};
  }catch(error){if(error instanceof Error&&error.name==='AbortError')throw new ApiTransportError('TIMEOUT');throw new ApiTransportError('NETWORK')}finally{clearTimeout(timer)}
 }
}
