-- Careers: job adverts (contracts.md section 3). Safe to run more than once.
CREATE TABLE IF NOT EXISTS job_adverts (
    id                bigserial PRIMARY KEY,
    slug              text        NOT NULL,
    title             text        NOT NULL,
    department        text,
    employment_type   text,
    location          text,
    summary           text,
    responsibilities  jsonb       NOT NULL DEFAULT '[]'::jsonb,
    requirements      jsonb       NOT NULL DEFAULT '[]'::jsonb,
    how_to_apply      text,
    closing_date      date,
    status            text        NOT NULL DEFAULT 'draft',
    wording_confirmed boolean     NOT NULL DEFAULT false,
    approved_by       text,
    approved_at       timestamptz,
    source_note       text,
    created_by        text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS employment_type text;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS responsibilities jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS requirements jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS how_to_apply text;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS closing_date date;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS wording_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS source_note text;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE job_adverts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_adverts_status_check'
                   AND conrelid = 'job_adverts'::regclass) THEN
        ALTER TABLE job_adverts ADD CONSTRAINT job_adverts_status_check
            CHECK (status IN ('draft', 'published', 'closed'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS job_adverts_slug_key ON job_adverts (slug);
CREATE INDEX IF NOT EXISTS job_adverts_public_idx ON job_adverts (status, wording_confirmed, closing_date);
