# Phase 13 — Performance & Reliability Report

Status: **CORE IMPLEMENTED / LIVE LOAD + RESTORE + NATIVE NETWORK VERIFICATION PENDING**

## Implemented

- Dynamic platform setting reads use a short in-process cache and invalidate immediately on admin updates.
- PostgreSQL pool has explicit connection/idle/statement timeouts.
- Slow DB queries and transactions emit structured timing events without logging query values.
- `/health/ready` performs a live DB ping; `/health/live` remains process-only.
- Admin facility applications are server-paginated.
- Facility media returns long-lived immutable cache headers; private profile images use private short caching.
- Android network core retries only GET requests and applies exponential backoff.
- State-changing requests are never automatically replayed.
- Concurrent 401 responses share one refresh operation.
- Cache policies distinguish reference/facility/public/availability/duty freshness.
- Duty and availability stale-cache states require freshness warnings.
- Portable `pg_dump` backup and isolated restore-test scripts added.

## Local verification

- Network/retry/cache core: 10 assertions PASS.
- Security regression remains PASS.
- Static performance/reliability audit: run `pnpm verify:phase13`.

## External gates still pending

- Real PostgreSQL `EXPLAIN ANALYZE` and load dataset tests.
- Real PostGIS index-plan verification.
- Native Android weak-network test.
- Actual pg_dump + restore rehearsal (PostgreSQL tools unavailable here).
- Full dependency production builds.
