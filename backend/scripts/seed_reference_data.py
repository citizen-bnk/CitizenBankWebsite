"""Run on an authorised host with database access. Defaults to rollback-only validation."""
import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
import asyncpg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.libs.reference_data import seed, inventory


async def run(args):
    url = os.environ.get('DATABASE_URL_UNPOOLED') or os.environ.get('DATABASE_URL_ADMIN_PROD')
    if not url:
        raise SystemExit('Configure DATABASE_URL_UNPOOLED on the trusted execution host.')
    if args.apply and args.confirm_environment != os.environ.get('REFERENCE_DATA_ENVIRONMENT'):
        raise SystemExit('Environment confirmation does not match REFERENCE_DATA_ENVIRONMENT.')
    if args.apply and not args.confirm_environment:
        raise SystemExit('An explicit environment confirmation is required.')
    conn = await asyncpg.connect(url, statement_cache_size=0, timeout=10)
    try:
        result = await inventory(conn) if args.inventory else await seed(conn, apply=args.apply, actor=args.actor)
        print(json.dumps(result, indent=2, default=str))
    finally:
        await conn.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory',action='store_true')
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--confirm-environment')
    parser.add_argument('--actor',default='operator')
    args = parser.parse_args()
    if args.inventory and args.apply:
        parser.error('--inventory cannot be combined with --apply')
    asyncio.run(run(args))
