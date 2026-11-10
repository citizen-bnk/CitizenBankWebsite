-- Restore empty workflow structures to the existing API contracts.
CREATE TABLE IF NOT EXISTS board_meetings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,meeting_type text NOT NULL,
 meeting_date date NOT NULL,meeting_time time NOT NULL,location text,virtual_link text,description text,
 status text NOT NULL DEFAULT 'scheduled',created_by text NOT NULL,idempotency_key text,
 request_fingerprint text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(created_by,idempotency_key)
);
CREATE TABLE IF NOT EXISTS meeting_agendas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),meeting_id uuid NOT NULL REFERENCES board_meetings(id),
 item_number integer NOT NULL,title text NOT NULL,description text,duration_minutes integer,presenter text,
 attachments jsonb NOT NULL DEFAULT '[]',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS meeting_minutes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),meeting_id uuid NOT NULL REFERENCES board_meetings(id),content text NOT NULL,
 recorded_by text NOT NULL,approved boolean NOT NULL DEFAULT false,approved_by text,approved_at timestamptz,
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(meeting_id,version)
);
CREATE TABLE IF NOT EXISTS meeting_attendance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),meeting_id uuid NOT NULL REFERENCES board_meetings(id),board_member_id text NOT NULL,
 status text NOT NULL,arrival_time time,departure_time time,notes text,created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(meeting_id,board_member_id)
);
CREATE TABLE IF NOT EXISTS meeting_action_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),meeting_id uuid NOT NULL REFERENCES board_meetings(id),title text NOT NULL,
 description text,assigned_to text NOT NULL,due_date date,status text NOT NULL DEFAULT 'pending',priority text NOT NULL DEFAULT 'medium',
 completed_at timestamptz,completed_by text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS meeting_invitees (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),meeting_id uuid NOT NULL REFERENCES board_meetings(id),board_member_id text NOT NULL,
 email text NOT NULL,invited_by text NOT NULL,invitation_sent_at timestamptz,rsvp_status text NOT NULL DEFAULT 'pending',rsvp_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(meeting_id,board_member_id)
);
CREATE TABLE IF NOT EXISTS meeting_reminders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),meeting_id uuid NOT NULL REFERENCES board_meetings(id),reminder_type text NOT NULL,
 scheduled_for timestamp NOT NULL,sent boolean NOT NULL DEFAULT false,sent_at timestamptz,UNIQUE(meeting_id,reminder_type)
);
CREATE TABLE IF NOT EXISTS governance_sessions (
 id bigserial PRIMARY KEY,session_type text NOT NULL,title text NOT NULL,description text,status text NOT NULL DEFAULT 'draft',
 opens_at timestamptz,closes_at timestamptz,meeting_date timestamptz,meeting_location text,meeting_link text,
 requires_quorum boolean NOT NULL DEFAULT false,quorum_percentage integer,created_by text NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS governance_items (
 id bigserial PRIMARY KEY,session_id bigint NOT NULL REFERENCES governance_sessions(id),item_order integer NOT NULL,
 question text NOT NULL,description text,item_type text NOT NULL,options jsonb,metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS governance_votes (
 id bigserial PRIMARY KEY,session_id bigint NOT NULL REFERENCES governance_sessions(id),item_id bigint REFERENCES governance_items(id),
 voter_id text NOT NULL,voter_type text NOT NULL,vote_value text NOT NULL,voting_power numeric NOT NULL DEFAULT 1,
 voted_on_behalf_of text,comments text,voted_at timestamptz NOT NULL DEFAULT now(),UNIQUE(session_id,item_id,voter_id)
);
CREATE TABLE IF NOT EXISTS governance_documents (
 id bigserial PRIMARY KEY,session_id bigint NOT NULL REFERENCES governance_sessions(id),document_type text NOT NULL,
 file_url text NOT NULL,file_name text NOT NULL,file_size bigint,file_type text,description text,uploaded_by text NOT NULL,
 status text NOT NULL DEFAULT 'draft',uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS governance_approvals (
 id bigserial PRIMARY KEY,approval_type text NOT NULL,item_id bigint NOT NULL,approver_id text NOT NULL,
 status text NOT NULL DEFAULT 'pending',response_value text,comments text,approved_at timestamptz,created_at timestamptz DEFAULT now(),
 UNIQUE(approval_type,item_id,approver_id)
);
CREATE TABLE IF NOT EXISTS proxy_assignments (
 id bigserial PRIMARY KEY,assignor_id text NOT NULL,proxy_id text NOT NULL,scope_type text NOT NULL,
 session_id bigint REFERENCES governance_sessions(id),valid_until timestamptz,notes text,status text NOT NULL DEFAULT 'active',created_at timestamptz DEFAULT now()
);
