"""Publish a committed customer-role grant to Core; never copy login secrets."""
import os,json,time,base64,hmac,hashlib
import httpx
from app.libs.database import db_connection
from app.libs.platform_people import ensure_person


async def prepare_customer_products(subject):
    secret=os.environ.get('PROFILE_SERVICE_SECRET','')
    if len(secret)<32:
        return False
    async with db_connection() as conn:
        person=await ensure_person(conn,subject)
        name=await conn.fetchval('SELECT full_name FROM user_profiles WHERE user_id=$1',subject)
    raw=json.dumps({'person_id':person['person_id'],'name':name or ''},separators=(',',':'))
    now=int(time.time())
    payload=base64.urlsafe_b64encode(json.dumps({'use':'customer-products','sub':person['person_id'],'method':'POST','body':hashlib.sha256(raw.encode()).hexdigest(),'iat':now,'exp':now+30},separators=(',',':')).encode()).decode().rstrip('=')
    token=payload+'.'+base64.urlsafe_b64encode(hmac.new(secret.encode(),payload.encode(),hashlib.sha256).digest()).decode().rstrip('=')
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            result=await client.post('https://citizenbankcore-demo.vercel.app/api/internal/customer-products',content=raw,headers={'Content-Type':'application/json','X-Citizen-Profile-Token':token})
            return result.is_success
    except httpx.HTTPError:
        return False
