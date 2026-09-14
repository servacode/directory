BEGIN;

CREATE TABLE users (
  id UUID PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE CHECK (phone ~ '^\+9639[0-9]{8}$'),
  password_hash TEXT NOT NULL,
  province_id UUID NOT NULL REFERENCES provinces(id) ON DELETE RESTRICT,
  profile_image_key TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED')),
  system_role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (system_role IN ('USER', 'ADMIN')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  device_name VARCHAR(160),
  device_platform VARCHAR(80),
  app_version VARCHAR(40),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_sessions_expiry_check CHECK (expires_at > created_at)
);

CREATE TABLE facilities (
  id UUID PRIMARY KEY,
  facility_type VARCHAR(40) NOT NULL CHECK (facility_type IN ('PHARMACY', 'MEDICAL_CLINIC', 'NURSING_CENTER', 'MEDICAL_SUPPLIES_CENTER')),
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'CLOSED')),
  name VARCHAR(150),
  phone VARCHAR(20),
  description VARCHAR(500),
  province_id UUID REFERENCES provinces(id) ON DELETE RESTRICT,
  city_id UUID REFERENCES cities(id) ON DELETE RESTRICT,
  neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE RESTRICT,
  address_text VARCHAR(300),
  location GEOGRAPHY(POINT, 4326),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES users(id) ON DELETE SET NULL,
  suspension_reason VARCHAR(500),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT facilities_city_requires_province CHECK (city_id IS NULL OR province_id IS NOT NULL),
  CONSTRAINT facilities_neighborhood_requires_city CHECK (neighborhood_id IS NULL OR city_id IS NOT NULL),
  CONSTRAINT facilities_city_province_fk FOREIGN KEY (city_id, province_id) REFERENCES cities(id, province_id) ON DELETE RESTRICT,
  CONSTRAINT facilities_neighborhood_city_fk FOREIGN KEY (neighborhood_id, city_id) REFERENCES neighborhoods(id, city_id) ON DELETE RESTRICT
);

CREATE TABLE facility_members (
  id UUID PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'MANAGER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT facility_members_unique UNIQUE (facility_id, user_id)
);

CREATE UNIQUE INDEX idx_facility_single_owner
  ON facility_members(facility_id)
  WHERE role = 'OWNER';

CREATE TABLE pharmacy_profiles (
  facility_id UUID PRIMARY KEY REFERENCES facilities(id) ON DELETE CASCADE,
  license_number VARCHAR(120),
  additional_info VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE medical_clinic_profiles (
  facility_id UUID PRIMARY KEY REFERENCES facilities(id) ON DELETE CASCADE,
  doctor_name VARCHAR(120),
  specialty_id UUID REFERENCES doctor_specialties(id) ON DELETE RESTRICT,
  additional_info VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE nursing_center_profiles (
  facility_id UUID PRIMARY KEY REFERENCES facilities(id) ON DELETE CASCADE,
  responsible_person_name VARCHAR(120),
  additional_info VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE facility_nursing_services (
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  nursing_service_id UUID NOT NULL REFERENCES nursing_services(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (facility_id, nursing_service_id)
);

CREATE TABLE facility_images (
  id UUID PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_facility_one_primary_image
  ON facility_images(facility_id)
  WHERE is_primary = TRUE;

CREATE INDEX idx_users_province ON users(province_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_facilities_location ON facilities USING GIST(location);
CREATE INDEX idx_facilities_public_scope ON facilities(province_id, facility_type, status, city_id);
CREATE INDEX idx_facility_members_user ON facility_members(user_id, facility_id);
CREATE INDEX idx_facility_images_facility_sort ON facility_images(facility_id, sort_order);
CREATE INDEX idx_clinic_specialty ON medical_clinic_profiles(specialty_id);
CREATE INDEX idx_facility_nursing_service ON facility_nursing_services(nursing_service_id, facility_id);

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER facilities_set_updated_at BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER pharmacy_profiles_set_updated_at BEFORE UPDATE ON pharmacy_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER clinic_profiles_set_updated_at BEFORE UPDATE ON medical_clinic_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER nursing_profiles_set_updated_at BEFORE UPDATE ON nursing_center_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
