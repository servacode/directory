import { Injectable } from '@nestjs/common';
import type {
  AvailabilityDTO, DirectoryCategoryCapabilitiesDTO, DirectoryCategoryDTO, FacilityBusinessDayDTO,
  FacilityDiscoveryQuery, FacilityListDTO, FacilitySpecialization, MapBoundsQuery, PublicFacilityDetailDTO, SearchQueryContract,
} from '@health/contracts';
import { APP_TIMEZONE } from '@health/config';
import { DatabaseService } from '../../database/database.service.js';
import { evaluateAvailability } from '../availability/availability-engine.js';
import { DirectoryCatalogService } from '../directory/directory-catalog.service.js';
import { FacilityDomainError } from '../facilities/facility-domain.error.js';
import { PlatformSettingsService } from '../settings/platform-settings.service.js';

interface BaseRow {
  id:string;specialization:FacilitySpecialization;categoryId:string;categoryCode:string;categoryNameAr:string;categoryIconKey:string;categoryCapabilities:DirectoryCategoryCapabilitiesDTO;
  name:string;primaryImageUrl:string|null;shortAddress:string;provinceId:string;cityId:string;distanceMeters:number|string|null;
  ratingAverage:number|string|null;ratingCount:number|string;doctorName:string|null;specialtyName:string|null;
}
interface DayRow {facilityId:string;id:string;dayOfWeek:FacilityBusinessDayDTO['dayOfWeek'];isClosed:boolean;is24Hours:boolean;}
interface PeriodRow {facilityId:string;businessDayId:string;startTime:string;endTime:string;endsNextDay:boolean;}
interface WindowRow {facilityId:string;startsAt:string;endsAt:string;}
interface DutyRow {facilityId:string;endsAt:string;}
interface DetailExtraRow { phone:string;description:string|null;neighborhoodId:string|null;addressText:string;latitude:number|string;longitude:number|string;licenseNumber:string|null;doctorName:string|null;specialtyId:string|null;specialtyName:string|null;responsiblePersonName:string|null; }
interface DetailImageRow { id:string;url:string;isPrimary:boolean;sortOrder:number; }

@Injectable()
export class PublicDiscoveryService{
 constructor(private readonly db:DatabaseService,private readonly settings:PlatformSettingsService,private readonly catalog:DirectoryCatalogService){}

 async discover(input:FacilityDiscoveryQuery){
  const category=await this.publicCategory(input.provinceId,input.categoryId);this.assertCapabilityFilters(category,input);
  const baseInput={provinceId:input.provinceId,categoryId:input.categoryId,coordinates:input.coordinates,cityId:input.cityId,specialtyId:input.specialtyId,nursingServiceId:input.nursingServiceId};
  const page=input.page??1,pageSize=input.pageSize??20;
  // Availability filters are time-derived and currently evaluated by the shared engine. The common
  // governorate/category path is DB-paginated; time-derived filters retain exact semantics until they
  // are moved to an equivalent SQL predicate in a later scale phase.
  if(!input.openNow&&!input.dutyNow){
    const [rows,totalItems]=await Promise.all([this.baseFacilities(baseInput,{limit:pageSize,offset:(page-1)*pageSize}),this.countBaseFacilities(baseInput)]);
    const availability=await this.availabilityMap(rows.map(x=>x.id));
    return{items:rows.map(row=>this.toListDto(row,availability.get(row.id)!)),pagination:this.paginationMeta(page,pageSize,totalItems)};
  }
  const all=await this.baseFacilities(baseInput);
  const availability=await this.availabilityMap(all.map(x=>x.id));let items=all.map(row=>this.toListDto(row,availability.get(row.id)!));
  if(input.openNow)items=items.filter(x=>x.availability.status==='OPEN_NOW'||x.availability.status==='DUTY_NOW');
  if(input.dutyNow)items=items.filter(x=>x.specialization==='PHARMACY'&&x.availability.status==='DUTY_NOW');
  return this.paginate(items,page,pageSize);
 }

 async search(input:SearchQueryContract){
  let category:DirectoryCategoryDTO|undefined;if(input.categoryId){category=await this.publicCategory(input.provinceId,input.categoryId);this.assertCapabilityFilters(category,input)}
  const query=input.query.trim(),coords=input.coordinates,params:unknown[]=[input.provinceId,query];
  const clauses=[`f.status='ACTIVE'`,`f.province_id=$1`,`p.is_active=TRUE`,`c.is_active=TRUE`,`cat.is_active=TRUE`,`dcp.public_enabled=TRUE`,`(
    normalize_arabic(f.name) % normalize_arabic($2) OR normalize_arabic(cat.name_ar) % normalize_arabic($2)
    OR normalize_arabic(COALESCE(cp.doctor_name,'')) % normalize_arabic($2)
    OR normalize_arabic(COALESCE(ds.name_ar,'')) % normalize_arabic($2)
    OR EXISTS(SELECT 1 FROM facility_nursing_services fns JOIN nursing_services ns ON ns.id=fns.nursing_service_id WHERE fns.facility_id=f.id AND normalize_arabic(ns.name_ar) % normalize_arabic($2))
    OR normalize_arabic(COALESCE(f.address_text,'')) LIKE '%' || normalize_arabic($2) || '%')`];
  if(input.categoryId){params.push(input.categoryId);clauses.push(`f.category_id=$${params.length}`)}
  if(input.specialtyId){params.push(input.specialtyId);clauses.push(`cp.specialty_id=$${params.length}`)}
  if(input.nursingServiceId){params.push(input.nursingServiceId);clauses.push(`EXISTS(SELECT 1 FROM facility_nursing_services sf WHERE sf.facility_id=f.id AND sf.nursing_service_id=$${params.length})`)}
  if(input.dutyNow&&!input.categoryId)clauses.push(`cat.specialization='PHARMACY'`);
  let distanceSql='NULL::double precision';if(coords){params.push(coords.longitude,coords.latitude);const lon=params.length-1,lat=params.length;distanceSql=`ST_Distance(f.location,ST_SetSRID(ST_MakePoint($${lon},$${lat}),4326)::geography)`}
  const page=input.page??1,pageSize=input.pageSize??20;
  if(!input.openNow&&!input.dutyNow){
    const countParams=params.slice(0,coords?params.length-2:params.length);
    // Rebuild the count predicate without distance-only coordinate parameters.
    const countClauses=[...clauses];
    const count=await this.db.query<{count:number|string}>(`SELECT COUNT(DISTINCT f.id) AS count ${this.baseFrom()} WHERE ${countClauses.join(' AND ')}`,countParams);
    const pageParams=[...params,pageSize,(page-1)*pageSize];const limitIndex=pageParams.length-1,offsetIndex=pageParams.length;
    const result=await this.db.query<BaseRow>(this.baseSelect(distanceSql)+` WHERE ${clauses.join(' AND ')} GROUP BY f.id,cat.id,img.storage_key,cp.doctor_name,ds.name_ar ORDER BY ${coords?'"distanceMeters" ASC NULLS LAST,':''} similarity(normalize_arabic(f.name),normalize_arabic($2)) DESC,f.name LIMIT $${limitIndex} OFFSET $${offsetIndex}`,pageParams);
    const availability=await this.availabilityMap(result.rows.map(x=>x.id));
    return{items:result.rows.map(row=>this.toListDto(row,availability.get(row.id)!)),pagination:this.paginationMeta(page,pageSize,Number(count.rows[0]?.count??0))};
  }
  const result=await this.db.query<BaseRow>(this.baseSelect(distanceSql)+` WHERE ${clauses.join(' AND ')} GROUP BY f.id,cat.id,img.storage_key,cp.doctor_name,ds.name_ar ORDER BY ${coords?'"distanceMeters" ASC NULLS LAST,':''} similarity(normalize_arabic(f.name),normalize_arabic($2)) DESC,f.name`,params);
  const availability=await this.availabilityMap(result.rows.map(x=>x.id));let items=result.rows.map(row=>this.toListDto(row,availability.get(row.id)!));
  if(input.openNow)items=items.filter(x=>x.availability.status==='OPEN_NOW'||x.availability.status==='DUTY_NOW');if(input.dutyNow)items=items.filter(x=>x.specialization==='PHARMACY'&&x.availability.status==='DUTY_NOW');
  return this.paginate(items,page,pageSize);
 }

 async home(input:{provinceId:string;coordinates?:{latitude:number;longitude:number}}){
  const rows=await this.baseFacilities({provinceId:input.provinceId,coordinates:input.coordinates});const availability=await this.availabilityMap(rows.map(x=>x.id));const items=rows.map(row=>this.toListDto(row,availability.get(row.id)!));
  const dutyLimit=await this.settings.get('homeDutyLimit'),nearbyLimit=await this.settings.get('homeNearbyLimit');
  return{provinceId:input.provinceId,dutyPharmacies:items.filter(x=>x.specialization==='PHARMACY'&&x.availability.status==='DUTY_NOW').slice(0,dutyLimit),openNearby:items.filter(x=>x.availability.status==='OPEN_NOW'||x.availability.status==='DUTY_NOW').slice(0,nearbyLimit),nearbyFacilities:items.slice(0,nearbyLimit)};
 }

 async detail(id:string):Promise<PublicFacilityDetailDTO>{
  const rows=await this.baseFacilities({facilityId:id});const row=rows[0];if(!row)throw new FacilityDomainError('FACILITY_NOT_FOUND','Facility not found.');
  const availability=await this.availabilityMap([id]);const images=await this.db.query<DetailImageRow>(`SELECT id,'/api/v1/media/' || storage_key AS url,is_primary AS "isPrimary",sort_order AS "sortOrder" FROM facility_images WHERE facility_id=$1 ORDER BY sort_order`,[id]);const days=await this.loadSchedule([id]);
  const extra=await this.db.query<DetailExtraRow>(`SELECT f.phone,f.description,f.neighborhood_id AS "neighborhoodId",f.address_text AS "addressText",ST_Y(f.location::geometry) AS latitude,ST_X(f.location::geometry) AS longitude,pp.license_number AS "licenseNumber",cp.doctor_name AS "doctorName",cp.specialty_id AS "specialtyId",ds.name_ar AS "specialtyName",np.responsible_person_name AS "responsiblePersonName" FROM facilities f LEFT JOIN pharmacy_profiles pp ON pp.facility_id=f.id LEFT JOIN medical_clinic_profiles cp ON cp.facility_id=f.id LEFT JOIN doctor_specialties ds ON ds.id=cp.specialty_id LEFT JOIN nursing_center_profiles np ON np.facility_id=f.id WHERE f.id=$1`,[id]);
  const services=await this.db.query<{id:string;name:string}>(`SELECT ns.id,ns.name_ar AS name FROM facility_nursing_services fns JOIN nursing_services ns ON ns.id=fns.nursing_service_id WHERE fns.facility_id=$1 AND ns.is_active=TRUE ORDER BY ns.sort_order`,[id]);
  const e=extra.rows[0];if(!e)throw new FacilityDomainError('FACILITY_NOT_FOUND','Facility not found.');
  const base={...this.toListDto(row,availability.get(id)!),phone:e.phone,description:e.description??undefined,neighborhoodId:e.neighborhoodId??undefined,addressText:e.addressText,coordinates:{latitude:Number(e.latitude),longitude:Number(e.longitude)},images:images.rows,businessHours:days.get(id)??[]};
  if(row.specialization==='MEDICAL_CLINIC'){
    if(!e.doctorName||!e.specialtyId||!e.specialtyName)throw new FacilityDomainError('VALIDATION_ERROR','Active clinic is missing doctor specialty data.');
    return{...base,specialization:'MEDICAL_CLINIC',doctorName:e.doctorName,specialty:{id:e.specialtyId,name:e.specialtyName}};
  }
  if(row.specialization==='NURSING_CENTER')return{...base,specialization:'NURSING_CENTER',...(e.responsiblePersonName?{responsiblePersonName:e.responsiblePersonName}:{}),services:services.rows};
  if(row.specialization==='PHARMACY')return{...base,specialization:'PHARMACY',...(e.licenseNumber?{licenseNumber:e.licenseNumber}:{})};
  return{...base,specialization:'GENERIC'};
 }

 async map(input:MapBoundsQuery){
  if(input.categoryId){const category=await this.publicCategory(input.provinceId,input.categoryId);this.assertCapabilityFilters(category,input)}
  const params:unknown[]=[input.west,input.south,input.east,input.north,input.provinceId];const clauses=[`f.status='ACTIVE'`,`f.location IS NOT NULL`,`f.province_id=$5`,`p.is_active=TRUE`,`c.is_active=TRUE`,`cat.is_active=TRUE`,`dcp.public_enabled=TRUE`,`ST_Intersects(f.location::geometry,ST_MakeEnvelope($1,$2,$3,$4,4326))`];
  if(input.categoryId){params.push(input.categoryId);clauses.push(`f.category_id=$${params.length}`)}if(input.dutyNow&&!input.categoryId)clauses.push(`cat.specialization='PHARMACY'`);
  const r=await this.db.query<{id:string;name:string;specialization:FacilitySpecialization;categoryId:string;categoryCode:string;categoryIconKey:string;latitude:number|string;longitude:number|string}>(`SELECT f.id,f.name,cat.specialization,cat.id AS "categoryId",cat.code AS "categoryCode",cat.icon_key AS "categoryIconKey",ST_Y(f.location::geometry) AS latitude,ST_X(f.location::geometry) AS longitude FROM facilities f JOIN directory_categories cat ON cat.id=f.category_id JOIN directory_category_provinces dcp ON dcp.category_id=cat.id AND dcp.province_id=f.province_id JOIN provinces p ON p.id=f.province_id JOIN cities c ON c.id=f.city_id WHERE ${clauses.join(' AND ')} ORDER BY f.id LIMIT 1000`,params);
  const availability=await this.availabilityMap(r.rows.map(x=>x.id));let pins=r.rows.map(x=>({id:x.id,name:x.name,specialization:x.specialization,categoryId:x.categoryId,categoryCode:x.categoryCode,categoryIconKey:x.categoryIconKey,coordinates:{latitude:Number(x.latitude),longitude:Number(x.longitude)},availability:availability.get(x.id)!,rating:{count:0}}));
  if(input.openNow)pins=pins.filter(x=>x.availability.status==='OPEN_NOW'||x.availability.status==='DUTY_NOW');if(input.dutyNow)pins=pins.filter(x=>x.specialization==='PHARMACY'&&x.availability.status==='DUTY_NOW');return pins;
 }

 private async publicCategory(provinceId:string,categoryId:string){const categories=await this.catalog.listForProvince(provinceId,'public');const category=categories.find(x=>x.id===categoryId);if(!category)throw new FacilityDomainError('FEATURE_DISABLED','This directory category is not public in the selected province.');return category}
 private assertCapabilityFilters(category:DirectoryCategoryDTO,input:{specialtyId?:string;nursingServiceId?:string;dutyNow?:boolean}){if(input.specialtyId&&!category.capabilities.specialtyFilter)throw new FacilityDomainError('VALIDATION_ERROR','Specialty filter is not supported by this category.');if(input.nursingServiceId&&!category.capabilities.serviceFilter)throw new FacilityDomainError('VALIDATION_ERROR','Service filter is not supported by this category.');if(input.dutyNow&&!category.capabilities.duty)throw new FacilityDomainError('VALIDATION_ERROR','Duty filter is not supported by this category.');}

 private facilityFilterParts(input:{provinceId?:string;categoryId?:string;coordinates?:{latitude:number;longitude:number};cityId?:string;specialtyId?:string;nursingServiceId?:string;facilityId?:string}){
  const params:unknown[]=[],clauses=[`f.status='ACTIVE'`,`p.is_active=TRUE`,`c.is_active=TRUE`,`cat.is_active=TRUE`,`cg.is_active=TRUE`,`dcp.public_enabled=TRUE`];
  if(input.provinceId){params.push(input.provinceId);clauses.push(`f.province_id=$${params.length}`)}if(input.facilityId){params.push(input.facilityId);clauses.push(`f.id=$${params.length}`)}if(input.categoryId){params.push(input.categoryId);clauses.push(`f.category_id=$${params.length}`)}if(input.cityId){params.push(input.cityId);clauses.push(`f.city_id=$${params.length}`)}if(input.specialtyId){params.push(input.specialtyId);clauses.push(`cp.specialty_id=$${params.length}`)}if(input.nursingServiceId){params.push(input.nursingServiceId);clauses.push(`EXISTS(SELECT 1 FROM facility_nursing_services sx WHERE sx.facility_id=f.id AND sx.nursing_service_id=$${params.length})`)}
  let distanceSql='NULL::double precision';if(input.coordinates){params.push(input.coordinates.longitude,input.coordinates.latitude);const lon=params.length-1,lat=params.length;distanceSql=`CASE WHEN f.location IS NULL THEN NULL ELSE ST_Distance(f.location,ST_SetSRID(ST_MakePoint($${lon},$${lat}),4326)::geography) END`}
  return{params,clauses,distanceSql};
 }
 private async baseFacilities(input:{provinceId?:string;categoryId?:string;coordinates?:{latitude:number;longitude:number};cityId?:string;specialtyId?:string;nursingServiceId?:string;facilityId?:string},paging?:{limit:number;offset:number}):Promise<BaseRow[]>{
  const{params,clauses,distanceSql}=this.facilityFilterParts(input);let pagingSql='';
  if(paging){params.push(paging.limit,paging.offset);pagingSql=` LIMIT $${params.length-1} OFFSET $${params.length}`}
  return(await this.db.query<BaseRow>(this.baseSelect(distanceSql)+` WHERE ${clauses.join(' AND ')} GROUP BY f.id,cat.id,img.storage_key,cp.doctor_name,ds.name_ar ORDER BY ${input.coordinates?'"distanceMeters" ASC NULLS LAST,':''} f.name ASC${pagingSql}`,params)).rows;
 }
 private async countBaseFacilities(input:{provinceId?:string;categoryId?:string;cityId?:string;specialtyId?:string;nursingServiceId?:string;facilityId?:string}):Promise<number>{
  const{params,clauses}=this.facilityFilterParts(input);const r=await this.db.query<{count:number|string}>(`SELECT COUNT(DISTINCT f.id) AS count ${this.baseFrom()} WHERE ${clauses.join(' AND ')}`,params);return Number(r.rows[0]?.count??0);
 }
 private baseFrom(){return`FROM facilities f JOIN directory_categories cat ON cat.id=f.category_id JOIN directory_category_groups cg ON cg.id=cat.group_id AND cg.is_active=TRUE JOIN directory_category_provinces dcp ON dcp.category_id=cat.id AND dcp.province_id=f.province_id JOIN provinces p ON p.id=f.province_id JOIN cities c ON c.id=f.city_id LEFT JOIN facility_images img ON img.facility_id=f.id AND img.is_primary=TRUE LEFT JOIN ratings r ON r.facility_id=f.id LEFT JOIN medical_clinic_profiles cp ON cp.facility_id=f.id LEFT JOIN doctor_specialties ds ON ds.id=cp.specialty_id`;}
 private baseSelect(distanceSql:string){return`SELECT f.id,cat.specialization,cat.id AS "categoryId",cat.code AS "categoryCode",cat.name_ar AS "categoryNameAr",cat.icon_key AS "categoryIconKey",cat.capabilities AS "categoryCapabilities",COALESCE(f.name,'') AS name,CASE WHEN img.storage_key IS NULL THEN NULL ELSE '/api/v1/media/' || img.storage_key END AS "primaryImageUrl",COALESCE(f.address_text,'') AS "shortAddress",f.province_id AS "provinceId",f.city_id AS "cityId",${distanceSql} AS "distanceMeters",AVG(r.score)::float AS "ratingAverage",COUNT(r.id)::int AS "ratingCount",cp.doctor_name AS "doctorName",ds.name_ar AS "specialtyName" ${this.baseFrom()}`;}
 private toListDto(row:BaseRow,availability:AvailabilityDTO):FacilityListDTO{return{id:row.id,specialization:row.specialization,category:{id:row.categoryId,code:row.categoryCode,nameAr:row.categoryNameAr,iconKey:row.categoryIconKey,capabilities:row.categoryCapabilities},name:row.name,...(row.primaryImageUrl?{primaryImageUrl:row.primaryImageUrl}:{}),shortAddress:row.shortAddress,provinceId:row.provinceId,cityId:row.cityId,...(row.distanceMeters==null?{}:{distanceMeters:Number(row.distanceMeters)}),availability,rating:{...(row.ratingAverage==null?{}:{average:Number(row.ratingAverage)}),count:Number(row.ratingCount)},...(row.doctorName?{doctorName:row.doctorName}:{}),...(row.specialtyName?{specialtyName:row.specialtyName}:{})};}
 private paginationMeta(page:number,pageSize:number,totalItems:number){return{page,pageSize,totalItems,totalPages:totalItems===0?0:Math.ceil(totalItems/pageSize)}}
 private paginate<T>(items:readonly T[],page:number,pageSize:number){const start=(page-1)*pageSize,totalItems=items.length;return{items:items.slice(start,start+pageSize),pagination:this.paginationMeta(page,pageSize,totalItems)}}
 private async availabilityMap(ids:readonly string[]):Promise<Map<string,AvailabilityDTO>>{const now=new Date();if(!ids.length)return new Map();const schedule=await this.loadSchedule(ids),closures=await this.db.query<WindowRow>(`SELECT facility_id AS "facilityId",starts_at AS "startsAt",ends_at AS "endsAt" FROM temporary_closures WHERE facility_id=ANY($1::uuid[]) AND cancelled_at IS NULL AND starts_at<=$2 AND ends_at>$2`,[ids,now.toISOString()]),duties=await this.db.query<DutyRow>(`SELECT facility_id AS "facilityId",MAX(ends_at) AS "endsAt" FROM pharmacy_duty_shifts WHERE facility_id=ANY($1::uuid[]) AND cancelled_at IS NULL AND starts_at<=$2 AND ends_at>$2 GROUP BY facility_id`,[ids,now.toISOString()]);const closureBy=new Map(closures.rows.map(x=>[x.facilityId,x])),dutyBy=new Map(duties.rows.map(x=>[x.facilityId,x])),out=new Map<string,AvailabilityDTO>();for(const id of ids)out.set(id,evaluateAvailability({now,timeZone:APP_TIMEZONE,schedule:schedule.get(id)??[],...(closureBy.get(id)?{temporaryClosure:closureBy.get(id)!}:{}),...(dutyBy.get(id)?{dutyEndsAt:dutyBy.get(id)!.endsAt}:{})}));return out;}
 private async loadSchedule(ids:readonly string[]):Promise<Map<string,FacilityBusinessDayDTO[]>>{const days=await this.db.query<DayRow>(`SELECT facility_id AS "facilityId",id,day_of_week AS "dayOfWeek",is_closed AS "isClosed",is_24_hours AS "is24Hours" FROM facility_business_days WHERE facility_id=ANY($1::uuid[])`,[ids]),periods=await this.db.query<PeriodRow>(`SELECT d.facility_id AS "facilityId",p.business_day_id AS "businessDayId",p.start_time::text AS "startTime",p.end_time::text AS "endTime",p.ends_next_day AS "endsNextDay" FROM business_hours_periods p JOIN facility_business_days d ON d.id=p.business_day_id WHERE d.facility_id=ANY($1::uuid[]) ORDER BY p.sort_order`,[ids]);const map=new Map<string,FacilityBusinessDayDTO[]>();for(const d of days.rows){const arr=map.get(d.facilityId)??[];arr.push({dayOfWeek:d.dayOfWeek,isClosed:d.isClosed,is24Hours:d.is24Hours,periods:periods.rows.filter(p=>p.businessDayId===d.id).map(p=>({startTime:p.startTime.slice(0,5),endTime:p.endTime.slice(0,5),endsNextDay:p.endsNextDay}))});map.set(d.facilityId,arr)}return map;}
}
