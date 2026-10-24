-- Legacy readers select html_content. Keep a nullable compatibility field;
-- generated certificate content is stored in private R2, never in this field.
-- migrate:step
ALTER TABLE public.share_certificates
  ADD COLUMN IF NOT EXISTS html_content text;

-- migrate:step
ALTER TABLE public.share_certificates
  ALTER COLUMN issued_by SET DEFAULT 'system';
