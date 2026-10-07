-- Policies as data: one row per setting, with who may read it, an optional JSON schema, and a history of changes.
-- RENDERED from backend/app/libs/policy_seed.py (python -m app.libs.policy_seed --write). Safe to run more than once:
-- existing rows (and any value an administrator has changed) are never overwritten.
CREATE TABLE IF NOT EXISTS app_policy (
    key         text PRIMARY KEY,
    value       jsonb       NOT NULL,
    value_type  text        NOT NULL DEFAULT 'string',
    description text,
    audience    text        NOT NULL DEFAULT 'authenticated' CHECK (audience IN ('public', 'authenticated', 'staff')),
    schema      jsonb,
    version     integer     NOT NULL DEFAULT 1,
    updated_by  text,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_policy_history (
    id         bigserial PRIMARY KEY,
    key        text        NOT NULL,
    value      jsonb       NOT NULL,
    version    integer     NOT NULL,
    changed_by text,
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_policy_history_key_idx ON app_policy_history (key, changed_at DESC);

INSERT INTO app_policy (key, value, value_type, description, audience, schema, updated_by) VALUES
  ('legal.company_name', '"Citizen Digital Ltd"'::jsonb, 'string', 'Registered company name.', 'public', '{"minLength": 1, "type": "string"}'::jsonb, 'seed'),
  ('legal.registration_number', '"99073"'::jsonb, 'string', 'Company registration number.', 'public', '{"minLength": 1, "type": "string"}'::jsonb, 'seed'),
  ('legal.licence_status', '"Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence and does not currently carry on banking business."'::jsonb, 'string', 'The sentence that states the licence position. Change it the day a licence is granted.', 'public', '{"minLength": 10, "type": "string"}'::jsonb, 'seed'),
  ('legal.footer', '"Citizen Digital Ltd. Citizen Bank is an applicant for a banking licence from the Central Bank of Lesotho and does not yet carry on banking business."'::jsonb, 'string', 'Short licence-status line shown in the page footer.', 'public', '{"minLength": 10, "type": "string"}'::jsonb, 'seed'),
  ('legal.links', '[{"label": "Privacy", "path": "/privacy-policy"}, {"label": "Terms", "path": "/terms-of-service"}, {"label": "Disclosures", "path": "/disclosures"}, {"label": "Contact", "path": "/contact"}]'::jsonb, 'array', 'Footer links: label and site path.', 'public', '{"items": {"properties": {"label": {"minLength": 1, "type": "string"}, "path": {"pattern": "^/", "type": "string"}}, "required": ["label", "path"], "type": "object"}, "type": "array"}'::jsonb, 'seed'),
  ('brand.name', '"Citizen Bank"'::jsonb, 'string', 'Brand name shown to people.', 'public', '{"minLength": 1, "type": "string"}'::jsonb, 'seed'),
  ('brand.logo_url', '"/brand/logo-sm.webp"'::jsonb, 'string', 'Small logo used in the Hub header.', 'public', '{"minLength": 1, "type": "string"}'::jsonb, 'seed'),
  ('careers.apply_email', 'null'::jsonb, 'string', 'Where applications are sent. Null hides the apply line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('careers.apply_instructions', 'null'::jsonb, 'string', 'How to apply (free text). Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('contact.email', 'null'::jsonb, 'string', 'General public contact email. Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('contact.phone', 'null'::jsonb, 'string', 'Public contact phone number. Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('contact.address', 'null'::jsonb, 'string', 'Public postal or street address. Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('contact.invest', 'null'::jsonb, 'string', 'Investor enquiries email. Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('contact.shares', 'null'::jsonb, 'string', 'Share subscription email. Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('contact.compliance', 'null'::jsonb, 'string', 'Compliance email. Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('contact.support_email', 'null'::jsonb, 'string', 'Support email shown on the website. Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('contact.privacy_email', 'null'::jsonb, 'string', 'Privacy enquiries email. Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('contact.legal_email', 'null'::jsonb, 'string', 'Legal notices email. Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('contact.security_email', 'null'::jsonb, 'string', 'Security disclosures email. Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('contact.support', 'null'::jsonb, 'string', 'Support email. Null hides the line.', 'public', '{"type": ["string", "null"]}'::jsonb, 'seed'),
  ('app.base_currency', '"LSL"'::jsonb, 'string', 'Base currency of the bank (ISO 4217).', 'authenticated', '{"pattern": "^[A-Z]{3}$", "type": "string"}'::jsonb, 'seed'),
  ('app.default_country', '"Lesotho"'::jsonb, 'string', 'Default country for forms.', 'authenticated', '{"minLength": 2, "type": "string"}'::jsonb, 'seed'),
  ('app.locale', '"en-ZA"'::jsonb, 'string', 'Locale for number and date formats.', 'authenticated', '{"pattern": "^[a-z]{2}(-[A-Z]{2})?$", "type": "string"}'::jsonb, 'seed'),
  ('payments.deadline_days', 'null'::jsonb, 'integer', 'Days an investor has to pay. Today a database default sets payment_deadline; null means ''not set by policy''.', 'authenticated', '{"minimum": 1, "type": ["integer", "null"]}'::jsonb, 'seed'),
  ('payments.reminder_days', '[7, 3, 1]'::jsonb, 'array', 'Days before the payment deadline on which reminders go out.', 'authenticated', '{"items": {"minimum": 1, "type": "integer"}, "minItems": 1, "type": "array"}'::jsonb, 'seed'),
  ('payments.first_reminder_hours', '24'::jsonb, 'integer', 'Hours after a subscription is created before the first reminder.', 'authenticated', '{"minimum": 1, "type": "integer"}'::jsonb, 'seed'),
  ('invitations.expiry_days', '{"board": 7, "investor": 30, "subscription": 30}'::jsonb, 'object', 'Days an invitation stays valid, by kind.', 'staff', '{"properties": {"board": {"minimum": 1, "type": "integer"}, "investor": {"minimum": 1, "type": "integer"}, "subscription": {"minimum": 1, "type": "integer"}}, "required": ["board", "investor", "subscription"], "type": "object"}'::jsonb, 'seed'),
  ('invitations.reminder_hours', '36'::jsonb, 'integer', 'Hours before an unanswered invitation is reminded, and between reminders.', 'staff', '{"minimum": 1, "type": "integer"}'::jsonb, 'seed'),
  ('compliance.expiry_warning_days', '[90, 60, 30, 7]'::jsonb, 'array', 'Days before a board document expires on which warnings go out.', 'authenticated', '{"items": {"minimum": 1, "type": "integer"}, "minItems": 1, "type": "array"}'::jsonb, 'seed'),
  ('board.term_years', '{"default": 3, "max": 6, "min": 1}'::jsonb, 'object', 'Board member term length in years.', 'authenticated', '{"properties": {"default": {"minimum": 1, "type": "integer"}, "max": {"minimum": 1, "type": "integer"}, "min": {"minimum": 1, "type": "integer"}}, "required": ["min", "max", "default"], "type": "object"}'::jsonb, 'seed'),
  ('auth.otp_minutes', '5'::jsonb, 'integer', 'Minutes a one-time sign-in code stays valid.', 'public', '{"minimum": 1, "type": "integer"}'::jsonb, 'seed'),
  ('auth.code_seconds', '90'::jsonb, 'integer', 'Seconds a board portal access code stays valid.', 'public', '{"minimum": 1, "type": "integer"}'::jsonb, 'seed'),
  ('email.max_retries', '3'::jsonb, 'integer', 'Times a failed email is retried.', 'staff', '{"minimum": 0, "type": "integer"}'::jsonb, 'seed'),
  ('email.backoff_minutes', '5'::jsonb, 'integer', 'Base retry delay in minutes; it doubles on each retry.', 'staff', '{"minimum": 1, "type": "integer"}'::jsonb, 'seed'),
  ('kyc.phone_regex', '"^\\+?[0-9 ()-]{7,20}$"'::jsonb, 'string', 'Pattern a phone number must match.', 'authenticated', '{"minLength": 1, "type": "string"}'::jsonb, 'seed'),
  ('kyc.required_fields', '["full_name", "phone", "date_of_birth", "street_address", "city", "country"]'::jsonb, 'array', 'Profile fields that must be filled before first use.', 'authenticated', '{"items": {"minLength": 1, "type": "string"}, "type": "array"}'::jsonb, 'seed'),
  ('governance.majority_rule', '"simple"'::jsonb, 'string', 'How a vote passes. Today: more votes for than against.', 'authenticated', '{"enum": ["simple"], "type": "string"}'::jsonb, 'seed'),
  ('governance.quorum_percent', 'null'::jsonb, 'number', 'Share of members needed for a valid vote. Null: none enforced today.', 'authenticated', '{"maximum": 100, "minimum": 0, "type": ["number", "null"]}'::jsonb, 'seed')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_policy_history (key, value, version, changed_by)
SELECT p.key, p.value, p.version, 'seed' FROM app_policy p
WHERE NOT EXISTS (SELECT 1 FROM app_policy_history h WHERE h.key = p.key);
