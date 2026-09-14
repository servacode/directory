import Geolocation from '@react-native-community/geolocation';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import type { DeviceLocationDTO, GpsStatus, LocationPermissionStatus, LocationRuntimeStateDTO } from '@health/contracts';
import type { DeviceLocationAdapter, LocationPermissionAdapter, LocationStateStorage } from './location-service.js';

const LOCATION_SERVICE='health-directory-location';
export class NativeLocationPermissionAdapter implements LocationPermissionAdapter{
 async check():Promise<LocationPermissionStatus>{
  if(Platform.OS!=='android')return'GRANTED';
  const granted=await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return granted?'GRANTED':'NOT_REQUESTED';
 }
 async request():Promise<LocationPermissionStatus>{
  if(Platform.OS!=='android')return'GRANTED';
  const result=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  if(result===PermissionsAndroid.RESULTS.GRANTED)return'GRANTED';
  if(result===PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)return'BLOCKED';
  return'DENIED';
 }
 async openSettings(){await Linking.openSettings();}
}
export class NativeDeviceLocationAdapter implements DeviceLocationAdapter{
 private lastGpsStatus:GpsStatus='UNAVAILABLE';
 async gpsStatus():Promise<GpsStatus>{return this.lastGpsStatus;}
 currentPosition():Promise<DeviceLocationDTO>{return new Promise((resolve,reject)=>Geolocation.getCurrentPosition((position:{coords:{latitude:number;longitude:number;accuracy:number};timestamp:number})=>{
  this.lastGpsStatus='ENABLED';
  resolve({coordinates:{latitude:position.coords.latitude,longitude:position.coords.longitude},accuracyMeters:position.coords.accuracy,capturedAt:new Date(position.timestamp).toISOString(),source:'GPS'});
 },(error:{code?:number})=>{
  // Android geolocation code 2 means the provider/position is unavailable. We do not
  // equate permission state with GPS state; GPS truth is inferred only from a location attempt.
  this.lastGpsStatus=error?.code===2?'DISABLED':'UNAVAILABLE';
  reject(error);
 },{enableHighAccuracy:true,timeout:12_000,maximumAge:60_000}));}
}
export class SecureLocationStateStorage implements LocationStateStorage{
 async load():Promise<LocationRuntimeStateDTO|null>{const record=await Keychain.getGenericPassword({service:LOCATION_SERVICE});if(!record)return null;try{return JSON.parse(record.password) as LocationRuntimeStateDTO}catch{await Keychain.resetGenericPassword({service:LOCATION_SERVICE});return null}}
 async save(state:LocationRuntimeStateDTO):Promise<void>{await Keychain.setGenericPassword('location',JSON.stringify(state),{service:LOCATION_SERVICE});}
}
