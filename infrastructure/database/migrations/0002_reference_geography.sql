BEGIN;

CREATE TABLE provinces (
  id UUID PRIMARY KEY,
  country_code CHAR(2) NOT NULL DEFAULT 'SY' CHECK (country_code = 'SY'),
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provinces_name_ar_unique UNIQUE (name_ar)
);

CREATE TABLE cities (
  id UUID PRIMARY KEY,
  province_id UUID NOT NULL REFERENCES provinces(id) ON DELETE RESTRICT,
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cities_province_name_unique UNIQUE (province_id, name_ar),
  CONSTRAINT cities_id_province_unique UNIQUE (id, province_id)
);

CREATE TABLE neighborhoods (
  id UUID PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT neighborhoods_city_name_unique UNIQUE (city_id, name_ar),
  CONSTRAINT neighborhoods_id_city_unique UNIQUE (id, city_id)
);

CREATE TABLE doctor_specialties (
  id UUID PRIMARY KEY,
  name_ar VARCHAR(120) NOT NULL UNIQUE,
  name_en VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE nursing_services (
  id UUID PRIMARY KEY,
  name_ar VARCHAR(120) NOT NULL UNIQUE,
  name_en VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cities_province_active ON cities(province_id, is_active, sort_order);
CREATE INDEX idx_neighborhoods_city_active ON neighborhoods(city_id, is_active, sort_order);
CREATE INDEX idx_specialties_active_sort ON doctor_specialties(is_active, sort_order);
CREATE INDEX idx_nursing_services_active_sort ON nursing_services(is_active, sort_order);

CREATE TRIGGER provinces_set_updated_at BEFORE UPDATE ON provinces FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER cities_set_updated_at BEFORE UPDATE ON cities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER neighborhoods_set_updated_at BEFORE UPDATE ON neighborhoods FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER specialties_set_updated_at BEFORE UPDATE ON doctor_specialties FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER nursing_services_set_updated_at BEFORE UPDATE ON nursing_services FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
