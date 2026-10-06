"""Analytics events: one row per event in app_events (see migrations/platform/002_app_events.sql)."""
import json

import asyncpg


async def record_event(conn: asyncpg.Connection, event_type: str, data: dict) -> None:
    await conn.execute(
        "INSERT INTO app_events (type, data) VALUES ($1, $2::jsonb)",
        event_type,
        json.dumps(data, default=str),
    )
