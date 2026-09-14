# Phase 14 — Full QA + Release Candidate

**Status:** `IMPLEMENTED — EXTERNAL BUILD/DEVICE/DB VERIFICATION PENDING`

## Implemented

- Complete Android source navigation and primary public/account/owner flows.
- Dynamic category groups/categories loaded from API; no fixed public facility-type taxonomy.
- Category-group rendering on Home.
- Per-governorate category visibility/onboarding.
- Configurable private owner-verification evidence.
- MapLibre public map and map-based facility location picker.
- Facility photos upload/list/primary/reorder/delete and public gallery rendering.
- Owner management with edits, photos, temporary closure and pharmacy duty.
- Lightweight Admin Web for applications, facilities, category groups/categories, verification policies, references and settings.
- Centralized call/directions, API, icons, translations and design tokens.

## Local gates after dynamic-directory migration

- Shared TypeScript packages: PASS.
- Contract tests: 14/14 PASS.
- Dynamic Directory Gate: 15/15 PASS.
- Phase 4–13 static/source gates: PASS.
- Security static: 9/9 PASS; core: 7 assertions PASS.
- Reliability static: 10/10 PASS; core: 10 assertions PASS.
- Centralization audit: PASS.
- Phase 14 source verification: 13/13 PASS.

## Pending external gates

- dependency installation and full application builds;
- PostgreSQL/PostGIS live migration/integration;
- Android release and real-device QA;
- staging E2E and provider-specific WhatsApp delivery.

Phase 14 remains externally unverified until those gates pass.
