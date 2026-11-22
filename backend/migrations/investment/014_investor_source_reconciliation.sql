-- Evidence snapshots complement the working register; they never allot or convert shares.
CREATE TABLE IF NOT EXISTS investor_source_records (
    source_id text NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL CHECK(source_row>1),
    source_date date NOT NULL,
    source_url text NOT NULL,
    person_id uuid REFERENCES platform.person(id),
    record_name text NOT NULL,
    source_data jsonb NOT NULL,
    review_status text NOT NULL DEFAULT 'pending_review'
        CHECK(review_status IN ('matched','pending_review','resolved','excluded')),
    review_note text NOT NULL DEFAULT '',
    imported_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(source_id,source_sheet,source_row)
);
CREATE INDEX IF NOT EXISTS investor_source_person_idx ON investor_source_records(person_id);
