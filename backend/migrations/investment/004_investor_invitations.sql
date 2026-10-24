-- The original admin create-on-behalf flow records an invitation for new investors.
-- migrate:step
CREATE TABLE IF NOT EXISTS public.board_member_invitations (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  role text NOT NULL,
  invited_by text,
  verification_code text,
  expires_at timestamptz,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
