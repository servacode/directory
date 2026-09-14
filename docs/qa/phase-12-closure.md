# Phase 12 — Security Hardening Closure

Status: **CORE IMPLEMENTED / FULL DEPENDENCY + PENETRATION + LIVE-DB VERIFICATION PENDING**

## Implemented

- Authentication and password-recovery fixed-window throttling.
- Runtime body schemas and unknown-field rejection for sensitive write contracts.
- Syrian phone normalization remains server-authoritative.
- Facility object authorization remains centralized through `FacilityPermissionService`.
- Admin reference routes now return domain validation errors rather than raw internal exceptions.
- Map coordinate pairs and viewport bounds are strictly validated.
- Public facility detail now returns a controlled not-found domain error rather than `200 null`.
- Profile image binary signatures are validated against declared MIME.
- Common JPEG/PNG/WebP metadata containers are stripped before storage.
- Object storage containment checks use path-relative validation.
- User profile images are no longer exposed through the public media route; retrieval requires the authenticated `/users/me/profile-image/content` endpoint. Facility media remains public and cacheable.
- New-upload cleanup occurs when the database profile update fails.
- Duty maximum duration is now read from dynamic platform settings.
- Home section limits are now read from dynamic platform settings.
- Platform search-radius settings enforce default <= maximum.
- No production `console.*` logging found in application sources.
- Authorization matrix and security model documented.

## Verified locally

- Pure security core TypeScript compilation: PASS.
- Fixed-window limiter tests: PASS.
- Image signature tests: PASS.
- Contract/config strict TypeScript compilation: PASS.
- Static Phase 12 audit: PASS when `scripts/verify-phase12.mjs` succeeds.

## Pending external gates

- Full Nest dependency build (npm registry unavailable in current execution environment).
- Live PostgreSQL authorization/concurrency integration tests.
- Full image decode/re-encode using a production image processor.
- External penetration/security scan.
- Android release storage/network security verification.

Phase 12 is therefore implemented but not falsely marked `CLOSED` until these external gates can run.
