import type {
  CreateFacilityDraftRequest,
  CreateDutyShiftRequest,
  OwnerFacilityDTO,
  OwnerFacilityDetailDTO,
  PharmacyDutyShiftDTO,
  QuickDutyRequest,
  SubmitFacilityRequest,
  UpdateBusinessHoursRequest,
  UpdateDutyShiftRequest,
  UpdateFacilityBasicInfoRequest,
  UpdateFacilityLocationRequest,
  UpdateMedicalClinicProfileRequest,
  UpdateNursingCenterProfileRequest,
  UpdatePharmacyProfileRequest,
  FacilityImageDTO,
  TemporaryClosureDTO,
  TemporaryClosureRequest,
} from '@health/contracts';
import type { ReliableApiClient } from '../platform/network/reliable-api-client.js';
import type { NativeUploadFile, UploadTransport } from '../platform/network/upload-transport.js';

export class OwnerApi {
  constructor(private readonly client: ReliableApiClient,private readonly upload:UploadTransport) {}
  mine(){return this.client.request<OwnerFacilityDTO[]>({method:'GET',path:'/facilities/mine'});}
  detail(id:string){return this.client.request<OwnerFacilityDetailDTO>({method:'GET',path:`/facilities/mine/${encodeURIComponent(id)}`});}
  createDraft(input:CreateFacilityDraftRequest){return this.client.request<{id:string;specialization:string;categoryId:string;categoryCode:string;status:'DRAFT'}>({method:'POST',path:'/facilities/drafts',body:input});}
  basic(id:string,input:UpdateFacilityBasicInfoRequest){return this.client.request<{ok:true}>({method:'PATCH',path:`/facilities/${id}/basic-info`,body:input});}
  location(id:string,input:UpdateFacilityLocationRequest){return this.client.request<{ok:true}>({method:'PATCH',path:`/facilities/${id}/location`,body:input});}
  hours(id:string,input:UpdateBusinessHoursRequest){return this.client.request<{ok:true}>({method:'PUT',path:`/facilities/${id}/business-hours`,body:input});}
  pharmacyProfile(id:string,input:UpdatePharmacyProfileRequest){return this.client.request<{ok:true}>({method:'PATCH',path:`/facilities/${id}/pharmacy-profile`,body:input});}
  clinicProfile(id:string,input:UpdateMedicalClinicProfileRequest){return this.client.request<{ok:true}>({method:'PATCH',path:`/facilities/${id}/clinic-profile`,body:input});}
  nursingProfile(id:string,input:UpdateNursingCenterProfileRequest){return this.client.request<{ok:true}>({method:'PATCH',path:`/facilities/${id}/nursing-profile`,body:input});}

  images(id:string){return this.client.request<FacilityImageDTO[]>({method:'GET',path:`/facilities/${id}/images`});}
  uploadImage(id:string,file:NativeUploadFile){return this.upload.image<FacilityImageDTO>(`/facilities/${id}/images`,file);}
  primaryImage(id:string,imageId:string){return this.client.request<{ok:true}>({method:'POST',path:`/facilities/${id}/images/${imageId}/primary`,body:{}});}
  reorderImages(id:string,imageIds:readonly string[]){return this.client.request<{ok:true}>({method:'PATCH',path:`/facilities/${id}/images/order`,body:{imageIds}});}
  deleteImage(id:string,imageId:string){return this.client.request<{ok:true}>({method:'DELETE',path:`/facilities/${id}/images/${imageId}`});}
  activeClosure(id:string){return this.client.request<TemporaryClosureDTO|null>({method:'GET',path:`/facilities/${id}/temporary-closures/active`});}
  createClosure(id:string,input:TemporaryClosureRequest){return this.client.request<TemporaryClosureDTO>({method:'POST',path:`/facilities/${id}/temporary-closures`,body:input});}
  cancelClosure(id:string,closureId:string){return this.client.request<{ok:true}>({method:'POST',path:`/facilities/${id}/temporary-closures/${closureId}/cancel`,body:{}});}

  verification(id:string){return this.client.request<any>({method:'GET',path:`/facilities/${id}/verification`});}
  uploadVerification(id:string,requirementId:string,file:NativeUploadFile){return this.upload.image<any>(`/facilities/${id}/verification/${requirementId}/evidence`,file);}
  deleteVerification(id:string,evidenceId:string){return this.client.request<{ok:true}>({method:'DELETE',path:`/facilities/${id}/verification/evidence/${evidenceId}`});}
  requestReverification(id:string,reason?:string){return this.client.request<{status:'REVERIFICATION_REQUIRED'}>({method:'POST',path:`/facilities/${id}/request-reverification`,body:reason?{reason}:{}});}
  submit(id:string,input:SubmitFacilityRequest={acknowledgeAccuracy:true}){return this.client.request<{applicationId:string;status:'PENDING_REVIEW'}>({method:'POST',path:`/facilities/${id}/submit`,body:input});}
  duty(id:string){return this.client.request<PharmacyDutyShiftDTO[]>({method:'GET',path:`/facilities/${id}/duty-shifts`});}
  dutyNow(id:string,input:QuickDutyRequest){return this.client.request<PharmacyDutyShiftDTO>({method:'POST',path:`/facilities/${id}/duty-shifts/now`,body:input});}
  createDuty(id:string,input:CreateDutyShiftRequest){return this.client.request<PharmacyDutyShiftDTO>({method:'POST',path:`/facilities/${id}/duty-shifts`,body:input});}
  updateDuty(id:string,shiftId:string,input:UpdateDutyShiftRequest){return this.client.request<PharmacyDutyShiftDTO>({method:'PATCH',path:`/facilities/${id}/duty-shifts/${shiftId}`,body:input});}
  cancelDuty(id:string,shiftId:string,reason?:string){return this.client.request<{ok:true}>({method:'POST',path:`/facilities/${id}/duty-shifts/${shiftId}/cancel`,body:reason?{reason}:{}});}
}
