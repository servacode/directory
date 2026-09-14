import type { CoordinatesDTO, FacilityMapPinDTO, GeoBoundsDTO } from '@health/contracts';
import type { IconKey } from '@health/icon-registry';

export interface MapCameraTarget {
  readonly center: CoordinatesDTO;
  readonly zoom: number;
}

export interface MapViewportState {
  readonly bounds: GeoBoundsDTO;
  readonly center: CoordinatesDTO;
  readonly zoom: number;
}

export interface MapProvider {
  setCamera(target: MapCameraTarget): Promise<void>;
  fitCoordinates(coordinates: readonly CoordinatesDTO[]): Promise<void>;
  currentViewport(): Promise<MapViewportState>;
}

export interface MapPinPresentation {
  readonly id: string;
  readonly iconKey: IconKey;
  readonly status: FacilityMapPinDTO['availability']['status'];
  readonly showDutyIndicator: boolean;
}

export function facilityPinPresentation(pin: FacilityMapPinDTO): MapPinPresentation {
  const known = new Set<IconKey>(['pharmacy','doctor','nursing','medicalSupplies','store','lab']);
  const iconKey = known.has(pin.categoryIconKey as IconKey) ? pin.categoryIconKey as IconKey : 'store';
  return {
    id: pin.id,
    iconKey,
    status: pin.availability.status,
    showDutyIndicator: pin.specialization === 'PHARMACY' && pin.availability.status === 'DUTY_NOW',
  };
}
