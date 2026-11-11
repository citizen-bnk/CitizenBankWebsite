-- Add review metadata without rewriting workbook observations or issued holdings.
ALTER TABLE cap_table_working_records ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE cap_table_working_records ADD COLUMN IF NOT EXISTS units_under_review bigint
    CHECK (units_under_review > 0 AND units_under_review <= quantity);

UPDATE cap_table_working_records
SET review_note = 'Conversion evidence has not been verified. Keep this SAFE in reconciliation.'
WHERE source_id = '1_BvpB-vnZpfnvnBNoJW0LPtaf67XKGP7'
  AND kind = 'safe_schedule' AND reconciliation_status = 'pending_reconciliation'
  AND review_note IS NULL;

UPDATE cap_table_working_records
SET review_note = 'CB36-01 remains pending conversion. Exclude these 200 reference units from issued holdings.',
    units_under_review = 200
WHERE source_id = '1_BvpB-vnZpfnvnBNoJW0LPtaf67XKGP7'
  AND kind IN ('safe_schedule', 'form_reconciliation') AND reference = 'CB36-01'
  AND quantity = 200 AND reconciliation_status = 'pending_reconciliation';

UPDATE cap_table_working_records
SET review_note = 'Keep 500 shares in the working register. Reconcile the remaining 500 units against conversion evidence.',
    units_under_review = 500
WHERE source_id = '1_BvpB-vnZpfnvnBNoJW0LPtaf67XKGP7'
  AND kind IN ('safe_schedule', 'form_reconciliation') AND reference = 'CB22'
  AND holder = 'Rongo, Bongiwe Nontatu' AND quantity = 1000
  AND reconciliation_status = 'pending_reconciliation';

UPDATE cap_table_working_records
SET review_note = 'Retain these 500 shares in the working register. See CB22 for the separate 500 units under review.'
WHERE source_id = '1_BvpB-vnZpfnvnBNoJW0LPtaf67XKGP7'
  AND kind = 'member_register' AND holder = 'Rongo, Bongiwe Nontatu' AND quantity = 500
  AND reconciliation_status = 'pending_reconciliation';
