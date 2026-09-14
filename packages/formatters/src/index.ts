export function formatDistance(meters: number, locale: 'ar'|'en'='ar'): string {
  if (!Number.isFinite(meters) || meters < 0) throw new RangeError('distance must be a non-negative finite number');
  if (meters < 1000) return locale === 'ar' ? `${Math.round(meters)} م` : `${Math.round(meters)} m`;
  const km = Math.round((meters / 1000) * 10) / 10;
  return locale === 'ar' ? `${km} كم` : `${km} km`;
}
export function formatRating(value: number): string { return value.toFixed(1); }
export function normalizeSyrianPhone(input: string): string | null {
  const digits = input.replace(/[^0-9+]/g, '');
  if (/^09\d{8}$/.test(digits)) return `+963${digits.slice(1)}`;
  if (/^\+9639\d{8}$/.test(digits)) return digits;
  if (/^9639\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}
