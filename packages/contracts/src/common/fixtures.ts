import type { FacilityBusinessDayDTO } from './types.js';

export const CONTRACT_FIXTURE_IDS = {
  user: '11111111-1111-4111-8111-111111111111',
  province: '22222222-2222-4222-8222-222222222222',
  city: '33333333-3333-4333-8333-333333333333',
  facility: '44444444-4444-4444-8444-444444444444',
  specialty: '55555555-5555-4555-8555-555555555555',
} as const;

export const STANDARD_WEEK_FIXTURE: readonly FacilityBusinessDayDTO[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
].map((dayOfWeek) => ({
  dayOfWeek: dayOfWeek as FacilityBusinessDayDTO['dayOfWeek'],
  isClosed: false,
  is24Hours: false,
  periods: [{ startTime: '08:00', endTime: '20:00', endsNextDay: false }],
}));
