-- Agreement texts with versions: generalises ncnda_templates. Safe to run more than once.
-- RENDERED from backend/app/libs/policy_seed.py (terms and letter of intent); the NCNDA rows are copied from ncnda_templates.
-- ncnda_templates is left untouched and keeps working.
CREATE TABLE IF NOT EXISTS agreement_texts (
    agreement_type text    NOT NULL,
    version        text    NOT NULL,
    effective_date date    NOT NULL DEFAULT CURRENT_DATE,
    title          text    NOT NULL,
    content        text    NOT NULL,
    required       boolean NOT NULL DEFAULT true,
    display_order  integer NOT NULL DEFAULT 0,
    active         boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (agreement_type, version)
);

INSERT INTO agreement_texts (agreement_type, version, effective_date, title, content, required, display_order, active) VALUES
  ('terms', '1.0', CURRENT_DATE, 'Data room terms and conditions', 'I accept the terms and conditions for using the data room: the documents are confidential, are for my own evaluation of an investment, and every time I open one is recorded.', true, 2, true),
  ('letter_of_intent', '1.0', CURRENT_DATE, 'Letter of intent (LOI)', 'I confirm my intention to invest and give the details below so the office can review them.', true, 3, true)
ON CONFLICT (agreement_type, version) DO NOTHING;

-- NCNDA: copy every template version that exists today, if the table is there.
DO $$
BEGIN
    IF to_regclass('public.ncnda_templates') IS NOT NULL THEN
        INSERT INTO agreement_texts (agreement_type, version, effective_date, title, content, required, display_order, active)
        SELECT 'ncnda', t.version::text, t.effective_date::date,
               'Non-circumvention and non-disclosure agreement (NCNDA)', t.content, true, 1, COALESCE(t.is_active, true)
        FROM ncnda_templates t
        ON CONFLICT (agreement_type, version) DO NOTHING;
    END IF;
END $$;

-- Each signature records which text version was read.
ALTER TABLE IF EXISTS investor_agreements ADD COLUMN IF NOT EXISTS text_version text;
