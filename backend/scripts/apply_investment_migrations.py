"""Apply the additive investment compatibility migrations in one transaction.

Defaults to a rollback-only validation. Use --apply after checking the target URL.
The connection string is read from DATABASE_URL_ADMIN_PROD or DATABASE_URL_UNPOOLED.
"""

import argparse
import asyncio
import os
from pathlib import Path

import asyncpg


MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations" / "investment"


def steps() -> list[str]:
    statements = []
    for path in sorted(MIGRATIONS.glob("[0-9][0-9][0-9]_*.sql")):
        statements.extend(part.strip() for part in path.read_text(encoding="utf-8").split("-- migrate:step")[1:] if part.strip())
    return statements


async def run(apply: bool) -> None:
    database_url = os.environ.get("DATABASE_URL_ADMIN_PROD") or os.environ.get("DATABASE_URL_UNPOOLED")
    if not database_url:
        raise SystemExit("Set DATABASE_URL_ADMIN_PROD or DATABASE_URL_UNPOOLED")
    conn = await asyncpg.connect(database_url, statement_cache_size=0, timeout=10)
    try:
        transaction = conn.transaction()
        await transaction.start()
        try:
            for statement in steps():
                await conn.execute(statement)
            if apply:
                await transaction.commit()
                print(f"Applied {len(steps())} investment migration steps")
            else:
                await transaction.rollback()
                print(f"Validated {len(steps())} investment migration steps; rolled back")
        except BaseException:
            await transaction.rollback()
            raise
    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Commit instead of rolling back")
    args = parser.parse_args()
    asyncio.run(run(args.apply))
