from fastapi import APIRouter, HTTPException, Query
from fastapi import Request
from pydantic import BaseModel
import httpx
import databutton as db
import os
from functools import lru_cache

router = APIRouter(prefix="/geolocation")

# Manual mapping from country code to currency code
# This is a fallback since the free ipstack plan doesn't include currency.
COUNTRY_CURRENCY_MAP = {
    "US": ("USD", "United States Dollar"),
    "GB": ("GBP", "British Pound Sterling"),
    "EU": ("EUR", "Euro"), # Note: 'EU' is often used by ipstack for European Union countries
    "ZA": ("ZAR", "South African Rand"),
    "LS": ("LSL", "Lesotho Loti"),
    "BW": ("BWP", "Botswana Pula"),
    # Add other common mappings as needed
}


class GeolocationResponse(BaseModel):
    ip: str
    country_code: str | None
    country_name: str | None
    currency_code: str | None
    currency_name: str | None

@lru_cache(maxsize=1000)
def get_ipstack_data(ip_address: str):
    """
    Cached function to fetch geolocation data from ipstack.
    Avoids repeated API calls for the same IP.
    """
    api_key = os.environ.get("IPSTACK_API_KEY")
    if not api_key:
        # This will be raised once and cached
        raise HTTPException(status_code=500, detail="IPStack API key is not configured.")

    url = f"http://api.ipstack.com/{ip_address}?access_key={api_key}"
    
    try:
        with httpx.Client() as client:
            response = client.get(url)
            response.raise_for_status()
            data = response.json()
        return data
    except httpx.HTTPStatusError as e:
        # Log the error and raise a generic server error
        print(f"Error calling ipstack API: {e}")
        # Cache the failure for this IP for a short time if desired, but for now, we'll just raise
        raise HTTPException(status_code=502, detail="Failed to retrieve geolocation data.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

@router.get("/lookup", response_model=GeolocationResponse)
async def lookup_ip(
    request: Request,
    ip_address: str = Query("", description="The IP address to look up. Leave empty to auto-detect.")
):
    """
    Provides geolocation information, including currency, for a given IP address.
    If ip_address is empty, auto-detects the client's IP from the request.
    """
    # Auto-detect IP if not provided
    if not ip_address or ip_address.strip() == "":
        # Try to get real IP from X-Forwarded-For header (for proxied requests)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            ip_address = forwarded_for.split(",")[0].strip()
        elif request.client:
            ip_address = request.client.host
        else:
            raise HTTPException(status_code=400, detail="Unable to determine IP address.")
        
        print(f"🌍 Auto-detected IP address: {ip_address}")
    
    # Simple validation for IP address format
    if not (ip_address and len(ip_address.split('.')) == 4):
         # In a real-world scenario, more robust validation would be needed
        raise HTTPException(status_code=400, detail="Invalid IP address format provided.")
        
    try:
        data = get_ipstack_data(ip_address)

        if data.get("success") is False:
            error_info = data.get("error", {})
            error_detail = error_info.get("info", "An error occurred with the geolocation service.")
            # ipstack can return 200 OK with an error in the JSON body
            raise HTTPException(status_code=502, detail=error_detail)

        country_code = data.get("country_code")
        
        # Manual currency lookup
        currency_code, currency_name = None, None
        if country_code and country_code in COUNTRY_CURRENCY_MAP:
            currency_code, currency_name = COUNTRY_CURRENCY_MAP[country_code]
        
        return GeolocationResponse(
            ip=data.get("ip"),
            country_code=country_code,
            country_name=data.get("country_name"),
            currency_code=currency_code,
            currency_name=currency_name,
        )
    except HTTPException as e:
        # Re-raise HTTPExceptions to let FastAPI handle them
        raise e
    except Exception as e:
        # Catch any other unexpected errors during processing
        print(f"Error processing ipstack data: {e}")
        raise HTTPException(status_code=500, detail="Failed to process geolocation data.")
