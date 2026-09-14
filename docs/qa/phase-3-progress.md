# Phase 3 Progress — Authentication & Users

## Status

**CORE IMPLEMENTED / ADAPTERS AND APP INTEGRATION PENDING**

Formal closure is not possible yet because external npm dependencies cannot be installed in the current execution environment and PostgreSQL is unavailable for repository integration tests.

## Implemented and locally verified

- Syrian mobile normalization to canonical `+9639...` format.
- Password policy foundation.
- Framework-independent `AuthService` core.
- Active-province registration rule.
- Generic invalid-credentials behavior.
- Blocked-user enforcement.
- Session creation/revocation contracts.
- Refresh-token rotation and reuse detection behavior.
- Change-password behavior with other-session revocation.
- Channel-agnostic password recovery service.
- Account-enumeration-resistant recovery-start behavior.
- Verification attempt limiting foundation.
- Recovery token phase before password reset.
- New-password handling entirely outside the WhatsApp/recovery channel.
- Password recovery database migration.
- Current dependency pins prepared for `argon2`, `jose`, and `pg`.
- Argon2id production adapter source.
- JOSE access/refresh token production adapter source.
- PostgreSQL transactional auth/recovery store source.
- NestJS auth/users controllers, access-token guard, current-principal decorator, and role guard source.
- WhatsApp recovery webhook adapter sends phone + verification code only.

## Local tests

- Auth core: 7/7 PASS.
- Password recovery core: 3/3 PASS.
- Auth-core TypeScript compilation: PASS using local global TypeScript compatibility build.

## Pending

- Secure Android token-storage adapter.
- Mobile auth screens/state.
- Admin auth state.
- Full dependency-based API build and E2E tests.
- Live PostgreSQL repository integration tests.
- WhatsApp provider/webhook credentials and live delivery test.
