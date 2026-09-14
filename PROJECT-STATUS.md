# Directory Platform — Current Project Status

## Official state

- Dynamic directory architecture: `CLOSED — SOURCE REGRESSION PASS`
- Remediation sprint: `CLOSED — INTERNAL SOURCE GATES PASS`
- Phase 14: `SOURCE QUALIFIED — GO FOR REAL STAGING / DEVICE QA`
- Phase 15: `PRODUCTION PREPARED — EXTERNAL QUALIFICATION PENDING`
- `v1.0.0`: `NOT RELEASED`

The project has no currently known P0/P1 source-code blocker in the locally verifiable scope. Public production remains a **NO-GO** until the external build, live database, device, staging and production-environment gates listed below are proven.

## Initial Raqqa launch

- Raqqa governorate: ACTIVE.
- Pharmacy: public ON.
- Pharmacy owner registration: ON.
- Pharmacy Duty: ON.
- Medical Laboratory: configured, OFF.
- Medical Clinic: configured, OFF.
- Nursing Center: configured, OFF.
- Medical Supplies: configured, OFF.
- Generic future categories: OFF until explicitly enabled per governorate.

## Major post-audit remediation completed

- dynamic category-group update contract fixed;
- approved-facility sensitive changes require `REVERIFICATION_REQUIRED`;
- suspended facilities cannot bypass Admin suspension through self re-verification;
- private verification evidence add/view/remove is audited;
- verification evidence upload authorization happens before expensive image decoding;
- Admin refresh token moved to HttpOnly/Secure/SameSite cookie flow;
- Admin browser-origin checks added for cookie auth endpoints;
- reverse-proxy-aware rate limiting and normalized phone keys;
- password-recovery OTP uses keyed HMAC; recovery remains disabled until a provider is configured;
- upload pipeline decodes, validates dimensions/pixels, rejects animation, resizes and re-encodes to metadata-free WebP;
- GPS/provider state and province restore logic fixed;
- public discovery/search and Admin lists are paginated;
- Admin Audit Log is reviewable from the UI;
- clinic public detail DTO drift fixed and typed;
- migration ledger writes are transactionally coupled to migrations;
- production backup/restore covers database plus public/private upload volume;
- maintenance mode is now enforced server-side (`503 MAINTENANCE_MODE`) while health/public-config/Admin remain available, and Android shows a dedicated maintenance screen;
- verification evidence retention is configurable (launch default 90 days, 30–730 allowed) with an audited, safe purge command.

## Latest clean local regression

- Contracts clean runtime suite: **18/18 PASS**.
- API core clean suite: **40/40 PASS**.
- Mobile core clean suite: **12/12 PASS**.
- Security core: **7 assertions PASS**.
- Reliability core: **10 assertions PASS**.
- Dynamic Directory Gate: **15/15 PASS**.
- Remediation Gate: **17/17 PASS**.
- Security static: **11/11 PASS**.
- Reliability static: **10/10 PASS**.
- Phase 14 source gate: **13/13 PASS**.
- Phase 15 preparation gate: **15/15 PASS**.
- Domain error-code registry: **PASS**.
- Centralization audit: **PASS**.
- TypeScript/TSX syntax parse: **197/197 files PASS**.
- `git diff --check`: **PASS**.
- Production preflight: **correctly BLOCKED by 10 external environment gates** (no production secrets/domain/lockfile/native Android scaffold yet).

## External gates before public production

1. Network-enabled dependency install and generation/commit of a real `pnpm-lock.yaml`.
2. Clean Node 24 / pnpm 12 run: `typecheck`, `lint`, `test`, `build`.
3. Generate/review the official React Native 0.87.1 Android native scaffold.
4. Android SDK/Gradle Release build, signed AAB and real-device QA.
5. Live PostgreSQL/PostGIS: migrate from empty DB and pre-dynamic schema, seed, live verifier, duty/evidence concurrency checks.
6. Run real Sharp malicious/oversized/image-bomb fixtures after dependency install.
7. Full backup → restore rehearsal for both DB and upload/evidence volume; run evidence-retention purge in dry-run and controlled execute mode.
8. HTTPS staging Golden Path including Admin cookie session, real proxy IP rate limiting and maintenance mode.
9. Production domain/DNS/TLS, strong unique secrets, production MapLibre style/tile endpoint.
10. Publish Privacy Policy consistent with configured 90-day evidence retention (or change the setting/policy together).
11. Google Play signing/listing/privacy URL/submission.
12. WhatsApp recovery provider only if password recovery will be enabled at launch; otherwise keep the feature flag OFF.

## Next command on the connected staging machine

Run `pnpm qualify:staging` first. It is intentionally fail-closed and does not replace the physical-device Golden Path in `docs/qa/staging-golden-path.md`.

## Decision

**GO — REAL STAGING & PHYSICAL-DEVICE QUALIFICATION.**

**NO-GO — PUBLIC PRODUCTION RELEASE until all external gates above pass.**

## Render staging preparation

- Render Blueprint added at repository root: `render.yaml`.
- Frankfurt staging topology: API + Admin + Render Postgres.
- API staging service uses a persistent disk for public/private upload persistence across redeploys.
- Render Postgres is private-network-only and migrations enable PostGIS/`btree_gist`.
- API migrations and idempotent core seed run as a Render pre-deploy command.
- Staging Dockerfiles intentionally permit connected dependency resolution while no lockfile exists; production Dockerfiles still require a committed lockfile and frozen install.
- Render staging configuration gate: `PASS`.
- Runbook: `docs/operations/render-staging.md`.

**Render decision:** `READY TO CREATE STAGING BLUEPRINT — DEPLOY NOT YET EXECUTED`.
