ALTER TABLE share_subscriptions ADD COLUMN IF NOT EXISTS investor_person_id uuid REFERENCES platform.person(id);
ALTER TABLE share_subscriptions ADD COLUMN IF NOT EXISTS instrument_type text NOT NULL DEFAULT 'ordinary';
ALTER TABLE share_subscriptions ADD COLUMN IF NOT EXISTS source_reference text;
ALTER TABLE share_subscriptions ADD COLUMN IF NOT EXISTS source_evidence jsonb;
CREATE INDEX IF NOT EXISTS subscription_investor_person_idx ON share_subscriptions(investor_person_id);

-- Historical SAFEs may specify cash commitments without fixing conversion units.
ALTER TABLE share_subscriptions ALTER COLUMN num_shares DROP NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='ordinary_subscription_quantity_required') THEN
  ALTER TABLE share_subscriptions ADD CONSTRAINT ordinary_subscription_quantity_required
   CHECK(instrument_type<>'ordinary' OR num_shares IS NOT NULL);
 END IF;
END $$;
