"""Exchange Rates API - Fetch and manage currency exchange rates."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime, timedelta
import requests
from app import runtime
from app.auth import AuthorizedUser
import asyncpg
from app.libs import exchange_rate_service
import os

router = APIRouter(prefix="/exchange-rates")

# Models
class ExchangeRate(BaseModel):
    """Exchange rate for a specific currency pair."""
    base_currency: str
    target_currency: str
    rate: float
    date: date
    source: Optional[str] = None

class ExchangeRatesResponse(BaseModel):
    """Current exchange rates for all tracked currencies."""
    base_currency: str
    rates: dict[str, float]
    date: str
    last_updated: str
    source: str
    age_days: int

class FetchStatusResponse(BaseModel):
    """Status of exchange rate fetching."""
    last_fetch_date: Optional[date]
    last_fetch_status: Optional[str]
    currencies_count: int
    rates_age_hours: Optional[int]
    is_outdated: bool

class ConversionRequest(BaseModel):
    """Request to convert an amount between currencies."""
    amount: float
    from_currency: str
    to_currency: str
    date: Optional[date] = None

class ConversionResponse(BaseModel):
    """Result of currency conversion."""
    amount: float
    from_currency: str
    to_currency: str
    converted_amount: float
    exchange_rate: float
    rate_date: date

class FetchResponse(BaseModel):
    """Response from manual fetch operation."""
    success: bool
    message: str
    currencies_updated: int
    source: str

# Database helper functions
async def get_db_connection():
    """Get database connection."""
    database_url = os.environ.get("DATABASE_URL_DEV")
    return await asyncpg.connect(database_url)

async def get_latest_rate(from_currency: str, to_currency: str, conn) -> Optional[tuple]:
    """Get the latest exchange rate from database."""
    query = """
        SELECT rate, date 
        FROM exchange_rates 
        WHERE base_currency = $1 AND target_currency = $2 
        ORDER BY date DESC 
        LIMIT 1
    """
    return await conn.fetchrow(query, from_currency, to_currency)

async def get_rate_for_date(from_currency: str, to_currency: str, target_date: date, conn) -> Optional[tuple]:
    """Get exchange rate for a specific date or closest previous date."""
    query = """
        SELECT rate, date 
        FROM exchange_rates 
        WHERE base_currency = $1 
          AND target_currency = $2 
          AND date <= $3 
        ORDER BY date DESC 
        LIMIT 1
    """
    return await conn.fetchrow(query, from_currency, to_currency, target_date)

async def store_exchange_rates(rates: dict, fetch_date: date, source: str, conn):
    """Store fetched exchange rates in database."""
    base_currency = "LSL"
    
    for currency, rate in rates.items():
        # Skip if same currency
        if currency == base_currency:
            continue
            
        query = """
            INSERT INTO exchange_rates (base_currency, target_currency, rate, date, source)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (base_currency, target_currency, date) 
            DO UPDATE SET rate = $3, source = $5
        """
        await conn.execute(query, base_currency, currency, rate, fetch_date, source)

async def log_fetch_attempt(fetch_date: date, status: str, currencies: List[str], error_msg: Optional[str], conn):
    """Log exchange rate fetch attempt."""
    query = """
        INSERT INTO exchange_rate_fetch_log (fetch_date, status, currencies_updated, error_message)
        VALUES ($1, $2, $3, $4)
    """
    await conn.execute(query, fetch_date, status, currencies, error_msg)

async def fetch_from_api() -> dict:
    """Fetch latest exchange rates from ExchangeRate-API."""
    api_key = os.environ.get("EXCHANGERATE_API_KEY")
    if not api_key:
        raise ValueError("EXCHANGERATE_API_KEY not configured")
    
    url = f"https://v6.exchangerate-api.com/v6/{api_key}/latest/LSL"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get("result") != "success":
            raise ValueError(f"API returned error: {data.get('error-type')}")
        
        return {
            "rates": data["conversion_rates"],
            "date": datetime.fromtimestamp(data["time_last_update_unix"]).date(),
            "source": "ExchangeRate-API"
        }
    except requests.RequestException as e:
        raise ValueError(f"Failed to fetch exchange rates: {str(e)}")

# API Endpoints

@router.get("/current", response_model=ExchangeRatesResponse)
async def get_current_rates():
    """
    Get current exchange rates for all tracked currencies.
    Returns cached rates from database with intelligent fallback.
    No external API calls - uses database cache with automatic refresh.
    """
    try:
        # Get rates from service with full fallback chain
        rates, source, age_days = await exchange_rate_service.get_rates_with_fallback()
        
        # Ensure LSL is included
        if "LSL" not in rates:
            rates["LSL"] = 1.0
        
        return ExchangeRatesResponse(
            base_currency="LSL",
            rates=rates,
            date=datetime.now().strftime("%Y-%m-%d"),
            last_updated=datetime.now().isoformat(),
            source=source,
            age_days=age_days
        )
    except Exception as e:
        # Even if everything fails, return hardcoded rates
        print(f"[Exchange Rates API] Error in get_current_rates: {str(e)}")
        return ExchangeRatesResponse(
            base_currency="LSL",
            rates={"LSL": 1.0, "ZAR": 1.0, "USD": 0.0556, "EUR": 0.0500, "GBP": 0.0435},
            date=datetime.now().strftime("%Y-%m-%d"),
            last_updated=datetime.now().isoformat(),
            source="emergency_fallback",
            age_days=999
        )

@router.get("/status", response_model=FetchStatusResponse)
async def get_fetch_status():
    """
    Get status of exchange rate fetching.
    Shows when rates were last updated and if they're outdated.
    """
    conn = await get_db_connection()
    try:
        # Get latest fetch log
        log_query = """
            SELECT fetch_date, status, currencies_updated 
            FROM exchange_rate_fetch_log 
            ORDER BY created_at DESC 
            LIMIT 1
        """
        log_row = await conn.fetchrow(log_query)
        
        # Count total currencies we have rates for
        count_query = """
            SELECT COUNT(DISTINCT target_currency) as count 
            FROM exchange_rates
        """
        count_row = await conn.fetchrow(count_query)
        
        if log_row:
            fetch_date = log_row["fetch_date"]
            age_hours = int((date.today() - fetch_date).total_seconds() / 3600)
            is_outdated = age_hours > 24
            
            return FetchStatusResponse(
                last_fetch_date=fetch_date,
                last_fetch_status=log_row["status"],
                currencies_count=count_row["count"] if count_row else 0,
                rates_age_hours=age_hours,
                is_outdated=is_outdated
            )
        else:
            return FetchStatusResponse(
                last_fetch_date=None,
                last_fetch_status=None,
                currencies_count=count_row["count"] if count_row else 0,
                rates_age_hours=None,
                is_outdated=True
            )
    finally:
        await conn.close()

@router.post("/fetch", response_model=FetchResponse)
async def fetch_exchange_rates(user: AuthorizedUser):
    """
    Manually trigger exchange rate fetch from API.
    Requires authentication (admin only in production).
    """
    conn = await get_db_connection()
    try:
        # Fetch from API
        try:
            api_data = await fetch_from_api()
            rates = api_data["rates"]
            fetch_date = api_data["date"]
            source = api_data["source"]
            
            # Store rates in database
            await store_exchange_rates(rates, fetch_date, source, conn)
            
            # Track which currencies we updated
            currencies_updated = list(rates.keys())
            
            # Log success
            await log_fetch_attempt(fetch_date, "success", currencies_updated, None, conn)
            
            return FetchResponse(
                success=True,
                message=f"Successfully fetched and stored {len(currencies_updated)} exchange rates",
                currencies_updated=len(currencies_updated),
                source=source
            )
        except Exception as e:
            # Log failure
            error_msg = str(e)
            await log_fetch_attempt(date.today(), "failed", [], error_msg, conn)
            
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch exchange rates: {error_msg}"
            )
    finally:
        await conn.close()

@router.post("/refresh", response_model=FetchResponse)
async def refresh_exchange_rates(user: AuthorizedUser):
    """
    Manually trigger exchange rate refresh from external APIs.
    Updates the database cache with latest rates.
    Requires authentication.
    """
    try:
        # Force refresh from external APIs
        success, source, new_rates = await exchange_rate_service.refresh_rates_from_external()
        
        if success and new_rates:
            # Update cache
            updated_count = await exchange_rate_service.update_cache(new_rates, source)
            
            return FetchResponse(
                success=True,
                message=f"Successfully refreshed exchange rates from {source}",
                currencies_updated=updated_count,
                source=source
            )
        else:
            return FetchResponse(
                success=False,
                message="Failed to fetch rates from external APIs",
                currencies_updated=0,
                source="none"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh exchange rates: {str(e)}"
        )

@router.post("/convert", response_model=ConversionResponse)
async def convert_currency(request: ConversionRequest):
    """
    Convert an amount from one currency to another.
    Uses latest rate if no date specified.
    """
    conn = await get_db_connection()
    try:
        # If same currency, no conversion needed
        if request.from_currency == request.to_currency:
            return ConversionResponse(
                amount=request.amount,
                from_currency=request.from_currency,
                to_currency=request.to_currency,
                converted_amount=request.amount,
                exchange_rate=1.0,
                rate_date=request.date or date.today()
            )
        
        # Get exchange rate
        if request.date:
            rate_row = await get_rate_for_date(request.from_currency, request.to_currency, request.date, conn)
        else:
            rate_row = await get_latest_rate(request.from_currency, request.to_currency, conn)
        
        if not rate_row:
            raise HTTPException(
                status_code=404,
                detail=f"No exchange rate found for {request.from_currency} to {request.to_currency}"
            )
        
        rate = float(rate_row["rate"])
        rate_date = rate_row["date"]
        converted_amount = request.amount * rate
        
        return ConversionResponse(
            amount=request.amount,
            from_currency=request.from_currency,
            to_currency=request.to_currency,
            converted_amount=round(converted_amount, 2),
            exchange_rate=rate,
            rate_date=rate_date
        )
    finally:
        await conn.close()

@router.get("/history")
async def get_rate_history(
    from_currency: str = "LSL",
    to_currency: str = "USD",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 30
):
    """
    Get historical exchange rates for a currency pair.
    Useful for charts and analysis.
    """
    conn = await get_db_connection()
    try:
        query = """
            SELECT rate, date, source
            FROM exchange_rates
            WHERE base_currency = $1 AND target_currency = $2
        """
        params = [from_currency, to_currency]
        
        if start_date:
            query += " AND date >= $3"
            params.append(start_date)
        
        if end_date:
            query += f" AND date <= ${len(params) + 1}"
            params.append(end_date)
        
        query += f" ORDER BY date DESC LIMIT ${len(params) + 1}"
        params.append(limit)
        
        rows = await conn.fetch(query, *params)
        
        return {
            "from_currency": from_currency,
            "to_currency": to_currency,
            "history": [
                {
                    "rate": float(row["rate"]),
                    "date": row["date"],
                    "source": row["source"]
                }
                for row in rows
            ]
        }
    finally:
        await conn.close()
