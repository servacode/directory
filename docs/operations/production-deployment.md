# Production Deployment — Raqqa v1

## Hard gates before deploy

- Network-enabled build machine with Node 24 and pnpm.
- Committed `pnpm-lock.yaml` generated from the final dependency graph.
- React Native Android native scaffold generated with the pinned RN version and reviewed into the repository.
- Successful API/Admin/Mobile production builds.
- Real PostgreSQL/PostGIS migration and restore test.
- Domain DNS for `api.<domain>` and `admin.<domain>` points to the production server.
- Strong unique database/JWT secrets.
- Android release signing material stored outside Git.
- Non-demo MapLibre style URL suitable for production.

## Server deploy

1. Copy `infrastructure/production/.env.production.example` to `.env.production` and replace every placeholder.
2. Run `node scripts/production-preflight.mjs infrastructure/production/.env.production`.
3. Run `infrastructure/production/deploy.sh infrastructure/production/.env.production`.
4. Create the first admin only after migrations + seed:

```sh
export ADMIN_NAME='...'
export ADMIN_PHONE='09xxxxxxxx'
export ADMIN_PASSWORD='...'
export ADMIN_PROVINCE_NAME='الرقة'
docker compose --env-file infrastructure/production/.env.production -f infrastructure/production/docker-compose.yml run --rm -e ADMIN_NAME -e ADMIN_PHONE -e ADMIN_PASSWORD -e ADMIN_PROVINCE_NAME api pnpm --filter @health/api admin:create
unset ADMIN_PASSWORD
```

5. Verify `/api/v1/health/live` and `/api/v1/health/ready` over HTTPS.
6. Run the production smoke/golden-path checklist before public announcement.

## Data

- PostgreSQL is not published on a host port.
- Facility/user images are stored in a persistent `upload_data` volume behind API-controlled endpoints.
- Raqqa is active in the core seed; other Syrian governorates remain inactive until enabled from Admin.

## Rollback rule

Never blindly reverse a destructive database migration. Stop traffic if needed, preserve a fresh backup, roll application containers back to the last known release when schema-compatible, otherwise perform a forward fix or restore according to the documented incident decision.

## Live database qualification

After migrations on staging and again before first production announcement:

```sh
pnpm db:migrate
pnpm db:seed
pnpm db:verify-live
```

The migration runner records each migration inside the same SQL transaction as the schema
change, preventing a successful schema commit from being left unrecorded after a process
failure. The live verifier checks PostGIS, the migration ledger, Raqqa activation and the
dynamic-directory indexes/policies.

## Verification evidence retention job

Before public launch, confirm the published Privacy Policy matches the configured
`verificationEvidenceRetentionDays` value (default 90 days). Schedule the purge command
from the API runtime at least daily. It is dry-run unless the explicit execution variable
is present:

```bash
docker compose exec api node apps/api/dist/cli/purge-verification-evidence.js
docker compose exec -e VERIFICATION_EVIDENCE_PURGE_EXECUTE=PURGE api \
  node apps/api/dist/cli/purge-verification-evidence.js
```

Record the scheduler/cron owner and verify purge events appear in the Admin Audit Log.
