"""Resolve stable position codes and legacy labels without depending on numeric IDs."""
from fastapi import HTTPException


async def resolve_position(conn, value):
    rows = await conn.fetch('''SELECT bp.*, to_jsonb(bp)->>'position_code' AS position_code,
        COALESCE((to_jsonb(bp)->>'is_active')::boolean,true) AS is_active
        FROM board_positions bp
        WHERE lower(to_jsonb(bp)->>'position_code')=lower($1)
           OR lower(position_name)=lower($1)
           OR lower(replace(position_name,' ','_'))=lower(replace($1,' ','_'))''', value)
    if len(rows) != 1:
        raise HTTPException(409, 'Select a configured, unambiguous board position. Ask an administrator to review reference setup.')
    row = dict(rows[0])
    if not row['is_active']:
        raise HTTPException(400, 'This board position is archived and cannot receive new appointments.')
    return row


async def validate_position(value):
    from app.libs.database import db_connection
    async with db_connection() as conn:
        row = await resolve_position(conn, value)
        return row.get('position_code') or row['position_name']
