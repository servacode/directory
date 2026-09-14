# Directory Platform — الدليل

Arabic-first, RTL-first province directory platform for Syria.

The architecture is category-agnostic, while the **initial Raqqa production launch is intentionally Pharmacy + Pharmacy Duty only**. Additional health or generic commercial/service categories are enabled later from Admin per governorate.

## Product surfaces

- Android app: public users + business/facility owners.
- Admin web: lightweight platform administration only.
- NestJS REST API.
- PostgreSQL + PostGIS.

## Dynamic directory model

- Admin-managed category groups and categories.
- Public visibility and owner onboarding are independent per governorate.
- Generic categories can be added without changing the Android taxonomy.
- Private configurable verification evidence is separate from public facility photos.
- Internal technical specialization exists only for behavior that truly needs code, such as pharmacy duty.

See `Master-Specification.md` and `docs/decisions/ADR-004-dynamic-directory-taxonomy.md`.

## Requirements

- Node.js 24 LTS or newer compatible release.
- pnpm 12.4.1.
- PostgreSQL with PostGIS.
- Android toolchain compatible with the pinned React Native version.

## Workspace

```text
apps/mobile
apps/api
apps/admin
packages/contracts
packages/shared-types
packages/design-tokens
packages/i18n
packages/icon-registry
packages/formatters
packages/config
packages/testing
```

## Commands

```bash
pnpm install
pnpm doctor
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit:centralization
pnpm verify:dynamic-directory
```

Production release remains blocked until the external build/device/database gates documented in `PROJECT-STATUS.md` pass.
