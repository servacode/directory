# Admin Facility Review — Phase 6

Facility application decisions are transactional and lock both the application and facility rows. Only `ADMIN` can invoke review/suspension endpoints. Approval activates the facility; rejection preserves the application history and moves the facility to `REJECTED`. Suspension is independent of business availability and immediately removes a facility from the public ACTIVE scope.

Duplicate detection is advisory only. It combines exact phone match, trigram name similarity and a 30m PostGIS proximity signal; it never auto-rejects an application.
