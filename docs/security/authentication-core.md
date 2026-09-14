# Authentication Core

## Identity

- Syrian mobile number is the login identifier in v1.
- Accepted input formats: `09xxxxxxxx` and `+9639xxxxxxxx`.
- Stored canonical form: `+9639xxxxxxxx`.
- Registration requires an active province.

## Passwords

- Password policy is centralized.
- Production adapter uses Argon2id.
- Passwords are never logged, returned, or sent through recovery channels.

## Sessions

- Access and refresh tokens are separate.
- Refresh tokens are rotated on refresh.
- Only a digest of the current refresh token is persisted.
- Reuse of a rotated refresh token revokes the affected session.
- Blocked users cannot login or refresh.
- Changing a password revokes all other sessions and rotates the current session.

## Recovery

`PasswordRecoveryService` is channel-agnostic. A `RecoveryChannel` can be backed by WhatsApp, SMS, or another verified provider.

WhatsApp is strictly a verification channel: it receives/sends OTP-style verification data only. The new password is entered inside the Health Directory app/API flow and is never sent to the bot.

To reduce account enumeration, recovery start returns the same response shape whether or not the phone belongs to an account. A challenge can exist without a `user_id`; only existing accounts receive the verification message.
