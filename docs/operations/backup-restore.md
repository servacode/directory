# Backup / Restore

## Development / database-only rehearsal

`pnpm db:backup` executes `pg_dump` in custom format against `DATABASE_URL` and writes a timestamped artifact under `BACKUP_DIR` (default `./backups`).

A database-only restore rehearsal uses an isolated/disposable database:

```sh
RESTORE_TEST_DATABASE_URL=... pnpm db:restore-test -- ./backups/<file>.dump
```

The database rehearsal validates PostGIS, reference data, and that Raqqa exists as an active province.

## Production backup set

Production data is a **pair** and must be retained together:

1. PostgreSQL custom-format dump.
2. `upload_data` archive containing public facility images, private verification evidence and private profile images.

Create both artifacts with:

```sh
infrastructure/production/backup.sh infrastructure/production/.env.production
```

A database dump without the matching upload archive is not considered a complete platform backup.

## Production restore

Production restore is intentionally destructive and refuses to run without an explicit operator confirmation. It also creates a fresh pre-restore backup before modifying current data.

```sh
CONFIRM_PRODUCTION_RESTORE=RESTORE \
  infrastructure/production/restore.sh \
  infrastructure/production/.env.production \
  ./backups/database-<stamp>.dump \
  ./backups/uploads-<stamp>.tar.gz
```

The restore procedure:

1. validates all selected artifacts;
2. creates a pre-restore safety backup of DB + uploads;
3. stops API/Admin writers;
4. restores PostgreSQL with `pg_restore`;
5. replaces the persistent upload volume from the selected archive;
6. restarts services;
7. waits for API readiness.

## Release qualification

Before public launch, perform at least one **full backup-set restore rehearsal** on staging or an isolated clone and verify:

- PostGIS and all migration ledger rows;
- Raqqa/category activation;
- public facility images render;
- profile images remain private and render for their owner;
- private verification evidence is accessible only to authorized Admin review;
- audit logs remain intact;
- the staging golden path still passes after restore.

Backup retention and encryption at rest must match the published privacy/verification-evidence retention policy.
