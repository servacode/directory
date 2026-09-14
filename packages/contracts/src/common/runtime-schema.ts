export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class ContractValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '));
    this.name = 'ContractValidationError';
    this.issues = issues;
  }
}

export type SafeParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: ContractValidationError };

export interface RuntimeSchema<T> {
  parse(input: unknown): T;
  safeParse(input: unknown): SafeParseResult<T>;
}

export function defineSchema<T>(parser: (input: unknown) => T): RuntimeSchema<T> {
  return {
    parse: parser,
    safeParse(input: unknown): SafeParseResult<T> {
      try {
        return { success: true, data: parser(input) };
      } catch (error) {
        if (error instanceof ContractValidationError) {
          return { success: false, error };
        }
        throw error;
      }
    },
  };
}

export function issue(path: string, message: string): never {
  throw new ContractValidationError([{ path, message }]);
}

export function asRecord(input: unknown, path = '$'): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return issue(path, 'Expected an object');
  }
  return input as Record<string, unknown>;
}

export function rejectUnknownKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path = '$',
): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(record).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) {
    issue(path, `Unknown field(s): ${unknown.join(', ')}`);
  }
}

export function readString(
  record: Record<string, unknown>,
  key: string,
  options: { min?: number; max?: number; trim?: boolean } = {},
): string {
  const raw = record[key];
  if (typeof raw !== 'string') issue(`$.${key}`, 'Expected a string');
  const value = options.trim === false ? raw : raw.trim();
  if (options.min !== undefined && value.length < options.min) {
    issue(`$.${key}`, `Must contain at least ${options.min} characters`);
  }
  if (options.max !== undefined && value.length > options.max) {
    issue(`$.${key}`, `Must contain at most ${options.max} characters`);
  }
  return value;
}

export function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  options: { min?: number; max?: number; trim?: boolean } = {},
): string | undefined {
  if (record[key] === undefined) return undefined;
  return readString(record, key, options);
}

export function readNullableString(
  record: Record<string, unknown>,
  key: string,
  options: { min?: number; max?: number; trim?: boolean } = {},
): string | null {
  if (record[key] === null) return null;
  return readString(record, key, options);
}

export function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') issue(`$.${key}`, 'Expected a boolean');
  return value;
}

export function readOptionalBoolean(
  record: Record<string, unknown>,
  key: string,
): boolean | undefined {
  if (record[key] === undefined) return undefined;
  return readBoolean(record, key);
}

export function readNumber(
  record: Record<string, unknown>,
  key: string,
  options: { min?: number; max?: number; integer?: boolean } = {},
): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issue(`$.${key}`, 'Expected a finite number');
  }
  if (options.integer && !Number.isInteger(value)) issue(`$.${key}`, 'Expected an integer');
  if (options.min !== undefined && value < options.min) issue(`$.${key}`, `Must be >= ${options.min}`);
  if (options.max !== undefined && value > options.max) issue(`$.${key}`, `Must be <= ${options.max}`);
  return value;
}

export function readOptionalNumber(
  record: Record<string, unknown>,
  key: string,
  options: { min?: number; max?: number; integer?: boolean } = {},
): number | undefined {
  if (record[key] === undefined) return undefined;
  return readNumber(record, key, options);
}

export function readEnum<const T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  values: T,
): T[number] {
  const value = readString(record, key, { trim: false });
  if (!values.includes(value)) issue(`$.${key}`, `Expected one of: ${values.join(', ')}`);
  return value as T[number];
}

export function readOptionalEnum<const T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  values: T,
): T[number] | undefined {
  if (record[key] === undefined) return undefined;
  return readEnum(record, key, values);
}

export function readArray<T>(
  record: Record<string, unknown>,
  key: string,
  parseItem: (input: unknown, index: number) => T,
  options: { min?: number; max?: number } = {},
): T[] {
  const value = record[key];
  if (!Array.isArray(value)) issue(`$.${key}`, 'Expected an array');
  if (options.min !== undefined && value.length < options.min) issue(`$.${key}`, `Must contain at least ${options.min} item(s)`);
  if (options.max !== undefined && value.length > options.max) issue(`$.${key}`, `Must contain at most ${options.max} item(s)`);
  return value.map(parseItem);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseIdentifier(value: unknown, path = '$'): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) issue(path, 'Expected a UUID identifier');
  return value;
}

export function readIdentifier(record: Record<string, unknown>, key: string): string {
  return parseIdentifier(record[key], `$.${key}`);
}

export function readOptionalIdentifier(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  if (record[key] === undefined) return undefined;
  return readIdentifier(record, key);
}

export function parseIsoDateTime(value: unknown, path = '$'): string {
  if (typeof value !== 'string') issue(path, 'Expected an ISO 8601 date-time string');
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) {
    issue(path, 'Expected an ISO 8601 date-time with timezone');
  }
  return value;
}

export function readIsoDateTime(record: Record<string, unknown>, key: string): string {
  return parseIsoDateTime(record[key], `$.${key}`);
}

export function readOptionalIsoDateTime(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  if (record[key] === undefined) return undefined;
  return readIsoDateTime(record, key);
}

export function parseCoordinates(value: unknown, path = '$'): { latitude: number; longitude: number } {
  const record = asRecord(value, path);
  rejectUnknownKeys(record, ['latitude', 'longitude'], path);
  const latitude = record['latitude'];
  const longitude = record['longitude'];
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    issue(`${path}.latitude`, 'Expected latitude between -90 and 90');
  }
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    issue(`${path}.longitude`, 'Expected longitude between -180 and 180');
  }
  return { latitude, longitude };
}

export function readCoordinates(
  record: Record<string, unknown>,
  key: string,
): { latitude: number; longitude: number } {
  return parseCoordinates(record[key], `$.${key}`);
}

const TIME_24H_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SYRIAN_MOBILE_RE = /^(?:\+9639\d{8}|09\d{8})$/;

export function parseTime24(value: unknown, path = '$'): string {
  if (typeof value !== 'string' || !TIME_24H_RE.test(value)) issue(path, 'Expected time in HH:mm format');
  return value;
}

export function readTime24(record: Record<string, unknown>, key: string): string {
  return parseTime24(record[key], `$.${key}`);
}

export function parseSyrianMobile(value: unknown, path = '$'): string {
  if (typeof value !== 'string') issue(path, 'Expected a Syrian mobile phone number');
  const normalizedInput = value.replace(/[\s()-]/g, '');
  if (!SYRIAN_MOBILE_RE.test(normalizedInput)) {
    issue(path, 'Expected Syrian mobile format 09xxxxxxxx or +9639xxxxxxxx');
  }
  return normalizedInput;
}

export function readSyrianMobile(record: Record<string, unknown>, key: string): string {
  return parseSyrianMobile(record[key], `$.${key}`);
}
