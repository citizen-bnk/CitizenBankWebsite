from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import databutton as db
from functools import lru_cache
from datetime import datetime, timedelta
import os

router = APIRouter(prefix="/exchange")

class ExchangeRatesResponse(BaseModel):
    base_code: str
    rates: dict[str, float]
    time_last_update_utc: str
    time_next_update_utc: str

# Cache the results for 1 hour to stay within the free tier limits
@lru_cache(maxsize=1)
def get_exchange_rates_from_api(ttl_hash=None):
    """
    Fetches exchange rates from the API. The ttl_hash parameter is used
    to invalidate the cache based on time.
    """
    del ttl_hash # Unused parameter for cache invalidation logic
    
    api_key = os.environ.get("EXCHANGERATE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ExchangeRate-API key is not configured.")

    # Using LSL (Lesotho Loti) as the base currency
    url = f"https://v6.exchangerate-api.com/v6/{api_key}/latest/LSL"
    
    try:
        with httpx.Client() as client:
            response = client.get(url)
            response.raise_for_status()
            data = response.json()

        if data.get("result") != "success":
            error_type = data.get("error-type", "unknown_error")
            raise HTTPException(status_code=502, detail=f"Exchange rate API error: {error_type}")
        
        return data
    except httpx.HTTPStatusError as e:
        print(f"Error calling ExchangeRate-API: {e}")
        raise HTTPException(status_code=502, detail="Failed to retrieve exchange rates.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")


def get_ttl_hash(seconds=3600):
    """
    Creates a hash based on the current time, divided by the number of seconds
    in the TTL. This ensures the cache is invalidated after the TTL period.
    """
    return round(datetime.utcnow().timestamp() / seconds)


@router.get("/rates", response_model=ExchangeRatesResponse)
async def get_all_rates():
    """
    Provides the latest exchange rates with a 5% markup applied against LSL.
    The base currency is Lesotho Loti (LSL).
    """
    try:
        data = get_exchange_rates_from_api(ttl_hash=get_ttl_hash())
        
        original_rates = data.get("conversion_rates", {})
        
        # Apply a 5% markup to all exchange rates against LSL
        marked_up_rates = {
            currency: rate * 1.05 for currency, rate in original_rates.items()
        }
        
        return ExchangeRatesResponse(
            base_code=data.get("base_code"),
            rates=marked_up_rates,
            time_last_update_utc=data.get("time_last_update_utc"),
            time_next_update_utc=data.get("time_next_update_utc"),
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error processing exchange rates: {e}")
        raise HTTPException(status_code=500, detail="Failed to process exchange rates.")
