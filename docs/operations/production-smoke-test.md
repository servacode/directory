# Production Smoke Test

Run after production migrations/seed and before public announcement.

1. `/health/live` and `/health/ready` pass.
2. Raqqa is active; other governorates follow rollout policy.
3. Public category API for Raqqa returns Pharmacy and does not return disabled categories.
4. Owner-registration category API for Raqqa returns Pharmacy only.
5. Guest opens Home and sees the server-provided Health group/Pharmacy category.
6. Guest opens pharmacy list, map, details, call and directions.
7. Pharmacy duty appears only for an active duty shift and respects temporary closure.
8. Syrian user can register/login/logout and recover password through the configured recovery channel.
9. Owner can create a pharmacy draft, upload public images and private verification evidence, then submit.
10. Submission fails when required verification evidence is incomplete.
11. Admin can securely view private evidence, approve/reject, suspend/reactivate.
12. Approved pharmacy appears publicly when category visibility remains enabled.
13. Admin creates a temporary generic test category: it remains invisible until explicitly enabled for Raqqa.
14. Enabling/disabling that test category changes category discovery without an Android release.
15. Disable/delete test data before launch announcement.
