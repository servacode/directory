import type { AuthResponseDTO, CategoryProvinceActivationRequest, CreateDirectoryCategoryGroupRequest, CreateDirectoryCategoryRequest, DirectoryCategoryDTO, DirectoryCategoryGroupDTO, FacilityStatus, UpdateDirectoryCategoryGroupRequest, UpdateDirectoryCategoryRequest, UpsertVerificationRequirementRequest } from '@health/contracts';
const base=(process.env.NEXT_PUBLIC_API_URL??'').replace(/\/$/,'');
if(!base)throw new Error('NEXT_PUBLIC_API_URL is required');
export interface AdminSession{accessToken:string;accessTokenExpiresAt:string;}
export class AdminApi{
 private session?:AdminSession;
 constructor(){}
 isAuthenticated(){return Boolean(this.session?.accessToken)}
 async login(phone:string,password:string){const data=await this.request<{user:AuthResponseDTO['user'];accessToken:string;accessTokenExpiresAt:string}>('/auth/admin/login',{method:'POST',body:{phone,password}},false);if(data.user.systemRole!=='ADMIN')throw new Error('FORBIDDEN');this.session={accessToken:data.accessToken,accessTokenExpiresAt:data.accessTokenExpiresAt};return data.user}
 async restore(){return this.refresh()}
 async logout(){try{if(this.session?.accessToken)await this.request<{ok:true}>('/auth/admin/logout',{method:'POST'},true,false)}finally{this.session=undefined}}
 applications(status='PENDING',page=1,pageSize=25){return this.request<any>(`/admin/facility-applications?status=${encodeURIComponent(status)}&page=${page}&pageSize=${pageSize}`)}
 application(id:string){return this.request<any>(`/admin/facility-applications/${id}`)}
 approve(id:string){return this.request<any>(`/admin/facility-applications/${id}/approve`,{method:'POST'})}
 reject(id:string,reason:string){return this.request<any>(`/admin/facility-applications/${id}/reject`,{method:'POST',body:{reason}})}
 facilities(status?:FacilityStatus,page=1,pageSize=25){const q=new URLSearchParams({page:String(page),pageSize:String(pageSize)});if(status)q.set('status',status);return this.request<any>(`/admin/facilities?${q}`)}
 auditLogs(page=1,pageSize=50){return this.request<any>(`/admin/audit-logs?page=${page}&pageSize=${pageSize}`)}
 suspend(id:string,reason:string){return this.request<any>(`/admin/facilities/${id}/suspend`,{method:'POST',body:{reason}})}
 reactivate(id:string){return this.request<any>(`/admin/facilities/${id}/reactivate`,{method:'POST'})}
 verification(facilityId:string){return this.request<any>(`/admin/facilities/${facilityId}/verification`)}
 async verificationEvidenceUrl(facilityId:string,evidenceId:string):Promise<string>{const response=await this.fetchAuthenticated(`/admin/facilities/${facilityId}/verification/evidence/${evidenceId}/content`);if(!response.ok)throw new Error(`HTTP_${response.status}`);return URL.createObjectURL(await response.blob())}
 references(kind:string,parentId?:string){return this.request<any[]>(`/admin/reference/${kind}${parentId?`?parentId=${encodeURIComponent(parentId)}`:''}`)}
 createReference(kind:string,input:unknown,parentId?:string){return this.request<any>(`/admin/reference/${kind}${parentId?`?parentId=${encodeURIComponent(parentId)}`:''}`,{method:'POST',body:input})}
 updateReference(kind:string,id:string,input:unknown,parentId?:string){return this.request<any>(`/admin/reference/${kind}/${id}${parentId?`?parentId=${encodeURIComponent(parentId)}`:''}`,{method:'PATCH',body:input})}
 directoryGroups(){return this.request<DirectoryCategoryGroupDTO[]>('/admin/directory/groups')}
 createDirectoryGroup(input:CreateDirectoryCategoryGroupRequest){return this.request<{id:string}>('/admin/directory/groups',{method:'POST',body:input})}
 updateDirectoryGroup(id:string,input:UpdateDirectoryCategoryGroupRequest){return this.request(`/admin/directory/groups/${id}`,{method:'PATCH',body:input})}
 directoryCategories(provinceId:string){return this.request<DirectoryCategoryDTO[]>(`/admin/directory/categories?provinceId=${encodeURIComponent(provinceId)}`)}
 createDirectoryCategory(input:CreateDirectoryCategoryRequest){return this.request<{id:string}>('/admin/directory/categories',{method:'POST',body:input})}
 updateDirectoryCategory(id:string,input:UpdateDirectoryCategoryRequest){return this.request(`/admin/directory/categories/${id}`,{method:'PATCH',body:input})}
 setCategoryProvince(id:string,provinceId:string,input:CategoryProvinceActivationRequest){return this.request(`/admin/directory/categories/${id}/provinces/${provinceId}`,{method:'PUT',body:input})}
 verificationRequirements(categoryId:string){return this.request<any[]>(`/admin/directory/categories/${categoryId}/verification-requirements`)}
 createVerificationRequirement(categoryId:string,input:UpsertVerificationRequirementRequest){return this.request(`/admin/directory/categories/${categoryId}/verification-requirements`,{method:'POST',body:input})}
 updateVerificationRequirement(categoryId:string,requirementId:string,input:UpsertVerificationRequirementRequest){return this.request(`/admin/directory/categories/${categoryId}/verification-requirements/${requirementId}`,{method:'PATCH',body:input})}
 settings(){return this.request<any[]>('/admin/settings')}
 setSetting(key:string,value:unknown){return this.request<any>(`/admin/settings/${encodeURIComponent(key)}`,{method:'PATCH',body:{value}})}
 private async refresh(){const response=await fetch(`${base}/auth/admin/refresh`,{method:'POST',headers:{accept:'application/json'},credentials:'include'});if(!response.ok){this.session=undefined;return false}const data=await response.json() as {user:AuthResponseDTO['user'];accessToken:string;accessTokenExpiresAt:string};if(data.user.systemRole!=='ADMIN'){this.session=undefined;return false}this.session={accessToken:data.accessToken,accessTokenExpiresAt:data.accessTokenExpiresAt};return true}
 private async fetchAuthenticated(path:string,retried=false):Promise<Response>{const response=await fetch(`${base}${path}`,{credentials:'include',headers:{accept:'*/*',...(this.session?.accessToken?{authorization:`Bearer ${this.session.accessToken}`}:{})}});if(response.status===401&&!retried&&await this.refresh())return this.fetchAuthenticated(path,true);return response}
 private async request<T>(path:string,init:{method?:string;body?:unknown}={},authenticated=true,retried=false):Promise<T>{const response=await fetch(`${base}${path}`,{method:init.method??'GET',credentials:'include',headers:{accept:'application/json',...(init.body===undefined?{}:{'content-type':'application/json'}),...(authenticated&&this.session?.accessToken?{authorization:`Bearer ${this.session.accessToken}`}:{})},...(init.body===undefined?{}:{body:JSON.stringify(init.body)})});if(response.status===401&&authenticated&&!retried&&await this.refresh())return this.request<T>(path,init,authenticated,true);if(!response.ok)throw new Error(`HTTP_${response.status}`);return response.status===204?undefined as T:response.json() as Promise<T>}
}
