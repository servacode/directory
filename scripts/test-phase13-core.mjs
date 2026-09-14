import assert from 'node:assert/strict';
import { ReliableApiClient, ApiTransportError } from '../apps/mobile/.tmp-network-core/reliable-api-client.js';
import { CACHE_POLICIES, cacheState } from '../apps/mobile/.tmp-network-core/cache-policy.js';

let calls=0;
const auth={token:'a',accessToken(){return this.token},async refresh(){this.token='b';return this.token},async clear(){this.token=undefined}};
const flaky={async send(){calls++;if(calls<3)throw new ApiTransportError('NETWORK');return{status:200,data:{ok:true}}}};
const client=new ReliableApiClient(flaky,auth,{getRetries:2,baseDelayMs:0});
assert.deepEqual(await client.request({method:'GET',path:'/x'}),{ok:true});assert.equal(calls,3);
let postCalls=0;const postClient=new ReliableApiClient({async send(){postCalls++;throw new ApiTransportError('NETWORK')}},auth,{getRetries:3,baseDelayMs:0});
await assert.rejects(()=>postClient.request({method:'POST',path:'/x',body:{}}));assert.equal(postCalls,1);
let refreshes=0;let authorized=false;const sharedAuth={accessToken(){return authorized?'new':'old'},async refresh(){refreshes++;await new Promise(r=>setTimeout(r,5));authorized=true;return'new'},clear(){}};
const unauthorizedTransport={async send(req){if(req.accessToken==='old')return{status:401,data:null};return{status:200,data:'ok'}}};
const concurrent=new ReliableApiClient(unauthorizedTransport,sharedAuth,{getRetries:0,baseDelayMs:0});
assert.deepEqual(await Promise.all([concurrent.request({method:'GET',path:'/a'}),concurrent.request({method:'GET',path:'/b'})]),['ok','ok']);assert.equal(refreshes,1);
assert.equal(cacheState('DUTY',0,20_000),'FRESH');assert.equal(cacheState('DUTY',0,60_000),'STALE_USABLE');assert.equal(cacheState('DUTY',0,6*60_000),'EXPIRED');assert.equal(CACHE_POLICIES.DUTY.requiresFreshnessWarning,true);
console.log('phase13-core: 10 assertions PASS');
