BEGIN;

CREATE TABLE password_recovery_challenges (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL CHECK (phone ~ '^\+9639[0-9]{8}$'),
  verification_code_hash TEXT NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 10),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  recovery_token_hash TEXT,
  recovery_token_expires_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recovery_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT recovery_verified_token_pair_check CHECK (
    (verified_at IS NULL AND recovery_token_hash IS NULL AND recovery_token_expires_at IS NULL)
    OR
    (verified_at IS NOT NULL AND recovery_token_hash IS NOT NULL AND recovery_token_expires_at IS NOT NULL)
  ),
  CONSTRAINT recovery_token_expiry_check CHECK (
    recovery_token_expires_at IS NULL OR recovery_token_expires_at > verified_at
  ),
  CONSTRAINT recovery_consumed_check CHECK (
    consumed_at IS NULL OR verified_at IS NOT NULL
  )
);

CREATE INDEX idx_password_recovery_phone_created
  ON password_recovery_challenges(phone, created_at DESC);
CREATE INDEX idx_password_recovery_expiry
  ON password_recovery_challenges(expires_at)
  WHERE consumed_at IS NULL;

COMMIT;
