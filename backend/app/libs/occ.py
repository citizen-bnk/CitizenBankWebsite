"""Optimistic Concurrency Control (OCC) utilities

Provides version-based concurrency control to prevent lost updates
and ensure data consistency in concurrent scenarios.
"""
from typing import Any, Optional
from fastapi import HTTPException
import asyncpg


class ConcurrencyError(HTTPException):
    """Raised when a concurrent modification is detected"""
    def __init__(self, message: str = "The record was modified by another process. Please refresh and try again."):
        super().__init__(status_code=409, detail=message)


async def update_with_version_check(
    conn: asyncpg.Connection,
    table: str,
    id_column: str,
    id_value: Any,
    updates: dict[str, Any],
    expected_version: int,
    returning: str = "*"
) -> Optional[asyncpg.Record]:
    """
    Update a record with optimistic concurrency control.
    
    Args:
        conn: Database connection
        table: Table name
        id_column: Primary key column name
        id_value: Primary key value
        updates: Dictionary of column: value pairs to update
        expected_version: Expected version number (for OCC)
        returning: Columns to return (default: all)
    
    Returns:
        Updated record or None if version mismatch
    
    Raises:
        ConcurrencyError: If version mismatch detected
    """
    # Build SET clause
    set_parts = []
    values = []
    param_count = 1
    
    for column, value in updates.items():
        set_parts.append(f"{column} = ${param_count}")
        values.append(value)
        param_count += 1
    
    # Add version increment
    set_parts.append("version = version + 1")
    set_parts.append("updated_at = NOW()")
    
    # Add WHERE conditions (id and version check)
    values.extend([id_value, expected_version])
    
    query = f"""
        UPDATE {table}
        SET {', '.join(set_parts)}
        WHERE {id_column} = ${param_count} AND version = ${param_count + 1}
        RETURNING {returning}
    """
    
    result = await conn.fetchrow(query, *values)
    
    if result is None:
        # Check if record exists
        exists = await conn.fetchval(
            f"SELECT EXISTS(SELECT 1 FROM {table} WHERE {id_column} = $1)",
            id_value
        )
        
        if not exists:
            raise HTTPException(status_code=404, detail=f"Record not found in {table}")
        
        # Version mismatch - concurrent modification detected
        raise ConcurrencyError(
            "Concurrent modification detected. The record was updated by another process. "
            "Please refresh and try again."
        )
    
    return result


async def get_current_version(
    conn: asyncpg.Connection,
    table: str,
    id_column: str,
    id_value: Any
) -> Optional[int]:
    """
    Get the current version of a record.
    
    Args:
        conn: Database connection
        table: Table name
        id_column: Primary key column name
        id_value: Primary key value
    
    Returns:
        Current version number or None if record doesn't exist
    """
    return await conn.fetchval(
        f"SELECT version FROM {table} WHERE {id_column} = $1",
        id_value
    )
