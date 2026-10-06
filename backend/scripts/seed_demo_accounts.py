"""Seed the seven demo accounts. Demo environment only. Dry run unless --apply.

1. In the demo Stack Auth project create seven users (dashboard, Users, Create user) with these emails and one
   shared demo password:   customer@demo.citizenbank.test, investor@..., shareholder@..., board@..., staff@...,
   admin@..., combined@...   (run with --list to print them).
2. Copy each user's User ID into a JSON file, for example demo_ids.json:
       {"customer": "<id>", "investor": "<id>", "shareholder": "<id>", "board": "<id>",
        "staff": "<id>", "admin": "<id>", "combined": "<id>"}
3. In the Render Shell of the DEMO service (DEMO_MODE=true):
       python scripts/seed_demo_accounts.py --ids demo_ids.json            # dry run, shows counts
       python scripts/seed_demo_accounts.py --ids demo_ids.json --apply    # commit
   Add --create-missing-roles if the roles table lacks 'shareholder' or other roles, and --reset-demo-data to put the
   sample subscriptions back to their starting state. Safe to re-run: existing demo progress is kept otherwise.
"""
import argparse
import asyncio
import json
import os
import sys

import asyncpg

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from app.libs import demo_seed  # noqa: E402


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--list", action="store_true", help="print the demo accounts and exit")
    parser.add_argument("--ids", help="JSON file mapping each account key to its Stack Auth user id")
    parser.add_argument("--apply", action="store_true", help="commit (default is a dry run)")
    parser.add_argument("--create-missing-roles", action="store_true")
    parser.add_argument("--reset-demo-data", action="store_true")
    args = parser.parse_args()

    if args.list:
        for a in demo_seed.ACCOUNTS:
            print(f"{a.key:12} {a.email:38} roles: {', '.join(a.roles):42} {a.description}")
        return 0
    if not args.ids:
        parser.error("--ids is required (or use --list)")
    try:
        ids = json.load(open(args.ids))
    except (OSError, ValueError) as exc:
        print(f"Cannot read {args.ids}: {exc}")
        return 1
    db_url = os.environ.get("DATABASE_URL_ADMIN_PROD") or os.environ.get("DATABASE_URL_PROD")
    if not db_url:
        print("DATABASE_URL_ADMIN_PROD / DATABASE_URL_PROD is not set")
        return 1

    conn = await asyncpg.connect(db_url)
    try:
        try:
            report = await demo_seed.execute(conn, ids, apply=args.apply, create_missing_roles=args.create_missing_roles,
                                             reset=args.reset_demo_data)
        except demo_seed.SeedError as exc:
            print(f"Refused: {exc}")
            return 1
    finally:
        await conn.close()
    print("\n".join(report.lines()))
    if not args.apply:
        print("Dry run only. Re-run with --apply to commit.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
