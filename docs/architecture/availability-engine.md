# Availability Engine — Phase 7

Availability is derived at request time from weekly business hours, the Damascus business timezone, and active temporary closures. No `is_open_now` column or scheduler is the source of truth. Overnight periods check both the current day and the previous day's spillover. Temporary closure has priority over normal business hours and expires automatically by timestamp.
