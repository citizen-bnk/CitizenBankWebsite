ALTER TABLE roles ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE data_room_categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE data_room_categories ADD COLUMN IF NOT EXISTS seed_code text;
UPDATE data_room_categories SET seed_code=CASE lower(trim(category_name))
 WHEN 'corporate & governance' THEN 'corporate_governance'
 WHEN 'financial information' THEN 'financial_information'
 WHEN 'investment documents' THEN 'investment_documents'
 WHEN 'regulatory & licensing' THEN 'regulatory_licensing'
 WHEN 'policies' THEN 'policies' END
WHERE seed_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS data_room_category_seed_unique ON data_room_categories(seed_code);
