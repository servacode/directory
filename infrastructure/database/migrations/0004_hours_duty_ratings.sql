BEGIN;

CREATE TABLE facility_business_days (
  id UUID PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  is_24_hours BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_day_unique UNIQUE (facility_id, day_of_week),
  CONSTRAINT business_day_state_check CHECK (NOT (is_closed AND is_24_hours))
);

CREATE TABLE business_hours_periods (
  id UUID PRIMARY KEY,
  business_day_id UUID NOT NULL REFERENCES facility_business_days(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  ends_next_day BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_period_nonzero CHECK (start_time <> end_time),
  CONSTRAINT business_period_direction CHECK (
    (ends_next_day = FALSE AND end_time > start_time)
    OR
    (ends_next_day = TRUE AND end_time < start_time)
  )
);

CREATE TABLE temporary_closures (
  id UUID PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason VARCHAR(300),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT temporary_closure_range_check CHECK (ends_at > starts_at),
  CONSTRAINT temporary_closure_cancel_check CHECK (cancelled_at IS NULL OR cancelled_at >= created_at)
);

ALTER TABLE temporary_closures
  ADD CONSTRAINT temporary_closures_no_overlap
  EXCLUDE USING GIST (
    facility_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (cancelled_at IS NULL);

CREATE TABLE pharmacy_duty_shifts (
  id UUID PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT duty_shift_range_check CHECK (ends_at > starts_at),
  CONSTRAINT duty_shift_cancel_check CHECK (cancelled_at IS NULL OR cancelled_at >= created_at)
);

ALTER TABLE pharmacy_duty_shifts
  ADD CONSTRAINT pharmacy_duty_shifts_no_overlap
  EXCLUDE USING GIST (
    facility_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (cancelled_at IS NULL);

CREATE TABLE ratings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ratings_user_facility_unique UNIQUE (user_id, facility_id)
);

CREATE INDEX idx_business_days_facility ON facility_business_days(facility_id, day_of_week);
CREATE INDEX idx_business_periods_day_sort ON business_hours_periods(business_day_id, sort_order);
CREATE INDEX idx_temporary_closures_facility_time ON temporary_closures(facility_id, starts_at, ends_at) WHERE cancelled_at IS NULL;
CREATE INDEX idx_duty_shifts_facility_time ON pharmacy_duty_shifts(facility_id, starts_at, ends_at) WHERE cancelled_at IS NULL;
CREATE INDEX idx_ratings_facility ON ratings(facility_id);

CREATE TRIGGER facility_business_days_set_updated_at BEFORE UPDATE ON facility_business_days FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER business_hours_periods_set_updated_at BEFORE UPDATE ON business_hours_periods FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER duty_shifts_set_updated_at BEFORE UPDATE ON pharmacy_duty_shifts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER ratings_set_updated_at BEFORE UPDATE ON ratings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
