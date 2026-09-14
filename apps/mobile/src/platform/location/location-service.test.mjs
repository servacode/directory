import test from 'node:test';
import assert from 'node:assert/strict';
import { LocationService } from '../../../.tmp-geo-core/apps/mobile/src/platform/location/location-service.js';
import { facilityPinPresentation } from '../../../.tmp-geo-core/apps/mobile/src/platform/maps/map-provider.js';

const provinceId='10000000-0000-4000-8000-000000000009';
const cityId='20000000-0000-4000-8000-000000000001';
class Storage { value=null; async load(){return this.value;} async save(v){this.value=v;} }
function setup({permission='GRANTED',gps='ENABLED',positionFails=false}={}) {
  const storage=new Storage();
  const permissions={check:async()=>permission, request:async()=>permission, openSettings:async()=>{}};
  const device={gpsStatus:async()=>gps,currentPosition:async()=>{if(positionFails)throw new Error('position unavailable');return{coordinates:{latitude:35.95,longitude:39.01},accuracyMeters:15,capturedAt:'2026-09-14T20:00:00.000Z',source:'GPS'}}};
  return {storage,service:new LocationService(permissions,device,storage,300000,{nowMs:()=>Date.parse('2026-09-14T20:01:00.000Z')})};
}

test('uses precise device location when permission and GPS are available', async()=>{ const {service}=setup(); const state=await service.useCurrentLocation(); assert.equal(state.mode,'DEVICE_LOCATION'); assert.equal(state.deviceLocation.coordinates.latitude,35.95); });
test('falls back to manual mode when permission is denied', async()=>{ const {service}=setup({permission:'DENIED'}); const state=await service.useCurrentLocation(false); assert.equal(state.mode,'MANUAL_LOCATION'); assert.equal(state.permissionStatus,'DENIED'); });
test('falls back to manual mode when the location provider cannot return a position', async()=>{ const {service}=setup({gps:'DISABLED',positionFails:true}); const state=await service.useCurrentLocation(false); assert.equal(state.mode,'MANUAL_LOCATION'); assert.equal(state.gpsStatus,'DISABLED'); });
test('manual location persists selected governorate and city', async()=>{ const {service,storage}=setup(); const state=await service.useManualLocation({provinceId,cityId}); assert.equal(state.provinceId,provinceId); assert.equal(storage.value.cityId,cityId); });
test('stale precise location cache is rejected', async()=>{ const {service,storage}=setup(); storage.value={mode:'DEVICE_LOCATION',permissionStatus:'GRANTED',gpsStatus:'ENABLED',deviceLocation:{coordinates:{latitude:35.95,longitude:39.01},accuracyMeters:10,capturedAt:'2026-09-14T19:00:00.000Z',source:'GPS'}}; assert.equal(await service.restore(),null); });
test('duty pharmacy pin preserves pharmacy icon and duty indicator', ()=>{ const pin=facilityPinPresentation({id:'x',name:'P',specialization:'PHARMACY',categoryId:'cat-p',categoryCode:'PHARMACY',categoryIconKey:'pharmacy',coordinates:{latitude:0,longitude:0},availability:{status:'DUTY_NOW',labelKey:'x'},rating:{count:0}}); assert.equal(pin.iconKey,'pharmacy'); assert.equal(pin.showDutyIndicator,true); });
test('generic dynamic category uses server-provided semantic icon', ()=>{ const pin=facilityPinPresentation({id:'x',name:'Lab',specialization:'GENERIC',categoryId:'cat-lab',categoryCode:'MEDICAL_LAB',categoryIconKey:'lab',coordinates:{latitude:0,longitude:0},availability:{status:'OPEN_NOW',labelKey:'x'},rating:{count:0}}); assert.equal(pin.iconKey,'lab'); });
test('unknown dynamic category icon falls back to store', ()=>{ const pin=facilityPinPresentation({id:'x',name:'Other',specialization:'GENERIC',categoryId:'cat-other',categoryCode:'OTHER',categoryIconKey:'futureIcon',coordinates:{latitude:0,longitude:0},availability:{status:'OPEN_NOW',labelKey:'x'},rating:{count:0}}); assert.equal(pin.iconKey,'store'); });
