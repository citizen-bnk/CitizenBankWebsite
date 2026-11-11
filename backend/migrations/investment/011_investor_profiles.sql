-- Restore the controlled vocabulary without granting any permissions to a person.
INSERT INTO platform.role_definition(role,description,workspace) VALUES
 ('customer','Banking customer','banking'),
 ('investor','Investment subscriber or SAFE holder','member'),
 ('shareholder','Registered shareholder','member'),
 ('board_member','Appointed board member','member'),
 ('staff','Operational staff','back_office'),
 ('back_office','Back-office operations','back_office'),
 ('admin','Administrator','back_office'),
 ('super_admin','Super administrator','back_office')
ON CONFLICT(role) DO NOTHING;
CREATE TABLE IF NOT EXISTS investor_profiles (
    person_id uuid PRIMARY KEY REFERENCES platform.person(id),
    source_key text NOT NULL UNIQUE,
    entity_type text NOT NULL CHECK (entity_type IN ('person','organisation')),
    contact_email text,
    contact_phone text,
    contact_status text NOT NULL CHECK (contact_status IN ('unique_email','shared_contact','missing','review')),
    provider_subject text UNIQUE,
    activation_status text NOT NULL DEFAULT 'pending' CHECK (activation_status IN ('pending','provisioned','linked','review','excluded')),
    relationship text NOT NULL,
    source_link text,
    source_date date NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cap_table_working_records ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES platform.person(id);
CREATE INDEX IF NOT EXISTS cap_table_working_person_idx ON cap_table_working_records(person_id);
ALTER TABLE investor_profiles ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE investor_profiles ADD COLUMN IF NOT EXISTS investment_purpose text;
CREATE TABLE IF NOT EXISTS investor_documents (
    person_id uuid NOT NULL REFERENCES platform.person(id),
    drive_file_id text NOT NULL,
    title text NOT NULL,
    source_url text NOT NULL,
    review_note text NOT NULL,
    PRIMARY KEY (person_id,drive_file_id)
);
