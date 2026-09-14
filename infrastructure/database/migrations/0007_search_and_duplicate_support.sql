BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_facilities_name_trgm
  ON facilities USING GIN (LOWER(COALESCE(name, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm
  ON users USING GIN (LOWER(full_name) gin_trgm_ops);

COMMIT;
