"""Create the platform schema and backfill people and roles. Dry run unless --apply.

Run in the Render Shell of the `citizenhub` service (same place as grant_super_admin.py):
    python scripts/backfill_platform_person.py            # dry run: shows counts, changes nothing
    python scripts/backfill_platform_person.py --apply    # commit

Safe to run repeatedly. Prints counts only, no personal data. Open review items are in
platform.migration_review.
"""
import argparse
import asyncio
import os
import sys

import asyncpg

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from app.libs.platform_backfill import execute  # noqa: E402


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="commit the changes (default is a dry run)")
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL_ADMIN_PROD") or os.environ.get("DATABASE_URL_PROD")
    if not db_url:
        print("DATABASE_URL_ADMIN_PROD / DATABASE_URL_PROD is not set")
        return 1

    conn = await asyncpg.connect(db_url)
    try:
        try:
            report = await execute(conn, apply=args.apply)
        except RuntimeError as exc:
            print(f"Not ready: {exc}")
            return 1
    finally:
        await conn.close()

    print("\n".join(report.lines()))
    if args.apply and not report.applied:
        print("Reconciliation failed, nothing was committed.")
        return 2
    if not args.apply:
        print("Dry run only. Re-run with --apply to commit.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
