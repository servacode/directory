# Render Staging Runbook

This environment exists only to qualify the release candidate before purchasing/configuring the final production hosting and domain.

## Topology

- API: `directory-api-stg-466ef4d` — Docker web service, Frankfurt, paid 0.5 CPU / 512 MB because persistent uploads/evidence must survive redeploys.
- Admin: `directory-admin-stg-466ef4d` — Docker web service, Frankfurt, free plan is acceptable for staging.
- Database: `directory-db-stg-466ef4d` — Render Postgres 18, Frankfurt, free staging database.
- API uploads/evidence: 1 GB persistent disk mounted at `/app/storage`.
- PostGIS and `btree_gist` are enabled by migration `0001`.

## Important staging-only compromise

The repository does not yet contain `pnpm-lock.yaml` because the local qualification environment had no package-registry access. The Render staging Dockerfiles therefore use `pnpm install --no-frozen-lockfile` so the first connected build can run.

This is **not** accepted for production. After staging proves the resolved dependency graph, generate and commit a real `pnpm-lock.yaml`, run all qualification gates, and return to the fail-closed production Dockerfiles.

## Deploy

1. Push this repository to a private GitHub/GitLab repository.
2. In Render choose **New → Blueprint** and select the repository.
3. Confirm Render detected the root `render.yaml`.
4. Create the Blueprint resources.
5. Wait for Postgres, API pre-deploy migrations/seed, API health, and Admin deployment to become green.
6. Verify:
   - `https://directory-api-stg-466ef4d.onrender.com/api/v1/health/live`
   - `https://directory-api-stg-466ef4d.onrender.com/api/v1/health/ready`
   - `https://directory-admin-stg-466ef4d.onrender.com`

## Create the first Admin

Do not seed an administrator password into source control.

Open the API service Shell in Render and run the compiled CLI with environment variables supplied only for that command:

```sh
ADMIN_PHONE='+9639XXXXXXXX' ADMIN_PASSWORD='replace-with-strong-password' ADMIN_NAME='Staging Admin' node apps/api/dist/cli/create-admin.js
```

Confirm the CLI succeeds, then clear your terminal history if appropriate. Never save this password in repository files.

## Android staging endpoint

After the API is healthy, Android staging builds must use:

```text
API_URL=https://directory-api-stg-466ef4d.onrender.com/api/v1
```

Use the Render URL only for staging. Production will use the final domain later.

## Golden path

Run, in order:

1. API live/ready checks.
2. Admin login.
3. Register a Syrian phone test user.
4. Verify Raqqa is the only active launch governorate expected by seed.
5. Verify Pharmacy is public/onboarding ON and other initial categories remain OFF.
6. Create a pharmacy draft.
7. Pick its map location.
8. Upload public images.
9. Upload storefront/business-card verification evidence.
10. Submit for review.
11. Admin opens private evidence and approves.
12. Confirm pharmacy appears publicly.
13. Create a pharmacy duty shift and confirm `DUTY_NOW` publicly.
14. Rate from another account.
15. Trigger reverification, modify sensitive data, resubmit, and approve again.
16. Suspend facility and verify owner cannot bypass suspension using reverification.
17. Enable maintenance mode and confirm user endpoints return maintenance while Admin remains usable.
18. Disable maintenance mode and confirm recovery.
19. Redeploy API and confirm uploaded public/private files still exist on the persistent disk.
20. Run backup/restore qualification separately before production approval.

## Password recovery

Keep `passwordRecoveryEnabled=false` during staging until a WhatsApp provider is actually connected and tested. Empty webhook values are intentional in `render.yaml`.

## Staging exit gate

Do not call the product production-ready until:

- full Render build passes;
- live Postgres migrations and PostGIS checks pass;
- Android native build installs on a real device;
- the golden path passes;
- upload persistence survives redeploy;
- backup/restore is proven;
- a committed lockfile is generated and all full repo tests/builds pass with `--frozen-lockfile`.
