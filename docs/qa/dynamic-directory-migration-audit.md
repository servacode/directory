# Dynamic Directory Migration Audit

## Required checks

- [x] Public category taxonomy uses `category_id`.
- [x] Legacy `facility_type` is renamed to internal `specialization` by migration.
- [x] Generic categories do not branch on category code.
- [x] Groups/categories are admin-managed.
- [x] Categories can move between groups.
- [x] Group names are delivered to Android by API.
- [x] Public/owner activation is per governorate.
- [x] Raqqa seed exposes Pharmacy only.
- [x] Medical Laboratory is preconfigured but hidden.
- [x] Generic new categories start hidden in all governorates.
- [x] Generic new categories receive default storefront/business-card verification.
- [x] Private verification is separate from public facility images.
- [x] Required evidence gates facility submission and admin approval.
- [x] Verification evidence access is admin-authorized and audit logged.
- [x] Pharmacy duty remains specialization/capability-driven.

Final regression results are recorded in `PROJECT-STATUS.md` after all source gates rerun.
