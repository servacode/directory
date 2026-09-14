import type { AvailabilityStatus, DayOfWeek } from './enums.js';

export type Identifier = string;
export type IsoDateTime = string;

export interface CoordinatesDTO {
  readonly latitude: number;
  readonly longitude: number;
}

export interface PaginationQuery {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly pagination: PaginationMeta;
}

export interface AvailabilityDTO {
  readonly status: AvailabilityStatus;
  readonly nextOpenAt?: IsoDateTime;
  readonly dutyEndsAt?: IsoDateTime;
  readonly temporaryCloseEndsAt?: IsoDateTime;
  readonly labelKey: string;
}

export interface BusinessHoursPeriodDTO {
  readonly id?: Identifier;
  readonly startTime: string;
  readonly endTime: string;
  readonly endsNextDay: boolean;
}

export interface FacilityBusinessDayDTO {
  readonly dayOfWeek: DayOfWeek;
  readonly isClosed: boolean;
  readonly is24Hours: boolean;
  readonly periods: readonly BusinessHoursPeriodDTO[];
}
