import type {
  DeviceLocationDTO,
  GpsStatus,
  LocationMode,
  LocationPermissionStatus,
  LocationRuntimeStateDTO,
  ManualLocationSelection,
} from '@health/contracts';

export interface LocationPermissionAdapter {
  check(): Promise<LocationPermissionStatus>;
  request(): Promise<LocationPermissionStatus>;
  openSettings(): Promise<void>;
}

export interface DeviceLocationAdapter {
  gpsStatus(): Promise<GpsStatus>;
  currentPosition(): Promise<DeviceLocationDTO>;
}

export interface LocationStateStorage {
  load(): Promise<LocationRuntimeStateDTO | null>;
  save(state: LocationRuntimeStateDTO): Promise<void>;
}

export interface Clock { nowMs(): number; }

export class LocationService {
  constructor(
    private readonly permission: LocationPermissionAdapter,
    private readonly device: DeviceLocationAdapter,
    private readonly storage: LocationStateStorage,
    private readonly maxCacheAgeMs: number,
    private readonly clock: Clock = { nowMs: () => Date.now() },
  ) {}

  async restore(): Promise<LocationRuntimeStateDTO | null> {
    const cached = await this.storage.load();
    if (!cached) return null;
    if (cached.mode === 'DEVICE_LOCATION' && cached.deviceLocation) {
      const age = this.clock.nowMs() - Date.parse(cached.deviceLocation.capturedAt);
      if (!Number.isFinite(age) || age > this.maxCacheAgeMs) return null;
    }
    return cached;
  }

  async useCurrentLocation(requestPermission = true): Promise<LocationRuntimeStateDTO> {
    let permissionStatus = await this.permission.check();
    if (permissionStatus !== 'GRANTED' && requestPermission && permissionStatus !== 'BLOCKED' && permissionStatus !== 'UNAVAILABLE') {
      permissionStatus = await this.permission.request();
    }
    if (permissionStatus !== 'GRANTED') {
      const gpsStatus = await this.device.gpsStatus();
      const state: LocationRuntimeStateDTO = { mode: 'MANUAL_LOCATION', permissionStatus, gpsStatus };
      await this.storage.save(state);
      return state;
    }
    try {
      const deviceLocation = await this.device.currentPosition();
      const state: LocationRuntimeStateDTO = {
        mode: 'DEVICE_LOCATION', permissionStatus, gpsStatus: 'ENABLED', deviceLocation,
      };
      await this.storage.save(state);
      return state;
    } catch {
      const gpsStatus = await this.device.gpsStatus();
      const state: LocationRuntimeStateDTO = { mode: 'MANUAL_LOCATION', permissionStatus, gpsStatus };
      await this.storage.save(state);
      return state;
    }
  }

  async useManualLocation(selection: ManualLocationSelection): Promise<LocationRuntimeStateDTO> {
    const permissionStatus = await this.permission.check();
    const gpsStatus = await this.device.gpsStatus();
    const state: LocationRuntimeStateDTO = {
      mode: 'MANUAL_LOCATION', permissionStatus, gpsStatus,
      provinceId: selection.provinceId,
      ...(selection.cityId ? { cityId: selection.cityId } : {}),
      ...(selection.neighborhoodId ? { neighborhoodId: selection.neighborhoodId } : {}),
    };
    await this.storage.save(state);
    return state;
  }

  openApplicationSettings(): Promise<void> { return this.permission.openSettings(); }
}

export function locationModeHasPreciseCoordinates(state: LocationRuntimeStateDTO): state is LocationRuntimeStateDTO & { mode: 'DEVICE_LOCATION'; deviceLocation: DeviceLocationDTO } {
  return state.mode === 'DEVICE_LOCATION' && state.deviceLocation !== undefined;
}

export function preferredLocationMode(current: LocationRuntimeStateDTO | null): LocationMode {
  return current?.mode ?? 'MANUAL_LOCATION';
}
