# Master Specification v1.1 — منصة الدليل

This file is the product source of truth. It supersedes the pre-release v1.0 assumption that public facility taxonomy is a fixed application enum.

## Product model

The product is a province-based directory platform with one Android application for public users and business/facility owners, a lightweight Admin Web, a NestJS API, and PostgreSQL/PostGIS.

The platform is technically category-agnostic. It can support health categories and later commercial/service categories without creating a separate application or binding a user account to one business type.

## Initial public launch

The first operational launch is intentionally narrow:

- Governorate: Raqqa.
- Public category enabled: Pharmacy only.
- Owner onboarding enabled: Pharmacy only.
- Pharmacy duty: enabled.
- Medical laboratories, clinics, nursing centers, medical supplies and future commercial categories are preconfigured or creatable but remain hidden/closed until enabled by Admin.
- Other Syrian governorates remain inactive until rollout.

## Dynamic directory taxonomy

Public taxonomy is data-driven:

- `DirectoryCategoryGroup`: high-level grouping such as Health, Shopping or Services.
- `DirectoryCategory`: an admin-managed category such as Pharmacy, Medical Laboratory, Clothing or Mobile Phones.
- `DirectoryCategoryProvince`: per-governorate switches for public visibility and owner registration.
- `CategoryCapabilities`: feature flags that describe supported behaviors.
- `VerificationPolicy`: private evidence requirements for owner onboarding.

Public category identity is always `categoryId`. Category codes and names are metadata, not application branching keys.

## Internal specialization

A category may carry an internal technical `specialization` only when source-code behavior is truly specialized:

- `GENERIC`
- `PHARMACY`
- `MEDICAL_CLINIC`
- `NURSING_CENTER`

This is not the public taxonomy. New ordinary commercial categories use `GENERIC` and do not require a code release.

Examples:

- Pharmacy category → `PHARMACY` specialization to support duty shifts.
- Medical lab → `GENERIC` unless a future lab-specific feature requires code.
- Clothing store → `GENERIC`.

## Category groups

Admin can:

- create category groups;
- rename them;
- order them;
- activate/deactivate them;
- move categories between groups.

Public Android receives group names from the API and renders categories grouped by server data. No group name is hardcoded in the app.

## Category activation

Each category has:

- global `isActive` kill switch;
- `publicEnabled` per governorate;
- `ownerRegistrationEnabled` per governorate.

This allows, for example, Medical Laboratories to be public/registerable in Raqqa while remaining disabled elsewhere.

Disabling a group hides its categories publicly without deleting data.

## Accounts and ownership

Accounts are generic user accounts.

Registration requires:

- name;
- Syrian phone number only;
- profile governorate;
- password.

The account itself is never “pharmacy account”, “lab account” or “store account”. A user may own/manage multiple facilities/businesses across categories and governorates.

User profile governorate and facility governorate are independent.

## Owner onboarding

From the account, the user chooses “Add your business to the directory”.

The app requests only categories whose `ownerRegistrationEnabled` is true in the selected active governorate.

Core workflow:

1. Choose governorate/category.
2. Basic information.
3. Map location.
4. Business hours when supported.
5. Public facility images when supported.
6. Category-specific fields when required by technical specialization/capabilities.
7. Private verification evidence.
8. Review and submit.
9. Admin approve/reject.

Drafts can be resumed even if owner registration is later disabled; submission/re-submission must obey the current category policy.

## Verification evidence

Verification evidence is separate from public facility media.

Default requirements for a newly created generic category:

- storefront/sign photo;
- business card image.

Admin can configure requirements per category:

- Arabic/English label;
- instructions;
- required/optional;
- active/inactive;
- minimum file count;
- maximum file count.

Future examples include laboratory license or other professional proof.

Evidence files are private, never exposed through public media endpoints, and are accessible only through authorized Admin review endpoints. Viewing evidence is audit logged.

Storefront/business-card images are review evidence, not automatic legal proof of ownership.

## Admin approval

A pending facility cannot be approved until all active required verification requirements meet their configured minimum file count.

Admin may:

- inspect facility/application data;
- inspect private evidence;
- review duplicate warnings;
- approve;
- reject with reason;
- suspend/reactivate active facilities.

## Discovery

Public listing is category-driven.

Within the selected active governorate:

- show all ACTIVE facilities in the selected public-enabled category;
- do not impose a small-radius cutoff on the general category list;
- when precise location exists, sort nearest-first;
- when location is unavailable, show the governorate-wide list without fabricated distance.

Capability-driven filters may include open-now, duty, specialty or service filters.

## Pharmacy duty

Pharmacy duty remains a specialized feature and is available only to categories with pharmacy specialization/duty capability.

Duty is time-derived, overlap-protected at PostgreSQL level, and temporary closure overrides duty.

## Public browsing

No account is required for public browsing, search, map, facility details, phone calls, directions or duty-pharmacy discovery.

Login is required for ratings and owner/account actions.

## Ratings

Ratings are 1–5 stars only, one rating per user/facility, editable, with no written reviews. Owners cannot rate their own facility.

## Maps and geo

MapLibre-based architecture is reused where appropriate. PostGIS is the server source of truth for distance/geo queries. No background user tracking is required.

## Password recovery

Recovery uses a provider abstraction suitable for WhatsApp OTP/reset-link delivery. The new password is entered only inside the app; the messaging channel never receives the new password.

## Operational rollout

All Syrian governorates are seeded. Raqqa is active first. New governorates and categories are activated from Admin without an app release where no new technical capability is required.

## Scope discipline

Creating a new `GENERIC` category, moving it between groups, changing verification policy, or activating it in a governorate is configuration and does not require a product Change Request.

Adding a genuinely new technical capability (for example appointment booking, e-commerce, delivery, laboratory-results integration or another specialized workflow) requires architecture/product review and a Change Request.

## v1 launch exclusions

The first Raqqa release does not include appointments, chat, medical consultations, patient records, prescriptions, ordering/delivery, payments, e-commerce, insurance, social feed or written reviews.
