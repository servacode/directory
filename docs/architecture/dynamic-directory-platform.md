# Dynamic Directory Platform

## Taxonomy hierarchy

`Category Group → Category → Governorate Activation → Facility`

Example:

- Health
  - Pharmacy
  - Medical Laboratory
  - Medical Clinic
- Shopping
  - Clothing
  - Shoes

The hierarchy is returned by the API. Android does not own this taxonomy.

## Generic vs specialized

Most future categories should be `GENERIC` and use common facility data, hours, photos, ratings, geo, search and verification.

Only behaviors that cannot be described by common capabilities should receive a code-backed specialization. Pharmacy duty is the canonical example.

## Activation

Global `isActive` can stop a category/group completely. Per-province rows then independently control public visibility and owner onboarding.

A newly created generic category receives province rows with both switches OFF.

## Verification

Public facility photos and private verification evidence use separate APIs/storage namespaces. Private evidence is never emitted by discovery or public media endpoints.

New generic categories automatically receive storefront-photo and business-card requirements. Admin can edit or add requirements.
