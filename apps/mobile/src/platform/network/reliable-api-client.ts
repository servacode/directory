export type HttpMethod='GET'|'POST'|'PUT'|'PATCH'|'DELETE';
export interface ApiRequest { readonly method:HttpMethod; readonly path:string; readonly body?:unknown; readonly headers?:Readonly<Record<string,string>>; readonly timeoutMs?:number; readonly authenticated?:boolean; }
export interface ApiTransportResponse<T>{readonly status:number;readonly data:T;}
export interface ApiTransport { send<T>(request:ApiRequest & {readonly accessToken?:string}):Promise<ApiTransportResponse<T>>; }
export interface AuthSessionPort { accessToken():string|undefined; refresh():Promise<string|undefined>; clear():Promise<void>|void; }
export class ApiTransportError extends Error { constructor(readonly kind:'NETWORK'|'TIMEOUT'|'HTTP',readonly status?:number){super(kind)} }
export interface RetryPolicy { readonly getRetries:number; readonly baseDelayMs:number; }
const sleep=(ms:number)=>new Promise<void>((resolve)=>setTimeout(resolve,ms));

export class ReliableApiClient {
  private refreshInFlight:Promise<string|undefined>|undefined;
  constructor(private readonly transport:ApiTransport,private readonly auth:AuthSessionPort,private readonly retry:RetryPolicy={getRetries:2,baseDelayMs:250}){}
  async request<T>(input:ApiRequest):Promise<T>{return (await this.execute<T>(input,0,true)).data}
  private async execute<T>(input:ApiRequest,attempt:number,allowRefresh:boolean):Promise<ApiTransportResponse<T>>{
    const accessToken=input.authenticated===false?undefined:this.auth.accessToken();
    try{
      const response=await this.transport.send<T>({...input,...(accessToken?{accessToken}:{})});
      if(response.status===401&&allowRefresh&&input.authenticated!==false){
        const token=await this.refreshOnce();if(!token){await this.auth.clear();throw new ApiTransportError('HTTP',401)}
        return this.execute<T>(input,attempt,false);
      }
      if(response.status>=500&&this.canRetry(input,attempt)){await sleep(this.delay(attempt));return this.execute<T>(input,attempt+1,allowRefresh)}
      if(response.status>=400)throw new ApiTransportError('HTTP',response.status);
      return response;
    }catch(error){
      if(error instanceof ApiTransportError&&(error.kind==='NETWORK'||error.kind==='TIMEOUT')&&this.canRetry(input,attempt)){await sleep(this.delay(attempt));return this.execute<T>(input,attempt+1,allowRefresh)}
      throw error;
    }
  }
  private canRetry(input:ApiRequest,attempt:number):boolean{return input.method==='GET'&&attempt<this.retry.getRetries}
  private delay(attempt:number):number{return this.retry.baseDelayMs*(2**attempt)}
  private refreshOnce():Promise<string|undefined>{if(!this.refreshInFlight){this.refreshInFlight=this.auth.refresh().finally(()=>{this.refreshInFlight=undefined})}return this.refreshInFlight}
}
