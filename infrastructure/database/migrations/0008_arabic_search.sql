BEGIN;

CREATE OR REPLACE FUNCTION normalize_arabic(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT BTRIM(
    REGEXP_REPLACE(
      REPLACE(REPLACE(REPLACE(REPLACE(
        REGEXP_REPLACE(COALESCE(input, ''), '[ًٌٍَُِّْـٰ]', '', 'g'),
        'أ','ا'),'إ','ا'),'آ','ا'),'ى','ي'),
      '\s+', ' ', 'g'
    )
  );
$$;

CREATE INDEX IF NOT EXISTS idx_facilities_name_arabic_trgm
  ON facilities USING GIN (normalize_arabic(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clinic_doctor_name_arabic_trgm
  ON medical_clinic_profiles USING GIN (normalize_arabic(doctor_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_specialty_name_arabic_trgm
  ON doctor_specialties USING GIN (normalize_arabic(name_ar) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_nursing_service_name_arabic_trgm
  ON nursing_services USING GIN (normalize_arabic(name_ar) gin_trgm_ops);

COMMIT;
