import type { PublicUserDTO, RatingDTO } from '@health/contracts';
import type { ReliableApiClient } from '../platform/network/reliable-api-client.js';
export interface MyRatingItem extends RatingDTO { readonly name:string; readonly type:string; readonly primaryImageUrl?:string; }
export class AccountApi{
 constructor(private readonly client:ReliableApiClient){}
 updateName(fullName:string){return this.client.request<PublicUserDTO>({method:'PATCH',path:'/users/me',body:{fullName}})}
 ratings(){return this.client.request<MyRatingItem[]>({method:'GET',path:'/users/me/ratings'})}
 putRating(facilityId:string,score:1|2|3|4|5){return this.client.request<RatingDTO>({method:'PUT',path:`/facilities/${facilityId}/rating`,body:{score}})}
}
