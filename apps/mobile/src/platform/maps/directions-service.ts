import type { CoordinatesDTO } from '@health/contracts';

export interface DirectionsAdapter {
  openExternalDirections(destination: CoordinatesDTO, label?: string): Promise<boolean>;
}

export class DirectionsService {
  constructor(private readonly adapter: DirectionsAdapter) {}
  open(destination: CoordinatesDTO, label?: string): Promise<boolean> {
    return this.adapter.openExternalDirections(destination, label);
  }
}
