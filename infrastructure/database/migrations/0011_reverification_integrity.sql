BEGIN;

ALTER TABLE facilities DROP CONSTRAINT IF EXISTS facilities_status_check;
ALTER TABLE facilities ADD CONSTRAINT facilities_status_check
  CHECK (status IN ('DRAFT','PENDING_REVIEW','ACTIVE','REJECTED','REVERIFICATION_REQUIRED','SUSPENDED','CLOSED'));

ALTER TABLE facilities
  ADD COLUMN reverification_requested_at TIMESTAMPTZ,
  ADD COLUMN reverification_requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN reverification_reason VARCHAR(500);

CREATE INDEX idx_facilities_reverification
  ON facilities(status, reverification_requested_at)
  WHERE status = 'REVERIFICATION_REQUIRED';

COMMIT;
