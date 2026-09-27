"""
Auth tracking API for monitoring user logins and activity.
"""
from fastapi import APIRouter, Request
from app.auth import AuthorizedUser
from app.env import Mode, mode
import asyncpg
import databutton as db
import os
from datetime import datetime
import httpx

router = APIRouter()

async def get_db_connection():
    """Get database connection"""
    if mode == Mode.PROD:
        db_url = os.environ.get("DATABASE_URL_PROD")
    else:
        db_url = os.environ.get("DATABASE_URL_DEV")
    return await asyncpg.connect(db_url)

@router.post("/auth/track-login")
async def track_login(user: AuthorizedUser, request: Request):
    """
    Track user login and update last login timestamp.
    Also logs detailed login history with IP address and location.
    Should be called automatically when user successfully logs in.
    """
    conn = await get_db_connection()
    try:
        # Extract IP address and user agent from request
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Try to get location from IP (optional - won't fail if service is unavailable)
        location_country = None
        location_city = None
        
        if ip_address and ip_address not in ['127.0.0.1', 'localhost', '::1']:
            try:
                # Use ipstack or similar service if API key is available
                ipstack_key = os.environ.get("IPSTACK_API_KEY")
                if ipstack_key:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            f"http://api.ipstack.com/{ip_address}?access_key={ipstack_key}",
                            timeout=2.0
                        )
                        if response.status_code == 200:
                            data = response.json()
                            location_country = data.get('country_name')
                            location_city = data.get('city')
            except Exception as e:
                print(f"⚠️ Failed to fetch location for IP {ip_address}: {e}")
        
        # Update last login timestamp
        await conn.execute("""
            UPDATE user_profiles
            SET 
                last_login_at = $1,
                login_count = COALESCE(login_count, 0) + 1
            WHERE user_id = $2
        """, datetime.utcnow(), user.sub)
        
        # Log detailed login history
        await conn.execute("""
            INSERT INTO user_login_history 
            (user_id, login_timestamp, ip_address, user_agent, location_country, location_city, success)
            VALUES ($1, NOW(), $2, $3, $4, $5, TRUE)
        """, user.sub, ip_address, user_agent, location_country, location_city)
        
        print(f"✅ Login tracked for user {user.sub} from {ip_address} ({location_city}, {location_country})")
        
        return {
            "success": True,
            "message": "Login tracked successfully"
        }
    finally:
        await conn.close()
