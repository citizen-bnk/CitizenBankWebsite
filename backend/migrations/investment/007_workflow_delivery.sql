-- Additive compatibility for restored investor and board workflows. No business rows.
ALTER TABLE share_subscriptions ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE share_subscriptions ADD COLUMN IF NOT EXISTS request_fingerprint text;
ALTER TABLE share_subscriptions ADD COLUMN IF NOT EXISTS submission_actor text;
CREATE UNIQUE INDEX IF NOT EXISTS subscription_actor_request_unique
 ON share_subscriptions(submission_actor,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscription_request_unique
 ON share_subscriptions(user_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE board_member_documents ADD COLUMN IF NOT EXISTS file_size_kb integer;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS severity_level text NOT NULL DEFAULT 'normal';
ALTER TABLE board_document_requirements ADD COLUMN IF NOT EXISTS default_severity text NOT NULL DEFAULT 'normal';
ALTER TABLE board_document_requirements ADD COLUMN IF NOT EXISTS notification_popup_behavior text NOT NULL DEFAULT 'dismissible';
ALTER TABLE board_document_requirements ADD COLUMN IF NOT EXISTS auto_reminder_interval_days integer;
ALTER TABLE board_document_requirements ADD COLUMN IF NOT EXISTS escalation_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS document_requests (
 id bigserial PRIMARY KEY,request_number text NOT NULL UNIQUE,board_member_id text NOT NULL,
 document_type text NOT NULL,reason text,deadline timestamptz,is_urgent boolean NOT NULL DEFAULT false,
 requested_by text NOT NULL,status text NOT NULL DEFAULT 'pending',
 request_type text NOT NULL DEFAULT 'individual',document_requirement_ids integer[] NOT NULL DEFAULT '{}',
 severity_level text NOT NULL DEFAULT 'normal',custom_message text,acknowledged_at timestamptz,completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
UPDATE board_member_documents SET file_size_kb=ceil(file_size/1024.0)::integer
 WHERE file_size_kb IS NULL AND file_size IS NOT NULL;
CREATE TABLE IF NOT EXISTS crypto_wallets (
 id serial PRIMARY KEY,crypto_type text NOT NULL UNIQUE,wallet_address text NOT NULL,network_info text,
 is_active boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS profile_completion_reminders (
 id bigserial PRIMARY KEY,user_id text NOT NULL,subscription_id text NOT NULL UNIQUE,email text NOT NULL,
 full_name text NOT NULL,scheduled_for timestamp NOT NULL,status text NOT NULL DEFAULT 'pending',
 sent_at timestamp,cancelled_at timestamp,cancellation_reason text,error_message text,
 created_at timestamp NOT NULL DEFAULT now(),updated_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_templates (
 id serial PRIMARY KEY,template_name text NOT NULL UNIQUE,category text NOT NULL,subject text NOT NULL,
 body_html text NOT NULL,variables text[] NOT NULL DEFAULT '{}',status text NOT NULL DEFAULT 'draft',
 usage_count integer NOT NULL DEFAULT 0,created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_queue (
 id bigserial PRIMARY KEY,queue_id text NOT NULL UNIQUE,recipient_email text NOT NULL,recipient_name text NOT NULL,
 recipient_id text,subject text NOT NULL,body_html text NOT NULL,body_text text,template_id integer,
 priority text NOT NULL DEFAULT 'normal',scheduled_for timestamp NOT NULL DEFAULT now(),
 max_retries integer NOT NULL DEFAULT 3,retry_count integer NOT NULL DEFAULT 0,status text NOT NULL DEFAULT 'pending',
 sent_at timestamptz,last_error text,created_by text NOT NULL,dedupe_key text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_queue_due_idx ON email_queue(scheduled_for) WHERE status IN ('pending','retrying');
CREATE TABLE IF NOT EXISTS email_history (
 id bigserial PRIMARY KEY,email_id text NOT NULL UNIQUE,queue_id text NOT NULL UNIQUE,recipient_id text,
 recipient_email text NOT NULL,recipient_name text,subject text NOT NULL,body_html text NOT NULL,
 template_id integer,status text NOT NULL,sent_at timestamptz,sent_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_role_history (
 id bigserial PRIMARY KEY,user_id text NOT NULL,role_name text NOT NULL,action text NOT NULL,
 performed_by_user_id text,performed_by_name text,reason text,changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
 id bigserial PRIMARY KEY,user_id text,recipient_email text NOT NULL,message_type text NOT NULL,
 subject text NOT NULL,content text NOT NULL,cta_label text,cta_action text,cta_data jsonb,
 status text NOT NULL DEFAULT 'pending',related_invitation_id bigint,expires_at timestamptz,
 completed_at timestamptz,dismissed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_recipient_email_idx ON messages(recipient_email);
