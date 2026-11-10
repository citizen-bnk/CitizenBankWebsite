-- Source observations for the corporate secretariat. These are not postings to the share ledger.
CREATE TABLE IF NOT EXISTS cap_table_working_records (
    source_id text NOT NULL,
    source_date date NOT NULL,
    source_sheet text NOT NULL,
    source_row integer NOT NULL CHECK (source_row > 0),
    kind text NOT NULL CHECK (kind IN ('member_register','early_subscription','safe_schedule','form_reconciliation')),
    holder text NOT NULL,
    reference text,
    quantity bigint NOT NULL CHECK (quantity >= 0),
    source_status text NOT NULL,
    reconciliation_status text NOT NULL DEFAULT 'pending_reconciliation'
        CHECK (reconciliation_status IN ('pending_reconciliation','excluded','withdrawn')),
    imported_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (source_id,source_sheet,source_row)
);
