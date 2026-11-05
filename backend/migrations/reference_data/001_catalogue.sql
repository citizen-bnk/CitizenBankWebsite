-- Only additive metadata. Existing labels, hierarchy and obligations are preserved.
ALTER TABLE board_positions ADD COLUMN IF NOT EXISTS position_code text;
ALTER TABLE board_positions ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE board_positions ADD COLUMN IF NOT EXISTS minimum_investment_shares integer NOT NULL DEFAULT 0;
UPDATE board_positions SET position_code = CASE
  WHEN lower(replace(position_name,' ','_')) IN ('chairman','chairperson') THEN 'chairman'
  WHEN lower(replace(position_name,' ','_')) IN ('vice_chairman','vice_chairperson') THEN 'vice_chairman'
  WHEN lower(replace(position_name,' ','_')) IN ('member','board_member') THEN 'member'
  WHEN lower(position_name) IN ('director','secretary','treasurer') THEN lower(position_name)
  ELSE 'position_' || id::text END
WHERE position_code IS NULL;
-- Duplicate canonical roles require operator reconciliation; never merge appointments.
CREATE UNIQUE INDEX IF NOT EXISTS board_position_code_unique ON board_positions(position_code);
ALTER TABLE board_document_requirements ADD COLUMN IF NOT EXISTS seed_code text;
ALTER TABLE board_document_requirements ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE board_document_requirements ADD COLUMN IF NOT EXISTS requires_certification boolean NOT NULL DEFAULT false;
ALTER TABLE board_document_requirements ADD COLUMN IF NOT EXISTS requires_template boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS board_requirement_seed_unique ON board_document_requirements(seed_code);
CREATE TABLE IF NOT EXISTS reference_data_runs (
  id bigserial PRIMARY KEY,
  version text NOT NULL,
  actor text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  changes jsonb NOT NULL
);
