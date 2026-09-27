"""
Centralized database connection utilities.
Provides connection management, context managers, and common database patterns.
"""
import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
import databutton as db
from app.env import Mode, mode
import os


def get_database_url(use_admin: bool = False) -> str:
    """
    Get the database URL based on environment.
    
    Args:
        use_admin: If True, use admin database URL (for migrations/schema changes)
        
    Returns:
        Database connection string
    """
    if mode == Mode.PROD:
        key = "DATABASE_URL_ADMIN_PROD" if use_admin else "DATABASE_URL_PROD"
    else:
        key = "DATABASE_URL_ADMIN_DEV" if use_admin else "DATABASE_URL_DEV"
    
    return os.environ.get(key)


async def get_db_connection(use_admin: bool = False) -> asyncpg.Connection:
    """
    Create a database connection.
    
    Args:
        use_admin: If True, use admin database URL
        
    Returns:
        Asyncpg connection object
        
    Example:
        conn = await get_db_connection()
        try:
            # ... use connection ...
        finally:
            await conn.close()
    """
    db_url = get_database_url(use_admin=use_admin)
    return await asyncpg.connect(db_url)


@asynccontextmanager
async def db_connection(use_admin: bool = False) -> AsyncGenerator[asyncpg.Connection, None]:
    """
    Context manager for database connections.
    Automatically handles connection cleanup.
    
    Args:
        use_admin: If True, use admin database URL
        
    Yields:
        Asyncpg connection object
        
    Example:
        async with db_connection() as conn:
            rows = await conn.fetch("SELECT * FROM users")
    """
    conn = await get_db_connection(use_admin=use_admin)
    try:
        yield conn
    finally:
        await conn.close()


@asynccontextmanager
async def db_transaction(use_admin: bool = False) -> AsyncGenerator[asyncpg.Connection, None]:
    """
    Context manager for database transactions.
    Automatically handles commit/rollback and connection cleanup.
    
    Args:
        use_admin: If True, use admin database URL
        
    Yields:
        Asyncpg connection object within a transaction
        
    Example:
        async with db_transaction() as conn:
            await conn.execute("INSERT INTO users (...) VALUES (...)")
            await conn.execute("UPDATE profiles SET ...")
            # Auto-commits if no exception, auto-rolls back on exception
    """
    conn = await get_db_connection(use_admin=use_admin)
    try:
        async with conn.transaction():
            yield conn
    finally:
        await conn.close()


async def fetch_one_or_none(
    conn: asyncpg.Connection,
    query: str,
    *args
) -> Optional[asyncpg.Record]:
    """
    Fetch one row or return None if not found.
    Convenience wrapper to avoid HTTPException boilerplate.
    
    Args:
        conn: Database connection
        query: SQL query
        *args: Query parameters
        
    Returns:
        Database record or None
        
    Example:
        user = await fetch_one_or_none(conn, "SELECT * FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    """
    return await conn.fetchrow(query, *args)


async def exists(
    conn: asyncpg.Connection,
    query: str,
    *args
) -> bool:
    """
    Check if a record exists.
    
    Args:
        conn: Database connection
        query: SQL query (should return boolean or count)
        *args: Query parameters
        
    Returns:
        True if record exists, False otherwise
        
    Example:
        if await exists(conn, "SELECT 1 FROM users WHERE email = $1", email):
            raise HTTPException(status_code=400, detail="Email already exists")
    """
    result = await conn.fetchval(query, *args)
    return bool(result)
