# Reliability and weak-network strategy

The mobile network core retries only safe GET operations, uses exponential backoff, never automatically repeats state-changing POST/PUT/PATCH/DELETE operations, and coordinates concurrent authentication failures through one refresh-token operation.

Public cached reads are classified by domain. Duty and availability data have short freshness windows and must surface a stale-data warning when used offline. Reference data can remain usable much longer. Owner/admin write operations require a confirmed online response and are not queued for later replay in v1.

The API pool uses explicit connection, idle, and statement timeouts. Database calls above the configured slow-query threshold emit structured slow-query events without logging SQL parameters. Readiness performs a real database ping while liveness only confirms the API process is alive.
