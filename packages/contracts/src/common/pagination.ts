import { asRecord, defineSchema, readOptionalNumber, rejectUnknownKeys } from './runtime-schema.js';
import type { PaginationQuery } from './types.js';

export const paginationQuerySchema = defineSchema<PaginationQuery>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['page', 'pageSize']);
  const page = readOptionalNumber(record, 'page', { integer: true, min: 1 });
  const pageSize = readOptionalNumber(record, 'pageSize', { integer: true, min: 1, max: 100 });
  return {
    ...(page === undefined ? {} : { page }),
    ...(pageSize === undefined ? {} : { pageSize }),
  };
});
