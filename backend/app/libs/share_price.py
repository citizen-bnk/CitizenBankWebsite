"""The price of one share, read from the data (share_classes, then share_config), never from a literal."""
from __future__ import annotations

from decimal import Decimal

import asyncpg

# Used only if neither table can answer. It is the figure the code assumed before prices were read from the data,
# and using it is logged loudly so nobody mistakes it for a configured price.
LAST_RESORT_PRICE = Decimal("10")


async def current_share_price(conn: asyncpg.Connection) -> Decimal:
    """Price per share: the active default share class, else the active share_config row, else LAST_RESORT_PRICE."""
    queries = (
        "SELECT price_per_share FROM share_classes WHERE is_active = true ORDER BY is_default DESC, class_name LIMIT 1",
        "SELECT price_per_share FROM share_config WHERE is_active = true LIMIT 1",
    )
    for sql in queries:
        try:
            value = await conn.fetchval(sql)
        except (asyncpg.UndefinedTableError, asyncpg.UndefinedColumnError):
            continue
        if value is not None and Decimal(str(value)) > 0:
            return Decimal(str(value))
    print(f"[share_price] WARNING: no share price found in share_classes or share_config; using {LAST_RESORT_PRICE}")
    return LAST_RESORT_PRICE


def amount_for(shares: int, price: Decimal) -> int:
    """Whole currency units for `shares` at `price`, rounded to the nearest unit."""
    return int((Decimal(shares) * price).quantize(Decimal("1")))
