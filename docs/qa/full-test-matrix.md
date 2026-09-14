# Full QA Test Matrix — v1.0.0

Status legend: `PASS` verified in this source environment, `EXTERNAL` requires installed native/web dependencies, PostgreSQL, a real Android device, or production credentials.

| Area | Required coverage | Current gate |
|---|---|---|
| Foundation | monorepo, central config, i18n, icons, tokens, API client | PASS (source/static) |
| Authentication | Syrian-only phone, register, login, refresh rotation, logout, blocked user, change password | PASS (core) |
| Password recovery | start, WhatsApp-channel OTP abstraction, verify, reset inside app | PASS (core); provider delivery EXTERNAL |
| Location | GPS/manual province, denied/blocked, cached location | PASS (core); native device EXTERNAL |
| Maps | MapLibre surface, pins, map picker, external directions | PASS (source); native render EXTERNAL |
| Facilities | four types, drafts, resume, profiles, submit/resubmit | PASS (core) |
| Facility images | secure upload, list, primary, order, delete, public render | PASS (source); multipart integration EXTERNAL |
| Admin review | list/detail, approve/reject, duplicate warning, suspend/reactivate | PASS (core) |
| Availability | split/24h/overnight/next-open/temporary closure | PASS (core) |
| Pharmacy duty | now/future/cancel/overlap/temporary-closure precedence | PASS (core) |
| Discovery | governorate-wide, nearest-first, doctor specialty, nursing optional service | PASS (core) |
| Account | name, profile photo, password, facilities, ratings, logout | PASS (source/core) |
| Ratings | 1–5, one per user/facility, owner prevention | PASS (core) |
| Reference data | all Syria governorates, cities/neighborhoods, specialties/services | PASS (source/static) |
| Settings | registration/applications/ratings, image limit, duty duration, geo limits | PASS (core) |
| Security | IDOR foundation, mass-assignment boundaries, upload signature, throttling, secret/log audit | PASS (core/static) |
| Reliability | safe retries, single refresh, stale-duty policy, readiness, backup scripts | PASS (core/static) |
| RTL/i18n | no hardcoded Arabic/English in product UI, centralized keys | PASS (static) |
| Android release build | signed release AAB, clean install, permissions, real map/GPS | EXTERNAL |
| Admin production build | Next.js production build | EXTERNAL |
| API production build | Nest production build with installed dependencies | EXTERNAL |
| PostgreSQL integration | migrate/seed/live PostGIS queries/backup restore | EXTERNAL |
| Golden path | user → facility application → admin approve → public listing → pharmacy duty | EXTERNAL end-to-end |

## Release blocker policy

The release candidate cannot be marked `APPROVED` while any external build/database/device gate above is unverified. Source implementation may be complete while RC approval remains pending.
