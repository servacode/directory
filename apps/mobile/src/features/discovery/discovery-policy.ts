import type { DirectoryCategoryDTO } from '@health/contracts';

export interface DiscoveryPolicy {
  readonly requiresSpecialty:boolean;
  readonly allowsDutyFilter:boolean;
  readonly allowsServiceFilter:boolean;
}

export function discoveryPolicy(category:Pick<DirectoryCategoryDTO,'capabilities'>):DiscoveryPolicy{
  return{
    requiresSpecialty:category.capabilities.specialtyFilter===true,
    allowsDutyFilter:category.capabilities.duty===true,
    allowsServiceFilter:category.capabilities.serviceFilter===true,
  };
}

export function emptyStateKey(category:Pick<DirectoryCategoryDTO,'specialization'|'capabilities'>,dutyNow=false){
  if(dutyNow&&category.capabilities.duty===true)return'discovery.empty.dutyPharmacies' as const;
  if(category.specialization==='MEDICAL_CLINIC')return'discovery.empty.clinics' as const;
  if(category.specialization==='NURSING_CENTER')return'discovery.empty.nursing' as const;
  if(category.specialization==='PHARMACY')return'discovery.empty.pharmacies' as const;
  return'discovery.empty.category' as const;
}
