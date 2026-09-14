# Security Model — v1

Primary threats covered by the application architecture are account takeover, token theft/reuse, IDOR across facility ownership, privilege escalation into admin routes, mass assignment, unsafe image uploads, request flooding, SQL injection through dynamic queries, public-data leakage, and stale visibility after administrative suspension.

Controls include Argon2id password hashes, hashed rotating refresh tokens, active-session validation on access tokens, role guards, object-level facility ownership checks, strict runtime write schemas, parameterized SQL, PostgreSQL constraints, authentication/recovery throttling, image magic-byte validation, generated object keys, structured public error responses, explicit CORS origins, Helmet, and central status/visibility queries.

Location history and background tracking are intentionally out of scope. Password recovery channels receive verification material only and never receive a user's new password.
