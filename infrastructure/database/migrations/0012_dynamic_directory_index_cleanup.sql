BEGIN;

-- The pre-dynamic-taxonomy index was created while the second key was the public
-- facility type. Migration 0010 renamed that column to internal `specialization`
-- and created the category-driven public index below. Keeping the legacy index
-- adds write amplification and invites accidental query coupling to specialization.
DROP INDEX IF EXISTS idx_facilities_public_scope;

-- Keep the category-driven public-scope index as the only broad public directory index.
CREATE INDEX IF NOT EXISTS idx_facilities_category_public_scope
  ON facilities(province_id, category_id, status, city_id);

COMMIT;
