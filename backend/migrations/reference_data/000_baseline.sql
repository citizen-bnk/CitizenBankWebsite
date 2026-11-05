-- Explicit operator restoration of missing reference tables, never a startup hook.
-- No people, appointments, payment accounts or commercial terms are inserted.
CREATE TABLE IF NOT EXISTS board_positions (
 id serial PRIMARY KEY,position_name text NOT NULL UNIQUE,position_level integer NOT NULL CHECK(position_level>0),
 description text,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS invitation_permissions (
 id serial PRIMARY KEY,role_name text NOT NULL UNIQUE,can_invite_roles text[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),created_by text
);
CREATE TABLE IF NOT EXISTS board_document_requirements (
 id serial PRIMARY KEY,name text NOT NULL,description text,jurisdictions text[] NOT NULL DEFAULT '{}',
 file_formats_accepted text[] NOT NULL DEFAULT '{pdf,jpg,png,docx}',max_file_size_mb integer NOT NULL DEFAULT 10,
 is_required boolean NOT NULL DEFAULT false,display_order integer NOT NULL DEFAULT 0,
 is_active boolean NOT NULL DEFAULT false,validity_period_days integer,
 requires_template boolean NOT NULL DEFAULT false,template_file_url text,template_file_name text,
 template_description text,template_uploaded_at timestamptz,template_uploaded_by text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS data_room_categories (
 id serial PRIMARY KEY,category_name text NOT NULL,description text,display_order integer NOT NULL DEFAULT 0,
 parent_category_id integer REFERENCES data_room_categories(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bank_accounts (
 id serial PRIMARY KEY,account_name text NOT NULL,bank_name text NOT NULL,account_number text NOT NULL,
 branch_code text NOT NULL,branch_name text,swift_code text,currency text NOT NULL,
 is_active boolean NOT NULL DEFAULT false,is_default boolean NOT NULL DEFAULT false,description text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS certificate_templates (
 id serial PRIMARY KEY,template_name text NOT NULL,template_html text,is_active boolean NOT NULL DEFAULT false,
 created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL,description text,preview_url text,template_type text NOT NULL DEFAULT 'pdf',
 pdf_storage_key text,share_class text
);
CREATE TABLE IF NOT EXISTS ncnda_templates (
 id serial PRIMARY KEY,version text NOT NULL,content text NOT NULL,effective_date date NOT NULL,
 is_active boolean NOT NULL DEFAULT false,created_by text,created_at timestamptz NOT NULL DEFAULT now()
);
-- Empty supporting structures only when the original member register exists.
DO $$ BEGIN
 IF to_regclass('public.board_members') IS NOT NULL THEN
  CREATE TABLE IF NOT EXISTS board_member_positions (
   id serial PRIMARY KEY,board_member_id integer NOT NULL REFERENCES board_members(id),
   position_id integer NOT NULL REFERENCES board_positions(id),appointed_at timestamptz NOT NULL,
   term_end_date timestamptz,ended_at timestamptz,appointed_by text NOT NULL,
   is_current boolean NOT NULL DEFAULT true,notes text
  );
  CREATE TABLE IF NOT EXISTS board_member_documents (
   id serial PRIMARY KEY,board_member_id integer NOT NULL REFERENCES board_members(id),
   document_requirement_id integer REFERENCES board_document_requirements(id),
   document_name text,file_url text,file_name text,file_size bigint,file_type text,
   status text NOT NULL DEFAULT 'not_submitted',submitted_at timestamptz,submitted_by text,
   reviewed_by text,reviewed_at timestamptz,review_notes text,rejection_reason text,
   resubmission_count integer NOT NULL DEFAULT 0,expires_at timestamptz,
   created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
  );
 END IF;
END $$;
