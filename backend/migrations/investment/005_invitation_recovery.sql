-- Unified invitation records for the original website and investor resend flow.
CREATE TABLE IF NOT EXISTS public.invitations (
  id bigserial PRIMARY KEY,
  invitation_type text NOT NULL DEFAULT 'board',
  lead_id bigint,
  email text NOT NULL,
  full_name text,
  role text NOT NULL,
  token text NOT NULL UNIQUE,
  tracking_token text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  invited_by text,
  invited_by_name text,
  sent_by text,
  message text,
  position text,
  share_class_offered text,
  minimum_investment numeric(18,2),
  special_terms text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  responded_at timestamptz,
  accepted_at timestamptz,
  accepted_by text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitations_email_type_idx
  ON public.invitations (lower(email), invitation_type, created_at DESC);
