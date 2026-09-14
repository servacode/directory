BEGIN;

CREATE INDEX IF NOT EXISTS idx_audit_created_at
  ON audit_logs(created_at DESC, id DESC);

COMMIT;
