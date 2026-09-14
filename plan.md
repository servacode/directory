# plan.md — Final Execution Plan

Execution lifecycle: `Understand → Plan → Implement → Test → Audit → Close`.

`Master-Specification.md` is the product source of truth.

## Architecture amendment before release

The original fixed facility taxonomy has been superseded by a dynamic directory model:

- category groups are data;
- categories are data;
- public/owner-registration activation is per governorate;
- verification policy is configurable per category;
- `specialization` is internal technical behavior only;
- initial Raqqa launch exposes Pharmacy + Pharmacy Duty only.

This amendment must be included in all Phase 14/15 regression and release gates.

## Execution phases

1. Phase 0 — Repository & Foundation
2. Phase 1 — Contracts & Domain Foundation
3. Phase 2 — Database + Migrations + Seed
4. Phase 3 — Authentication + Users
5. Phase 4 — Maps + Location + Geo
6. Phase 5 — Facility Core + Dynamic Owner Onboarding
7. Phase 6 — Admin Review + Private Verification
8. Phase 7 — Business Hours + Availability
9. Phase 8 — Pharmacy Duty
10. Phase 9 — Dynamic Public Discovery
11. Phase 10 — Account + Ratings
12. Phase 11 — Admin Reference Data + Directory Taxonomy + Settings
13. Phase 12 — Security Hardening
14. Phase 13 — Performance + Reliability
15. Phase 14 — Full QA + Release Candidate
16. Phase 15 — Raqqa Pharmacy-Only Production Launch

## Dynamic directory acceptance gates

Before RC approval verify:

- no public runtime enum is used as category taxonomy;
- new `GENERIC` categories can be created from Admin;
- Admin can create/rename/order/disable groups and move categories between groups;
- public Android groups categories from API metadata;
- activation is independent per governorate for visibility and owner onboarding;
- Raqqa seed enables Pharmacy only;
- private evidence never appears in public DTO/media;
- required evidence blocks submission/approval when incomplete;
- changing verification policy needs no app release;
- pharmacy duty remains functional after taxonomy migration.

Centralization remains mandatory: no duplicated business logic, raw UI colors, direct feature fetch calls, direct icon-library imports in features, or client-side availability/distance truth.
