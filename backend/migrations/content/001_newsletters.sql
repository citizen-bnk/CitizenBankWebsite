-- Newsletters library (contracts.md section 2). Safe to run more than once; the production schema is not in the
-- repository, so every column is also added with a guarded ALTER in case an older table exists.
CREATE TABLE IF NOT EXISTS newsletters (
    id           bigserial PRIMARY KEY,
    slug         text        NOT NULL,
    issue_no     integer,
    series       text,
    title        text        NOT NULL,
    published_on date,
    period_label text,
    summary      text,
    sections     jsonb       NOT NULL DEFAULT '[]'::jsonb,
    visibility   text        NOT NULL DEFAULT 'internal',
    status       text        NOT NULL DEFAULT 'draft',
    file_key     text,
    file_bytes   bigint,
    file_name    text,
    external_url text,
    sort_order   integer     NOT NULL DEFAULT 0,
    created_by   text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS issue_no integer;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS series text;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS published_on date;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS period_label text;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal';
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS file_key text;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS file_bytes bigint;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS external_url text;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'newsletters_visibility_check'
                   AND conrelid = 'newsletters'::regclass) THEN
        ALTER TABLE newsletters ADD CONSTRAINT newsletters_visibility_check
            CHECK (visibility IN ('public', 'members', 'internal'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'newsletters_status_check'
                   AND conrelid = 'newsletters'::regclass) THEN
        ALTER TABLE newsletters ADD CONSTRAINT newsletters_status_check CHECK (status IN ('draft', 'published'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS newsletters_slug_key ON newsletters (slug);
CREATE INDEX IF NOT EXISTS newsletters_listing_idx ON newsletters (status, visibility, published_on DESC);
