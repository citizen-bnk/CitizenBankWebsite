-- Add only metadata needed by the restored investment endpoints. Existing records are preserved.
-- migrate:step
ALTER TABLE public.share_subscriptions
  ADD COLUMN IF NOT EXISTS purchase_currency text DEFAULT 'LSL',
  ADD COLUMN IF NOT EXISTS purchase_exchange_rate numeric,
  ADD COLUMN IF NOT EXISTS amount_in_purchase_currency numeric,
  ADD COLUMN IF NOT EXISTS payment_proof_path text,
  ADD COLUMN IF NOT EXISTS payment_proof_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_proof_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_proof_verified_by text,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS invitation_id integer;

-- migrate:step
ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS payment_proof_url text;

-- migrate:step
CREATE TABLE IF NOT EXISTS public.share_certificates (
  id bigserial PRIMARY KEY,
  certificate_number text NOT NULL UNIQUE,
  subscription_id integer REFERENCES public.share_subscriptions(id),
  user_id text,
  full_name text,
  shareholder_name text,
  shares_count integer NOT NULL,
  share_class text DEFAULT 'Ordinary',
  id_number text,
  issue_date date,
  certificate_url text,
  pdf_storage_key text,
  verification_code text,
  verification_token text,
  qr_code_svg_data text,
  issued_by text DEFAULT 'system',
  status text NOT NULL DEFAULT 'preview',
  drive_file_id text,
  template_id integer,
  version integer NOT NULL DEFAULT 1,
  download_count integer NOT NULL DEFAULT 0,
  signed_at timestamptz,
  signed_by text,
  revoked_at timestamptz,
  revoked_by text,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
