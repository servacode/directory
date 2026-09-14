BEGIN;

INSERT INTO provinces (id, country_code, name_ar, name_en, is_active, sort_order) VALUES
('10000000-0000-4000-8000-000000000001','SY','دمشق','Damascus',FALSE,1),
('10000000-0000-4000-8000-000000000002','SY','ريف دمشق','Rif Dimashq',FALSE,2),
('10000000-0000-4000-8000-000000000003','SY','حلب','Aleppo',FALSE,3),
('10000000-0000-4000-8000-000000000004','SY','حمص','Homs',FALSE,4),
('10000000-0000-4000-8000-000000000005','SY','حماة','Hama',FALSE,5),
('10000000-0000-4000-8000-000000000006','SY','اللاذقية','Latakia',FALSE,6),
('10000000-0000-4000-8000-000000000007','SY','طرطوس','Tartus',FALSE,7),
('10000000-0000-4000-8000-000000000008','SY','إدلب','Idlib',FALSE,8),
('10000000-0000-4000-8000-000000000009','SY','الرقة','Raqqa',TRUE,9),
('10000000-0000-4000-8000-000000000010','SY','دير الزور','Deir ez-Zor',FALSE,10),
('10000000-0000-4000-8000-000000000011','SY','الحسكة','Al-Hasakah',FALSE,11),
('10000000-0000-4000-8000-000000000012','SY','درعا','Daraa',FALSE,12),
('10000000-0000-4000-8000-000000000013','SY','السويداء','As-Suwayda',FALSE,13),
('10000000-0000-4000-8000-000000000014','SY','القنيطرة','Quneitra',FALSE,14)
ON CONFLICT (id) DO UPDATE SET
  country_code = EXCLUDED.country_code,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

INSERT INTO cities (id, province_id, name_ar, name_en, is_active, sort_order) VALUES
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000009','الرقة','Raqqa',TRUE,1)
ON CONFLICT (id) DO UPDATE SET
  province_id = EXCLUDED.province_id,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

INSERT INTO doctor_specialties (id, name_ar, name_en, is_active, sort_order) VALUES
('30000000-0000-4000-8000-000000000001','أطفال','Pediatrics',TRUE,1),
('30000000-0000-4000-8000-000000000002','أسنان','Dentistry',TRUE,2),
('30000000-0000-4000-8000-000000000003','داخلية','Internal Medicine',TRUE,3),
('30000000-0000-4000-8000-000000000004','قلبية','Cardiology',TRUE,4),
('30000000-0000-4000-8000-000000000005','نسائية وتوليد','Obstetrics and Gynecology',TRUE,5),
('30000000-0000-4000-8000-000000000006','عظمية','Orthopedics',TRUE,6),
('30000000-0000-4000-8000-000000000007','جلدية','Dermatology',TRUE,7),
('30000000-0000-4000-8000-000000000008','عيون','Ophthalmology',TRUE,8),
('30000000-0000-4000-8000-000000000009','أنف أذن حنجرة','ENT',TRUE,9),
('30000000-0000-4000-8000-000000000010','جراحة عامة','General Surgery',TRUE,10),
('30000000-0000-4000-8000-000000000011','بولية','Urology',TRUE,11),
('30000000-0000-4000-8000-000000000012','عصبية','Neurology',TRUE,12),
('30000000-0000-4000-8000-000000000013','نفسية','Psychiatry',TRUE,13),
('30000000-0000-4000-8000-000000000014','صدرية','Pulmonology',TRUE,14),
('30000000-0000-4000-8000-000000000015','غدد وسكري','Endocrinology and Diabetes',TRUE,15)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

INSERT INTO nursing_services (id, name_ar, name_en, is_active, sort_order) VALUES
('40000000-0000-4000-8000-000000000001','حقن','Injections',TRUE,1),
('40000000-0000-4000-8000-000000000002','تضميد الجروح','Wound Dressing',TRUE,2),
('40000000-0000-4000-8000-000000000003','قياس ضغط الدم','Blood Pressure Measurement',TRUE,3),
('40000000-0000-4000-8000-000000000004','قياس سكر الدم','Blood Glucose Measurement',TRUE,4),
('40000000-0000-4000-8000-000000000005','إسعافات أولية','First Aid',TRUE,5),
('40000000-0000-4000-8000-000000000006','العناية بالجروح البسيطة','Basic Wound Care',TRUE,6),
('40000000-0000-4000-8000-000000000007','خدمات تمريضية عامة','General Nursing Services',TRUE,7)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;


INSERT INTO platform_settings (key,value_json,value_type) VALUES
('userRegistrationEnabled','true'::jsonb,'boolean'),
('facilityApplicationsEnabled','true'::jsonb,'boolean'),
('ratingsEnabled','true'::jsonb,'boolean'),
('englishEnabled','false'::jsonb,'boolean'),
('notificationsEnabled','false'::jsonb,'boolean'),
('maintenanceMode','false'::jsonb,'boolean'),
('maxFacilityImages','5'::jsonb,'integer'),
('maxDutyShiftDurationHours','36'::jsonb,'integer'),
('defaultSearchRadiusMeters','5000'::jsonb,'integer'),
('maxSearchRadiusMeters','100000'::jsonb,'integer'),
('homeDutyLimit','10'::jsonb,'integer'),
('homeNearbyLimit','20'::jsonb,'integer')
ON CONFLICT (key) DO NOTHING;

-- Directory launch policy: only pharmacies are public/registerable in Raqqa initially.
-- All other categories remain configured but hidden until enabled by Admin.
INSERT INTO directory_category_provinces(category_id,province_id,public_enabled,owner_registration_enabled)
SELECT c.id,p.id,
       (c.code='PHARMACY' AND p.name_ar='الرقة'),
       (c.code='PHARMACY' AND p.name_ar='الرقة')
  FROM directory_categories c CROSS JOIN provinces p
ON CONFLICT(category_id,province_id) DO NOTHING;

COMMIT;
