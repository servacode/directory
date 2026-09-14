import React,{createContext,useCallback,useContext,useMemo,useState,type ReactNode}from'react';
import type{CoordinatesDTO,LocationRuntimeStateDTO,ProvinceDTO,PublicPlatformConfigDTO,PublicUserDTO}from'@health/contracts';
import{LOCATION_CACHE_MAX_AGE_MS}from'@health/config';
import{mobileRuntimeConfig}from'../config/runtime.js';
import{FetchApiTransport}from'./network/fetch-transport.js';
import{ReliableApiClient}from'./network/reliable-api-client.js';
import{SecureSessionStore}from'./auth/secure-session-store.js';
import{AuthApi,MobileAuthSession}from'../api/auth-api.js';
import{PublicDirectoryApi}from'../api/public-directory-api.js';
import{OwnerApi}from'../api/owner-api.js';
import{AccountApi}from'../api/account-api.js';
import{RecoveryApi}from'../api/recovery-api.js';
import{ProfileImageApi}from'../api/profile-image-api.js';
import{UploadTransport}from'./network/upload-transport.js';
import{LocationService,locationModeHasPreciseCoordinates}from'./location/location-service.js';
import{DirectionsService}from'./maps/directions-service.js';
import{PhoneActionService}from'./actions/phone-action-service.js';
import{NativeDirectionsAdapter}from'./maps/native-directions-adapter.js';
import{NativeDeviceLocationAdapter,NativeLocationPermissionAdapter,SecureLocationStateStorage}from'./location/native-location-adapter.js';
const transport=new FetchApiTransport(mobileRuntimeConfig.apiBaseUrl);const secure=new SecureSessionStore();const authSession=new MobileAuthSession(transport,secure);const reliable=new ReliableApiClient(transport,authSession);const authApi=new AuthApi(authSession,transport);const upload=new UploadTransport(mobileRuntimeConfig.apiBaseUrl,authSession);const publicApi=new PublicDirectoryApi(reliable);const ownerApi=new OwnerApi(reliable,upload);const accountApi=new AccountApi(reliable);const recoveryApi=new RecoveryApi(reliable);const profileImageApi=new ProfileImageApi(upload,reliable);const directionsService=new DirectionsService(new NativeDirectionsAdapter());const phoneActionService=new PhoneActionService();const locationService=new LocationService(new NativeLocationPermissionAdapter(),new NativeDeviceLocationAdapter(),new SecureLocationStateStorage(),LOCATION_CACHE_MAX_AGE_MS);
interface State{directionsService:DirectionsService;phoneActionService:PhoneActionService;publicApi:PublicDirectoryApi;authApi:AuthApi;ownerApi:OwnerApi;accountApi:AccountApi;recoveryApi:RecoveryApi;profileImageApi:ProfileImageApi;authSession:MobileAuthSession;platformConfig?:PublicPlatformConfigDTO;province?:ProvinceDTO;setProvince(v:ProvinceDTO):void;user?:PublicUserDTO;setUser(v:PublicUserDTO|undefined):void;location?:LocationRuntimeStateDTO;coordinates?:CoordinatesDTO;restoreSession():Promise<void>;useCurrentLocation():Promise<LocationRuntimeStateDTO>;useManualProvince(v:ProvinceDTO):Promise<void>;}
const C=createContext<State|undefined>(undefined);
export function AppProvider({children}:{children:ReactNode}){const[platformConfig,setPlatformConfig]=useState<PublicPlatformConfigDTO>();const[province,setProvinceState]=useState<ProvinceDTO>();const[user,setUser]=useState<PublicUserDTO>();const[location,setLocation]=useState<LocationRuntimeStateDTO>();
 const setProvince=useCallback((v:ProvinceDTO)=>setProvinceState(v),[]);
 const restoreSession=useCallback(async()=>{let config:PublicPlatformConfigDTO|undefined;try{config=await publicApi.platformConfig();setPlatformConfig(config)}catch{setPlatformConfig(undefined)}if(config?.maintenanceMode===true){setProvinceState(undefined);setLocation(undefined);return;}await authSession.restore();let me:PublicUserDTO|undefined;try{me=await authApi.me();setUser(me);}catch{setUser(undefined);}const saved=await locationService.restore();if(saved)setLocation(saved);try{const provinces=await publicApi.provinces();const preferredProvinceId=saved?.provinceId??me?.provinceId;const preferred=preferredProvinceId?provinces.find(p=>p.id===preferredProvinceId):undefined;const fallback=provinces.length===1?provinces[0]:undefined;setProvinceState(preferred??fallback);}catch{setProvinceState(undefined);}},[]);
 const useCurrentLocation=useCallback(async()=>{const next=await locationService.useCurrentLocation(true);setLocation(next);return next;},[]);
 const useManualProvince=useCallback(async(v:ProvinceDTO)=>{setProvinceState(v);const next=await locationService.useManualLocation({provinceId:v.id});setLocation(next);},[]);
 const coordinates=location&&locationModeHasPreciseCoordinates(location)?location.deviceLocation.coordinates:undefined;
 const value=useMemo(()=>({directionsService,phoneActionService,publicApi,authApi,ownerApi,accountApi,recoveryApi,profileImageApi,authSession,platformConfig,province,setProvince,user,setUser,location,coordinates,restoreSession,useCurrentLocation,useManualProvince}),[platformConfig,province,user,location,coordinates,setProvince,restoreSession,useCurrentLocation,useManualProvince]);return <C.Provider value={value}>{children}</C.Provider>}
export function useApp(){const value=useContext(C);if(!value)throw new Error('AppProvider is missing');return value}
