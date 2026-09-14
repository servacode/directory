# Contracts Architecture

`@health/contracts` is the transport/domain contract boundary shared by API, Android and Admin.

## Dynamic taxonomy contracts

- `DirectoryCategoryGroupDTO`
- `DirectoryCategoryDTO`
- `CategoryProvinceActivationRequest`
- `CategoryVerificationRequirementDTO`
- category/group create/update requests

Public taxonomy is not a fixed TypeScript enum. `DirectoryCategoryDTO.id` / `categoryId` is used by discovery and facility onboarding.

`FACILITY_SPECIALIZATIONS` contains only technical specializations required by code-backed behaviors: `GENERIC`, `PHARMACY`, `MEDICAL_CLINIC`, `NURSING_CENTER`.
