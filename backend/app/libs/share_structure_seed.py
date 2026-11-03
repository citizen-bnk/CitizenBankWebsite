"""One-time, guarded seed for the authorised Citizen share structure.

This records class allocations, not founder holdings or issued certificates.
It refuses to overwrite an existing offer or investor subscription.
"""

from app.libs.database import db_transaction


async def seed_share_structure() -> dict:
    async with db_transaction(use_admin=True) as conn:
        await conn.execute("SELECT pg_advisory_xact_lock(700100003)")
        classes = await conn.fetch("SELECT class_name, shares_on_offer, price_per_share FROM share_classes")
        config = await conn.fetch("SELECT id FROM share_config")
        if classes or config:
            expected = {"Class A": 80_000_000, "Class B": 10_000_000, "Class C": 10_000_000}
            actual = {row["class_name"]: row["shares_on_offer"] for row in classes}
            if actual == expected and len(config) == 1 and next(
                row["price_per_share"] for row in classes if row["class_name"] == "Class B"
            ) == 10:
                return {"status": "already_seeded", "total_authorized": 100_000_000}
            raise RuntimeError("SHARE_STRUCTURE_RECONCILIATION_REQUIRED")
        subscriptions = await conn.fetchval("SELECT count(*) FROM share_subscriptions")
        if subscriptions:
            raise RuntimeError("EXISTING_SUBSCRIPTIONS_RECONCILIATION_REQUIRED")
        # Reserved classes have no approved sale price. Keep that fact explicit.
        await conn.execute("ALTER TABLE share_classes ALTER COLUMN price_per_share DROP NOT NULL")
        await conn.execute("""CREATE TABLE IF NOT EXISTS share_promotions (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            title text NOT NULL, price_per_share numeric(18,2) NOT NULL CHECK (price_per_share > 0),
            audience text NOT NULL CHECK (audience IN ('invited_and_shareholders','existing_shareholders')),
            starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz NOT NULL,
            status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
            created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
            closed_by text, closed_at timestamptz,
            CHECK (ends_at > starts_at)
        )""")
        await conn.execute("ALTER TABLE share_subscriptions ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES share_promotions(id)")
        await conn.execute("ALTER TABLE share_subscriptions ADD COLUMN IF NOT EXISTS price_per_share numeric(18,2)")
        await conn.executemany(
            """INSERT INTO share_classes
               (class_name, display_name, description, price_per_share, currency,
                min_shares, max_shares, shares_on_offer, shares_issued,
                available_shares, is_default, is_active)
               VALUES ($1,$2,$3,$4,'ZAR',$5,$6,$7,0,$8,$9,$10)""",
            [
                ("Class A", "Founder shares", "Founder allocation. Individual holdings require cap-table verification.",
                 None, 1, 1_000_000, 80_000_000, 0, False, False),
                ("Class B", "Investor ordinary shares", "Invitation-only investor offer at R10 per share.",
                 10, 1, 1_000_000, 10_000_000, 10_000_000, True, True),
                ("Class C", "Reserved internal shares", "Reserved for employees, board members and eligible existing shareholders; not in the investor offer.",
                 None, 1, 1_000_000, 10_000_000, 0, False, False),
            ],
        )
        await conn.execute(
            """INSERT INTO share_config
               (price_per_share,min_subscription,max_subscription,total_authorized,
                total_issued,offered_for_public,available_shares,is_active,updated_by)
               VALUES (10,1,1000000,100000000,0,10000000,10000000,true,'approved_share_structure_2026_11_03')"""
        )
        return {"status": "seeded", "total_authorized": 100_000_000}
