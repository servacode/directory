import { asRecord, defineSchema, readNumber, rejectUnknownKeys } from '../common/runtime-schema.js';
import type { Identifier, IsoDateTime } from '../common/types.js';

export interface RatingDTO {
  readonly id: Identifier;
  readonly facilityId: Identifier;
  readonly score: number;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface PutRatingRequest {
  readonly score: 1 | 2 | 3 | 4 | 5;
}

export const putRatingRequestSchema = defineSchema<PutRatingRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['score']);
  const score = readNumber(record, 'score', { integer: true, min: 1, max: 5 });
  return { score: score as 1 | 2 | 3 | 4 | 5 };
});
