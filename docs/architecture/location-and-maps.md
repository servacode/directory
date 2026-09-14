# Location & Maps Architecture — Phase 4

## Principles
- Device location is optional; manual province/city selection must always work.
- No background tracking or location history is stored.
- Precise distance and nearest ordering are computed by PostgreSQL/PostGIS, never by feature screens.
- Public discovery across a governorate is not artificially clipped to a small radius; radius queries are reserved for explicitly nearby experiences.
- MapLibre is isolated behind a provider boundary so screens do not import the native map library directly.
- The map foundation mirrors the reusable MapLibre/location architecture used by RahalGo, without delivery-specific routing/tracking features.

## Mobile core
`LocationService` owns permission state, GPS availability, current position, manual selection and cache freshness.

## Backend
`LocationsModule` exposes active reference geography. `GeoService` owns PostGIS distance, nearest and viewport/bounds queries.

## Production map tiles/style
Demo MapLibre tiles/styles are not acceptable for production. Production must provide a configured style/tile source through central configuration.
