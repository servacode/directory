# Authorization Matrix — v1

| Capability | Guest | User | Facility Owner | Admin |
|---|---:|---:|---:|---:|
| Browse active public facilities | Yes | Yes | Yes | Yes |
| Search / map / duty discovery | Yes | Yes | Yes | Yes |
| Rate active facility | No | Yes | Yes, except facilities they own/manage | Yes, except own/manage rule remains |
| Create facility draft | No | Yes | Yes | Yes only through user flow unless an admin-specific flow is added |
| Read owner-only facility data | No | Own only | Own only | Yes through admin endpoints |
| Edit low-risk operational facility data | No | Own only | Own only | Yes through audited admin action |
| Edit approved sensitive identity/location/specialization data | No | Re-verification only | Re-verification only | Yes through audited review flow |
| Request re-verification for approved facility | No | Own only | Own only | Admin may initiate an equivalent audited review flow if implemented |
| Upload/remove private verification evidence | No | Verification-editable own facility only | Verification-editable own facility only | View/review through Admin; owner evidence mutation rules still apply |
| Manage business hours / temporary closure | No | Own only | Own only | Admin action only where explicitly exposed |
| Manage pharmacy duty | No | Own active pharmacy only | Own active pharmacy only | View/admin intervention only where explicitly exposed |
| Submit facility application | No | Own only | Own only | No public bypass |
| Approve / reject application | No | No | No | Yes |
| Suspend / reactivate facility | No | No | No | Yes |
| Manage provinces/cities/neighborhoods | No | No | No | Yes |
| Manage specialties/nursing services | No | No | No | Yes |
| Manage platform settings | No | No | No | Yes |
| View audit data | No | No | No | Yes when endpoint exists |

## Enforcement rules

- Backend authorization is authoritative; hidden UI actions are never considered protection.
- Facility mutation endpoints validate membership through `FacilityPermissionService`.
- `/admin/*` actions require a valid active session and `ADMIN` role.
- Write contracts reject unknown fields to prevent mass assignment.
- Public DTOs must not expose password hashes, refresh token hashes, owner account details, internal audit metadata, or administrative rejection/suspension notes unless explicitly intended.


## Re-verification integrity

- `ACTIVE` / `SUSPENDED` facilities cannot directly change sensitive approved identity, location or specialization data.
- An owner requests re-verification, which moves the facility to `REVERIFICATION_REQUIRED` and removes it from public discovery while sensitive edits/evidence changes are made.
- Re-submission returns the facility to `PENDING_REVIEW`; only Admin approval restores `ACTIVE`.
- Closing new-owner onboarding for a category does not block re-verification of an already-approved facility.
- Public images, business hours and temporary closures are lower-risk operational data and do not by themselves require re-verification.
