# Database Architecture

## Source of truth

PostgreSQL + PostGIS. Schema changes are migration-only; production ORM auto-sync is prohibited.

## Ownership

`facility_members` is the single ownership source. A partial unique index allows one `OWNER` per facility. `facilities` intentionally has no `owner_id` duplicate.

## Geographic integrity

- `facilities.location` is `GEOGRAPHY(POINT, 4326)` with a GiST index.
- City/province and neighborhood/city composite foreign keys prevent inconsistent geographic hierarchy once those IDs are present.
- All Syrian governorates are seeded from day one; Raqqa is active for the first launch and the others are inactive.

## Dynamic directory taxonomy

- `directory_category_groups` and `directory_categories` define public taxonomy.
- `directory_category_provinces` controls visibility and owner onboarding per governorate.
- `facilities.category_id` is the public category foreign key.
- `facilities.specialization` is internal technical behavior only.
- Most future categories use `GENERIC` and Facility Core only.
- Specialized profile tables exist only for pharmacy, medical clinic and nursing behavior that actually needs extra fields.
- `category_verification_requirements` defines private onboarding proof policy; `facility_verification_evidence` stores private evidence references separately from public facility images.

## Time and availability

- Real date-times: `TIMESTAMPTZ`.
- Weekly schedules: `TIME` plus `ends_next_day`.
- Application services interpret business time using `Asia/Damascus`.
- Active/expired duty status is derived from timestamps; cancellation is persisted.
- PostgreSQL exclusion constraints block overlapping non-cancelled duty shifts and temporary closures.

## Historical data

Facilities use lifecycle statuses instead of routine deletion. Applications, duty history, temporary closures, ratings, and audit data are retained according to their domain semantics rather than blanket hard deletes.

## Production seed

The core seed is idempotent and contains only reference data. It never creates a default admin password, demo user, demo facility, fake rating, or fake duty shift.
