# Pharmacy Duty — Phase 8

Duty shifts are pharmacy-only, require an ACTIVE facility, and are derived from timestamps plus `cancelled_at`; no ACTIVE/EXPIRED database flag is the source of truth. PostgreSQL exclusion constraints prevent overlapping non-cancelled shifts. The availability priority is `TEMPORARILY_CLOSED > DUTY_NOW > OPEN_NOW > CLOSED_NOW`.
