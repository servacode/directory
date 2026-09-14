# Phase 15 — Raqqa Pharmacy-Only Production Launch

**Status:** `PRODUCTION PREPARED — EXTERNAL LAUNCH GATES PENDING`

## Prepared in source

- Dynamic directory engine with pharmacy-only initial Raqqa activation.
- Production Docker definitions for PostgreSQL/PostGIS, API, Admin and Caddy HTTPS edge.
- Persistent database and upload volumes.
- Tracked migration runner (`schema_migrations`) and idempotent core seed runner.
- Secure initial-admin CLI with Syrian phone normalization and no default credentials.
- Production preflight that deliberately blocks incomplete releases.
- Database/upload backup script and deployment script.
- Production smoke test validates category activation without an app release.
- v1.0.0 release manifest remains `NOT RELEASED`.

## Local preparation gates

- Dynamic Directory Gate: 15/15 PASS.
- Phase 15 preparation: 13/13 PASS.

## Blocking external gates

1. Generate/commit the final `pnpm-lock.yaml` on a network-enabled build machine.
2. Generate/review the pinned React Native Android native scaffold.
3. Complete full dependency install/typecheck/lint/test/build.
4. Execute live PostgreSQL/PostGIS migrations, seed, backup and isolated restore test.
5. Provide production domain/DNS/TLS email and strong secrets.
6. Provide production MapLibre style/tile source.
7. Produce signed Android AAB and pass clean-install/real-device QA.
8. Configure WhatsApp recovery provider if enabled at launch.
9. Complete Google Play listing/privacy URL and submit the release.
10. Run production smoke/golden-path checks before public announcement.

Do not mark `VERSION 1.0.0 — RELEASED` until all blocking gates pass.
