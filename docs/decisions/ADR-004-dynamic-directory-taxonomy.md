# ADR-004 — Dynamic Directory Taxonomy and Verification Policies

## Status

Accepted before first production release.

## Context

The original model represented Pharmacy, Medical Clinic, Nursing Center and Medical Supplies as the public application taxonomy. Product scope evolved to allow medical laboratories and later ordinary commercial/service businesses to be added per governorate from Admin without rebuilding Android whenever the new category uses existing common directory capabilities.

Binding accounts or public discovery to a fixed facility enum would force repeated schema/API/app releases and would mix public business taxonomy with technical behavior.

## Decision

1. Public taxonomy is stored in `directory_category_groups` and `directory_categories`.
2. Facilities reference `category_id`.
3. `facilities.specialization` is an internal implementation hint only and is limited to code-backed specialized behavior (`GENERIC`, `PHARMACY`, `MEDICAL_CLINIC`, `NURSING_CENTER`).
4. `directory_category_provinces` controls public visibility and owner registration independently per governorate.
5. Category groups and category names/order are admin-managed data.
6. Generic categories require no new source branch and receive common capabilities.
7. Private owner-verification requirements are data-driven per category.
8. Verification evidence is stored separately from public facility images and requires authenticated owner/admin paths.
9. Initial Raqqa launch activates Pharmacy only; all other categories remain closed until Admin deliberately enables them.

## Consequences

### Positive

- New generic business categories can be introduced without an Android release.
- Rollout can differ by governorate.
- Accounts remain reusable across multiple business types.
- Verification policy can be tightened per category without changing client code.
- Pharmacy duty remains isolated as a real technical specialization.

### Tradeoffs

- New category-specific workflows still require code and a formal Change Request.
- Icon choices for generic categories are limited to the centrally supported icon registry unless a new icon is shipped.
- Category/group deactivation must be treated as configuration, not data deletion.

## Migration

Migration `0010_dynamic_directory_categories.sql` creates the taxonomy/verification tables, backfills existing facilities to category IDs and renames legacy `facility_type` to internal `specialization`.
