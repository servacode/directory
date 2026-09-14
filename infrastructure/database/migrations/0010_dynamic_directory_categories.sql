BEGIN;

-- Directory taxonomy is data, not an application enum. A category may be made public
-- or opened for owner registration independently without an app release.
CREATE TABLE directory_category_groups (
  id UUID PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_]+$'),
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE directory_categories (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES directory_category_groups(id) ON DELETE RESTRICT,
  code VARCHAR(80) NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_]+$'),
  slug VARCHAR(100) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  icon_key VARCHAR(80) NOT NULL DEFAULT 'store',
  -- specialization is an internal implementation hint, never the public taxonomy.
  -- GENERIC categories require no category-specific source-code branch.
  specialization VARCHAR(40) NOT NULL DEFAULT 'GENERIC'
    CHECK (specialization IN ('GENERIC','PHARMACY','MEDICAL_CLINIC','NURSING_CENTER')),
  capabilities JSONB NOT NULL DEFAULT '{"businessHours":true,"photos":true,"ratings":true}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT directory_categories_capabilities_object CHECK (jsonb_typeof(capabilities) = 'object')
);

CREATE TABLE directory_category_provinces (
  category_id UUID NOT NULL REFERENCES directory_categories(id) ON DELETE CASCADE,
  province_id UUID NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
  -- Province activation is the source of truth for public visibility and owner registration.
  public_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  owner_registration_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (category_id, province_id)
);

CREATE TABLE category_verification_requirements (
  id UUID PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES directory_categories(id) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL CHECK (code ~ '^[A-Z0-9_]+$'),
  label_ar VARCHAR(160) NOT NULL,
  label_en VARCHAR(160),
  instructions_ar VARCHAR(500),
  instructions_en VARCHAR(500),
  evidence_kind VARCHAR(30) NOT NULL DEFAULT 'IMAGE'
    CHECK (evidence_kind IN ('IMAGE')),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  min_files INTEGER NOT NULL DEFAULT 1 CHECK (min_files >= 0),
  max_files INTEGER NOT NULL DEFAULT 1 CHECK (max_files >= min_files AND max_files <= 10),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, code)
);

CREATE TABLE facility_verification_evidence (
  id UUID PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES category_verification_requirements(id) ON DELETE RESTRICT,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE facilities ADD COLUMN category_id UUID;
ALTER TABLE facilities ADD CONSTRAINT facilities_category_fk
  FOREIGN KEY (category_id) REFERENCES directory_categories(id) ON DELETE RESTRICT;


-- Stable IDs make seeds idempotent and references predictable across environments.
INSERT INTO directory_category_groups (id,code,name_ar,name_en,is_active,sort_order) VALUES
  ('10000000-0000-4000-8000-000000000001','HEALTH','الصحة','Health',TRUE,10)
ON CONFLICT (code) DO NOTHING;

INSERT INTO directory_categories
(id,group_id,code,slug,name_ar,name_en,icon_key,specialization,capabilities,is_active,sort_order)
VALUES
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','PHARMACY','pharmacy','صيدلية','Pharmacy','pharmacy','PHARMACY','{"businessHours":true,"photos":true,"ratings":true,"duty":true}'::jsonb,TRUE,10),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','MEDICAL_LAB','medical-lab','مخبر تحاليل','Medical Laboratory','lab','GENERIC','{"businessHours":true,"photos":true,"ratings":true}'::jsonb,TRUE,20),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','MEDICAL_CLINIC','medical-clinic','طبيب / عيادة','Doctor / Clinic','doctor','MEDICAL_CLINIC','{"businessHours":true,"photos":true,"ratings":true,"specialtyFilter":true}'::jsonb,TRUE,30),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','NURSING_CENTER','nursing-center','تمريض وإسعافات أولية','Nursing & First Aid','nursing','NURSING_CENTER','{"businessHours":true,"photos":true,"ratings":true,"serviceFilter":true}'::jsonb,TRUE,40),
('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','MEDICAL_SUPPLIES','medical-supplies','أجهزة ومستلزمات طبية','Medical Supplies','medicalSupplies','GENERIC','{"businessHours":true,"photos":true,"ratings":true}'::jsonb,TRUE,50)
ON CONFLICT (code) DO NOTHING;

UPDATE facilities SET category_id = CASE facility_type
  WHEN 'PHARMACY' THEN '20000000-0000-4000-8000-000000000001'::uuid
  WHEN 'MEDICAL_CLINIC' THEN '20000000-0000-4000-8000-000000000003'::uuid
  WHEN 'NURSING_CENTER' THEN '20000000-0000-4000-8000-000000000004'::uuid
  WHEN 'MEDICAL_SUPPLIES_CENTER' THEN '20000000-0000-4000-8000-000000000005'::uuid
  ELSE category_id
END
WHERE category_id IS NULL;

UPDATE facilities SET facility_type='GENERIC' WHERE facility_type='MEDICAL_SUPPLIES_CENTER';

-- The old public type column is now an internal technical specialization only.
ALTER TABLE facilities DROP CONSTRAINT facilities_facility_type_check;
ALTER TABLE facilities RENAME COLUMN facility_type TO specialization;
ALTER TABLE facilities ADD CONSTRAINT facilities_specialization_check
  CHECK (specialization IN ('GENERIC','PHARMACY','MEDICAL_CLINIC','NURSING_CENTER'));
COMMENT ON COLUMN facilities.specialization IS
  'Internal technical specialization for feature-specific behavior. Public taxonomy is directory category_id.';

ALTER TABLE facilities ALTER COLUMN category_id SET NOT NULL;

-- Initial verification policy: storefront + business card are private review evidence.
-- Additional legal/professional documents can be enabled per category later.
INSERT INTO category_verification_requirements
(id,category_id,code,label_ar,label_en,instructions_ar,is_required,is_active,min_files,max_files,sort_order)
VALUES
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','STOREFRONT_PHOTO','صورة واجهة المنشأة','Storefront photo','صورة واضحة للواجهة واللافتة بحيث يمكن مطابقة اسم وموقع المنشأة.',TRUE,TRUE,1,1,10),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','BUSINESS_CARD','صورة كرت المنشأة','Business card','صورة واضحة لكرت المنشأة المستخدم لإثبات بياناتها.',TRUE,TRUE,1,1,20),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','STOREFRONT_PHOTO','صورة واجهة المنشأة','Storefront photo','صورة واضحة للواجهة واللافتة بحيث يمكن مطابقة اسم وموقع المنشأة.',TRUE,TRUE,1,1,10),
('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002','BUSINESS_CARD','صورة كرت المنشأة','Business card','صورة واضحة لكرت المنشأة المستخدم لإثبات بياناتها.',TRUE,TRUE,1,1,20),
('30000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000003','STOREFRONT_PHOTO','صورة واجهة المنشأة','Storefront photo','صورة واضحة للواجهة واللافتة بحيث يمكن مطابقة اسم وموقع المنشأة.',TRUE,TRUE,1,1,10),
('30000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000003','BUSINESS_CARD','صورة كرت المنشأة','Business card','صورة واضحة لكرت المنشأة المستخدم لإثبات بياناتها.',TRUE,TRUE,1,1,20),
('30000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000004','STOREFRONT_PHOTO','صورة واجهة المنشأة','Storefront photo','صورة واضحة للواجهة واللافتة بحيث يمكن مطابقة اسم وموقع المنشأة.',TRUE,TRUE,1,1,10),
('30000000-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000004','BUSINESS_CARD','صورة كرت المنشأة','Business card','صورة واضحة لكرت المنشأة المستخدم لإثبات بياناتها.',TRUE,TRUE,1,1,20),
('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000005','STOREFRONT_PHOTO','صورة واجهة المنشأة','Storefront photo','صورة واضحة للواجهة واللافتة بحيث يمكن مطابقة اسم وموقع المنشأة.',TRUE,TRUE,1,1,10),
('30000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000005','BUSINESS_CARD','صورة كرت المنشأة','Business card','صورة واضحة لكرت المنشأة المستخدم لإثبات بياناتها.',TRUE,TRUE,1,1,20)
ON CONFLICT (category_id,code) DO NOTHING;

CREATE INDEX idx_directory_category_provinces_public
  ON directory_category_provinces(province_id, public_enabled, owner_registration_enabled);
CREATE INDEX idx_facilities_category_public_scope
  ON facilities(province_id, category_id, status, city_id);
CREATE INDEX idx_verification_requirements_category
  ON category_verification_requirements(category_id, is_active, sort_order);
CREATE INDEX idx_facility_verification_evidence_facility
  ON facility_verification_evidence(facility_id, requirement_id, created_at);

CREATE TRIGGER directory_category_groups_set_updated_at BEFORE UPDATE ON directory_category_groups
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER directory_categories_set_updated_at BEFORE UPDATE ON directory_categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER category_verification_requirements_set_updated_at BEFORE UPDATE ON category_verification_requirements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
