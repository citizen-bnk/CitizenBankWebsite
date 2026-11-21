-- Restore the existing prospects/import workflow. No investor records are seeded.
CREATE TABLE IF NOT EXISTS investor_leads (
 id bigserial PRIMARY KEY,
 full_name text NOT NULL,
 email text NOT NULL,
 phone text,
 company text,
 country text NOT NULL,
 lead_source text NOT NULL DEFAULT 'unknown',
 investment_interest_amount numeric(18,2),
 preferred_share_class text,
 status text NOT NULL DEFAULT 'new',
 notes text,
 assigned_to text,
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS investor_leads_email_unique ON investor_leads(lower(email));
CREATE TABLE IF NOT EXISTS lead_activity_log (
 id bigserial PRIMARY KEY,
 lead_id bigint NOT NULL REFERENCES investor_leads(id),
 activity_type text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_by text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_activity_recent ON lead_activity_log(lead_id,created_at DESC);
ALTER TABLE share_subscriptions ADD COLUMN IF NOT EXISTS lead_id bigint;
