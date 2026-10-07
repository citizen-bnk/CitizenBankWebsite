-- Payment plans offered to investors and board members. Safe to run more than once.
-- RENDERED from backend/app/libs/policy_seed.py. The codes are the values already stored in
-- share_subscriptions.installment_plan, so existing rows keep meaning what they meant.
CREATE TABLE IF NOT EXISTS payment_plans (
    code          text PRIMARY KEY,
    label         text    NOT NULL,
    months        integer NOT NULL CHECK (months >= 1),
    active        boolean NOT NULL DEFAULT true,
    audience      text    NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'investor', 'board')),
    display_order integer NOT NULL DEFAULT 0
);

INSERT INTO payment_plans (code, label, months, active, audience, display_order) VALUES
  ('one-time', 'Pay in full', 1, true, 'all', 1),
  ('3-months', '3 monthly instalments', 3, true, 'all', 2),
  ('6-months', '6 monthly instalments', 6, true, 'all', 3),
  ('12-months', '12 monthly instalments', 12, true, 'all', 4)
ON CONFLICT (code) DO NOTHING;
