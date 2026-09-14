BEGIN;
CREATE TABLE platform_settings (
  key VARCHAR(120) PRIMARY KEY,
  value_json JSONB NOT NULL,
  value_type VARCHAR(20) NOT NULL CHECK (value_type IN ('boolean','integer','string')),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
