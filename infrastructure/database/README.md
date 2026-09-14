# Database

PostgreSQL + PostGIS is the source of truth. Production schema changes run only through ordered SQL migrations.

## Directory taxonomy

Public facility taxonomy is dynamic:

- `directory_category_groups`
- `directory_categories`
- `directory_category_provinces`
- `category_verification_requirements`
- `facility_verification_evidence`

`facilities.category_id` is the public taxonomy key. `facilities.specialization` is an internal technical behavior hint only.

Generic categories do not require profile tables. Specialized profile tables exist only where the product has real specialized fields.

Core seed is idempotent, seeds all Syrian governorates, keeps Raqqa active first, and enables Pharmacy public/onboarding only for the initial launch.
