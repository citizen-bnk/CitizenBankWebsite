-- Source-backed website progress drafts. Deliberately unpublished until an administrator
-- checks current status. The 25 September plans do not establish that lodging or hiring occurred.
-- Run only after the website achievements table exists.
INSERT INTO achievements (title, description, achievement_date, category, display_order, is_published)
SELECT seed.title, seed.description, seed.achievement_date, seed.category, seed.display_order, FALSE
FROM (VALUES
  ('Banking licence submission checklist prepared',
   'Internal submission checklist and evidence inventory dated 25 September 2026. Status: preparation; lodging is not confirmed. Source: https://drive.google.com/file/d/1IMVX6WwBq3eAxow-vj38UIRRck6OhI95/view',
   DATE '2026-09-25', 'licensing', 10),
  ('Licence evidence gaps recorded',
   'Internal gaps register dated 27 September 2026. Items require owner review before lodgement. Historic counts are intentionally omitted because they may have changed. Source: https://drive.google.com/file/d/1aBBfKBDWB60AKPHdiXFCEOGAGADK8CvK/view',
   DATE '2026-09-27', 'licensing', 20),
  ('Operations recruitment plan drafted',
   'Internal recruitment plan dated 25 September 2026 identifies proposed leadership, control and board searches. Vacancy and appointment status need current confirmation. Source: https://drive.google.com/file/d/11jKMocIusyV67exVZcE_7Sq4CZfVSvy7/view',
   DATE '2026-09-25', 'recruitment', 30)
) AS seed(title, description, achievement_date, category, display_order)
WHERE NOT EXISTS (SELECT 1 FROM achievements existing WHERE existing.title = seed.title);
