import type { FacilityListDTO } from '../facilities/index.js';
import type { Identifier } from '../common/types.js';

export interface HomeResponseDTO {
  readonly provinceId: Identifier;
  readonly dutyPharmacies: readonly FacilityListDTO[];
  readonly openNearby: readonly FacilityListDTO[];
  readonly nearbyFacilities: readonly FacilityListDTO[];
}
