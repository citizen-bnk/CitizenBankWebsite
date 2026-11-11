CREATE TABLE IF NOT EXISTS invitation_account_setup (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id bigint NOT NULL REFERENCES invitations(id),
    token_hash text NOT NULL UNIQUE,
    provider_subject text NOT NULL,
    recipient_email text NOT NULL,
    expires_at timestamptz NOT NULL,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS invitation_onboarding_attempts (
    id bigserial PRIMARY KEY,
    bucket text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitation_onboarding_attempt_idx ON invitation_onboarding_attempts(bucket,created_at);
