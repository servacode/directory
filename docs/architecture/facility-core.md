# Facility Core

All categories share the `facilities` aggregate and `facility_members` ownership model.

A facility belongs to a dynamic `directory_categories` row through `category_id`. Most new categories use `GENERIC` specialization and need no profile table or application enum change.

Specialized profile tables exist only where real specialized data is required:

- pharmacy profile;
- medical clinic profile;
- nursing center profile.

Owner onboarding is category-driven, province-scoped and gated by configurable private verification requirements.
