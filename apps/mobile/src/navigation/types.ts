export type RootStackParamList={
 Tabs:undefined;ProvincePicker:undefined;Directory:{categoryId:string;specialtyId?:string;specialtyName?:string};FacilityDetail:{facilityId:string};
 Login:{returnTo?:keyof RootStackParamList}|undefined;Register:undefined;Recovery:undefined;ChangePassword:undefined;MyFacilities:undefined;MyRatings:undefined;JoinFacility:{facilityId?:string}|undefined;ManageFacility:{facilityId:string};Duty:{facilityId:string;facilityName?:string};
};
export type TabParamList={Home:undefined;Search:undefined;Map:undefined;Account:undefined};
