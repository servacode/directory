# Backend / Database Reassessment

**Score: 9.0/10 source — live DB qualification required.**

Source-level DB constraints, migrations, PostGIS discovery, overlap rules, audit trail and transactional migration ledger are strong. Discovery and Admin lists are paginated. Backup/restore now treats DB plus uploaded evidence/media as one recovery set.

Remaining proof is runtime-only: execute every migration on real PostgreSQL/PostGIS, upgrade from the pre-dynamic schema, test concurrent duty/evidence operations and rehearse full restore.
