# Phase 2 Closure — Database, Migrations & Core Seed

## Implementation status

**IMPLEMENTED / STATICALLY VERIFIED**

Formal sequential closure is pending because Phase 0 external dependency verification remains blocked and this environment has neither PostgreSQL `psql` nor Docker available for a live migration run.

## Implemented

- PostGIS and `btree_gist` extension migration.
- Central `updated_at` trigger helper.
- Geographic/reference schema.
- Identity/session schema.
- Facility Core and ownership schema.
- Pharmacy, clinic, and nursing profiles.
- Medical supplies center uses Facility Core only.
- Images with one-primary-image invariant.
- Weekly business hours and overnight-period representation.
- Temporary closures with overlap exclusion.
- Pharmacy duty shifts with overlap exclusion.
- Ratings with one-rating-per-user/facility and 1–5 DB constraint.
- Facility applications with one pending application per facility.
- Immutable-style audit log table.
- Spatial and query-support indexes.
- Composite geographic integrity constraints.
- Syrian normalized mobile DB constraint on users.
- Idempotent core seed with all 14 Syrian governorates and Raqqa active.
- Initial Raqqa city, doctor specialties, and nursing services.
- Windows PowerShell migration/seed/reset helpers with production-reset protection.

## Verification executed locally

- Static migration manifest verification: PASS.
- Required tables: 21/21 present.
- PostGIS declaration: PASS.
- GiST facility location index: PASS.
- Owner uniqueness invariant: PASS (static check).
- Primary image uniqueness invariant: PASS (static check).
- Duty/temporary closure overlap constraints: PASS (static check).
- Rating uniqueness invariant: PASS (static check).
- Pending application uniqueness invariant: PASS (static check).
- All Syrian governorates seed: PASS.
- Raqqa active launch state: PASS.
- Idempotent seed (`ON CONFLICT`): PASS.

## Live verification pending

- Fresh PostgreSQL/PostGIS migration run.
- Seed execution against PostgreSQL.
- Constraint behavior integration tests.
- Spatial distance query smoke test.
- Backup/restore smoke test.

Reason: no `psql` or Docker binary is available in the current execution environment.
