


"""Exchange Rate Service - Database-cached rates with intelligent fallback chain."""

from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple
import asyncpg
import httpx
import databutton as db
from app.env import Mode, mode
import os

# Hardcoded fallback rates (LSL to target currency)
# These are used as the absolute last resort if all APIs fail
HARDCODED_RATES = {
    "LSL": 1.0,
    "ZAR": 1.0,      # LSL and ZAR are at parity
    "USD": 0.0556,
    "EUR": 0.0500,
    "GBP": 0.0435,
}

# Configuration
MAX_CACHE_AGE_DAYS = 30  # Cache is considered stale after 30 days
REFRESH_THRESHOLD_DAYS = 15  # Trigger background refresh if older than 15 days
API_TIMEOUT = 10  # Timeout for external API calls in seconds


async def get_db_connection():
    """Get database connection based on environment."""
    if mode == Mode.PROD:
        database_url = os.environ.get("DATABASE_URL_PROD")
    else:
        database_url = os.environ.get("DATABASE_URL_DEV")
    return await asyncpg.connect(database_url)


async def get_cached_rates() -> Optional[Dict[str, float]]:
    """Fetch all active rates from database cache."""
    conn = await get_db_connection()
    try:
        query = """
            SELECT currency_code, rate_to_lsl, fetched_at
            FROM exchange_rates_cache
            WHERE is_active = true
            ORDER BY currency_code
        """
        rows = await conn.fetch(query)
        
        if not rows:
            return None
        
        # Convert to dict
        rates = {}
        for row in rows:
            rates[row["currency_code"]] = float(row["rate_to_lsl"])
        
        return rates
    finally:
        await conn.close()


async def get_cache_age() -> Optional[int]:
    """Get the age of the cache in days. Returns None if cache is empty."""
    conn = await get_db_connection()
    try:
        query = """
            SELECT MIN(fetched_at) as oldest_fetch
            FROM exchange_rates_cache
            WHERE is_active = true
        """
        row = await conn.fetchrow(query)
        
        if not row or not row["oldest_fetch"]:
            return None
        
        oldest_fetch = row["oldest_fetch"]
        # PostgreSQL returns naive datetime, compare with naive datetime
        age = datetime.now() - oldest_fetch
        return age.days
    finally:
        await conn.close()


async def is_cache_stale(max_age_days: int = MAX_CACHE_AGE_DAYS) -> bool:
    """Check if cache refresh is needed based on age."""
    age = await get_cache_age()
    if age is None:
        return True  # No cache = stale
    return age > max_age_days


async def fetch_from_exchangerate_api() -> Optional[Dict[str, float]]:
    """Fetch rates from ExchangeRate-API (primary source)."""
    api_key = os.environ.get("EXCHANGERATE_API_KEY")
    if not api_key:
        print("[ExchangeRate Service] EXCHANGERATE_API_KEY not configured")
        return None
    
    url = f"https://v6.exchangerate-api.com/v6/{api_key}/latest/LSL"
    
    try:
        async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            if data.get("result") != "success":
                print(f"[ExchangeRate Service] API error: {data.get('error-type')}")
                return None
            
            # Return conversion rates
            return data.get("conversion_rates", {})
    except httpx.TimeoutException:
        print(f"[ExchangeRate Service] ExchangeRate-API timeout after {API_TIMEOUT}s")
        return None
    except Exception as e:
        print(f"[ExchangeRate Service] ExchangeRate-API failed: {str(e)}")
        return None


async def fetch_from_fixer_io() -> Optional[Dict[str, float]]:
    """Fetch rates from Fixer.io (fallback source)."""
    # Note: Fixer.io free tier doesn't support base currency change
    # This is a placeholder for future implementation
    # For now, we skip this and go straight to hardcoded rates
    print("[ExchangeRate Service] Fixer.io fallback not yet implemented")
    return None


async def refresh_rates_from_external() -> Tuple[bool, str, Optional[Dict[str, float]]]:
    """Try to fetch rates from external APIs with fallback chain.
    
    Returns:
        Tuple of (success, source, rates_dict)
    """
    # Try primary API
    print("[ExchangeRate Service] Attempting to fetch from ExchangeRate-API...")
    rates = await fetch_from_exchangerate_api()
    if rates:
        print(f"[ExchangeRate Service] ✓ Fetched {len(rates)} rates from ExchangeRate-API")
        return True, "exchangerate-api", rates
    
    # Try fallback API
    print("[ExchangeRate Service] Primary API failed, trying Fixer.io...")
    rates = await fetch_from_fixer_io()
    if rates:
        print(f"[ExchangeRate Service] ✓ Fetched {len(rates)} rates from Fixer.io")
        return True, "fixer-io", rates
    
    # All APIs failed
    print("[ExchangeRate Service] ✗ All external APIs failed")
    return False, "none", None


async def update_cache(rates_dict: Dict[str, float], source: str) -> int:
    """Upsert rates into database cache.
    
    Returns:
        Number of currencies updated
    """
    conn = await get_db_connection()
    try:
        updated_count = 0
        # Use naive datetime for PostgreSQL compatibility
        current_time = datetime.now()
        
        for currency_code, rate in rates_dict.items():
            # Skip LSL (base currency)
            if currency_code == "LSL":
                continue
            
            query = """
                INSERT INTO exchange_rates_cache 
                (currency_code, rate_to_lsl, source, fetched_at, is_active)
                VALUES ($1, $2, $3, $4, true)
                ON CONFLICT (currency_code)
                DO UPDATE SET
                    rate_to_lsl = $2,
                    source = $3,
                    fetched_at = $4,
                    is_active = true
            """
            await conn.execute(query, currency_code, rate, source, current_time)
            updated_count += 1
        
        print(f"[ExchangeRate Service] Updated {updated_count} currencies in cache")
        return updated_count
    finally:
        await conn.close()


async def get_rates_with_fallback() -> Tuple[Dict[str, float], str, int]:
    """Main function to get exchange rates with full fallback chain.
    
    Fallback chain:
    1. DB Cache (< 30 days old) → Return immediately ✅
    2. DB Cache stale? → Trigger background refresh, return stale data
    3. DB empty? → Fetch from ExchangeRate-API
    4. API #1 fails? → Try Fixer.io
    5. All APIs fail? → Return hardcoded rates
    
    Returns:
        Tuple of (rates_dict, source, age_days)
    """
    # Step 1: Try to get cached rates
    cached_rates = await get_cached_rates()
    cache_age = await get_cache_age()
    
    if cached_rates and cache_age is not None:
        # We have cached rates
        if cache_age <= MAX_CACHE_AGE_DAYS:
            # Cache is fresh, return immediately
            print(f"[ExchangeRate Service] ✓ Returning fresh cached rates (age: {cache_age} days)")
            return cached_rates, "database_cache", cache_age
        else:
            # Cache is stale but usable
            print(f"[ExchangeRate Service] Cache is stale ({cache_age} days old), will return stale data")
    
    # Step 2 & 3: Cache is stale or empty, try to refresh from external APIs
    success, source, new_rates = await refresh_rates_from_external()
    
    if success and new_rates:
        # Successfully fetched from API, update cache
        await update_cache(new_rates, source)
        # Always include LSL
        new_rates["LSL"] = 1.0
        return new_rates, source, 0
    
    # Step 4: APIs failed, return stale cache if available
    if cached_rates:
        print(f"[ExchangeRate Service] ⚠ APIs failed, returning stale cache ({cache_age} days old)")
        return cached_rates, f"database_cache_stale_{cache_age}d", cache_age
    
    # Step 5: Everything failed, return hardcoded rates
    print("[ExchangeRate Service] ⚠ All sources failed, returning hardcoded fallback rates")
    return HARDCODED_RATES.copy(), "hardcoded_fallback", 999


async def trigger_background_refresh_if_needed() -> bool:
    """Check if refresh is needed and trigger it if cache is old.
    
    Returns:
        True if refresh was triggered and successful, False otherwise
    """
    cache_age = await get_cache_age()
    
    # If cache is older than refresh threshold, trigger refresh
    if cache_age is None or cache_age >= REFRESH_THRESHOLD_DAYS:
        print(f"[ExchangeRate Service] Cache age ({cache_age} days) exceeds threshold ({REFRESH_THRESHOLD_DAYS} days), triggering refresh...")
        success, source, new_rates = await refresh_rates_from_external()
        
        if success and new_rates:
            await update_cache(new_rates, source)
            return True
        else:
            print("[ExchangeRate Service] Background refresh failed")
            return False
    
    return False
