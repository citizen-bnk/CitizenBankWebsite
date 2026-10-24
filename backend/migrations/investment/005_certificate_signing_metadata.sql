-- Signing produces a new immutable R2 object and advances certificate metadata.
-- migrate:step
ALTER TABLE public.share_certificates
  ADD COLUMN IF NOT EXISTS signer_name text,
  ADD COLUMN IF NOT EXISTS signer_role text,
  ADD COLUMN IF NOT EXISTS signature_image_url text;
