# Account & Ratings — Phase 10

Ratings are star-only and use one upserted row per `(user, facility)`. Facility members cannot rate their own facility. Profile photos are optional and stored through a central object-storage abstraction; the current adapter is filesystem-backed for development and exposes only validated generated keys through the media controller. Production can replace the adapter without changing account business logic.
