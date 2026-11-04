CREATE TABLE IF NOT EXISTS governance_email_queue (
    id bigserial PRIMARY KEY,
    session_id bigint NOT NULL,
    recipient_user_id text NOT NULL,
    recipient_email text NOT NULL,
    recipient_name text NOT NULL,
    subject text NOT NULL,
    html_body text NOT NULL,
    scheduled_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
    sent_at timestamptz,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS governance_email_queue_pending_idx
    ON governance_email_queue(scheduled_at) WHERE status='pending';
