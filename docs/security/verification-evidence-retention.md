# Verification Evidence — Privacy and Retention Policy

Verification evidence (storefront photos, business cards, licences and other private
proofs) is collected only to review the right to manage/list a facility. It is not public
facility media and must never be exposed by public DTOs or public media routes.

## Access

- Facility owner/manager: may upload/remove evidence only while the facility is in an
  editable verification state.
- Admin reviewer: may view evidence only through an authenticated Admin endpoint.
- Evidence add/remove/view operations are audit logged.
- Storage keys are never returned through public APIs.

## Data minimization

Collect only requirements enabled for the facility category. A new requirement must have
an explicit verification purpose. Do not request identity documents, licences or other
sensitive material merely because the platform can store them.

## Launch retention rule

The platform setting `verificationEvidenceRetentionDays` controls post-rejection/closure
retention. Its launch default is **90 days** and Admin may configure it from **30 to 730
days** if the published Privacy Policy or operational requirements change.

- Pending / re-verification: keep evidence while review is active.
- Active / suspended facility: keep evidence needed to support the current approved state.
- Rejected or closed facility: evidence becomes eligible for purge after the configured
  retention period measured from the facility's latest state/data update.
- Evidence is never purged merely because a category or governorate is disabled.

Any legal/security hold requirement must be handled as an explicit operational exception
before running purge for the affected record; the platform must not claim a legal-hold
workflow that has not been configured operationally.

## Purge operation

The production command is dry-run by default:

```bash
node apps/api/dist/cli/purge-verification-evidence.js
```

Execution requires an explicit opt-in:

```bash
VERIFICATION_EVIDENCE_PURGE_EXECUTE=PURGE \
node apps/api/dist/cli/purge-verification-evidence.js
```

The purge command:

- reads the configured retention days;
- selects only `REJECTED` / `CLOSED` facilities past retention;
- rechecks eligibility under a database row lock;
- quarantines the file before deleting its DB row;
- writes an audit event for retention purge;
- deletes the quarantined object after commit;
- recovers interrupted quarantine files safely on the next run.

Run the command on a documented schedule (recommended daily) and review the dry-run count
before first production enablement.

## Backup caveat

Purged evidence can remain inside encrypted/time-bounded backups until those backups
expire. The published Privacy Policy should describe this at an appropriate level and the
backup-retention window must itself be documented.
