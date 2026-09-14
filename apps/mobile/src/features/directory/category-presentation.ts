import type { DirectoryCategoryDTO } from '@health/contracts';
import type { IconKey } from '@health/icon-registry';
const supported = new Set<IconKey>(['pharmacy','doctor','nursing','medicalSupplies','store','lab']);
export function categoryIconKey(category:Pick<DirectoryCategoryDTO,'iconKey'>):IconKey{return supported.has(category.iconKey as IconKey)?category.iconKey as IconKey:'store'}
export function categoryRequiresSpecialty(category:DirectoryCategoryDTO){return category.capabilities.specialtyFilter===true}
export function categoryAllowsDuty(category:DirectoryCategoryDTO){return category.capabilities.duty===true}
export function categoryAllowsServiceFilter(category:DirectoryCategoryDTO){return category.capabilities.serviceFilter===true}
