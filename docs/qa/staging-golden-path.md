# Staging Qualification — Golden Path

This runbook is mandatory after a clean dependency install, live PostgreSQL/PostGIS
migration and a real Android native build. It is not replaced by source/static gates.

## Environment gates

- `pnpm install --frozen-lockfile` succeeds from a clean checkout.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all pass.
- `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:verify-live` pass against staging.
- API `/health/live` and `/health/ready` pass through staging HTTPS.
- Android debug/release candidate installs on at least one supported physical device.
- Admin loads over HTTPS and restores its session using only the HttpOnly refresh cookie.

## Golden path

1. Fresh-install the Android app with no prior storage.
2. Browse as Guest; select Raqqa manually with location permission denied.
3. Confirm only the public-enabled Pharmacy category is visible.
4. Search pharmacies and open a facility detail; phone/directions actions work.
5. Grant location and verify lists reorder nearest-first without hiding same-governorate results.
6. Create a Syrian-phone user account; logout/login and session refresh work.
7. Start password recovery; verify the response does not reveal whether another arbitrary
   phone exists and the messaging channel never receives a new password.
8. Add a pharmacy draft; choose the location from the map; add hours and public images.
9. Upload all required private verification evidence; incomplete evidence blocks submit.
10. Submit and confirm the owner can no longer mutate review-sensitive fields.
11. Admin logs in, views evidence, and approves the application.
12. Approved pharmacy appears publicly.
13. Owner starts a pharmacy duty shift; it appears in duty discovery.
14. Create a temporary closure; it overrides duty/open status.
15. Owner requests re-verification; facility disappears from public discovery while the
    sensitive edit is pending, evidence can be changed, and re-submit requires Admin review.
16. Admin approves re-verification; facility returns public with the reviewed data.
17. Admin suspends the facility; confirm the owner cannot use re-verification to reactivate it, and only an explicit Admin reactivation returns it to ACTIVE.
18. Confirm the Admin Audit Log records evidence views, approval/rejection, suspension/reactivation, and directory taxonomy changes.
19. Enable maintenance mode from Admin; confirm Android shows the maintenance screen, ordinary user/public API routes return `503 MAINTENANCE_MODE`, health/public-config/admin routes remain available, then disable maintenance and retry successfully without losing the user's local session.
20. Admin creates a GENERIC test category and group, keeps it disabled, then enables public
    visibility/owner onboarding for Raqqa; Android receives it without an app release.
21. Disable and remove/retire the test data before release.

## Negative/security path

- Non-Syrian phone registration is rejected.
- Owner cannot mutate another owner's facility/evidence/duty.
- Owner of an ACTIVE facility cannot directly alter sensitive approved fields.
- Public endpoints never expose verification evidence storage keys or owner account data.
- Admin refresh token is absent from JavaScript-accessible storage.
- Invalid/malformed/oversized image fixtures are rejected; accepted uploads are WebP and
  metadata-free after decode/re-encode.
- Rate-limit behavior is tested through the real reverse proxy, using two distinct client IPs.

## Release decision

Any P0/P1 failure = NO-GO. P2 items require an explicit release-owner decision and must not
silently disappear from the release report.

## Automated pre-run

On the connected staging machine, first run:

```bash
pnpm qualify:staging
```

This command intentionally fails unless the lockfile, live staging database and Android native scaffold are present. A PASS does **not** replace the physical-device Golden Path above; it only proves the automated environment/build/database gates.
