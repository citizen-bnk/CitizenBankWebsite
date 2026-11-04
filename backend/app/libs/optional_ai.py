"""Optional AI must not prevent the website's API routers from loading."""
import os
from fastapi import HTTPException
from openai import OpenAI


def get_openai_client():
    key = os.environ.get('OPENAI_API_KEY')
    if not key:
        raise HTTPException(503, detail={
            'code': 'AI_CONNECTION_UNAVAILABLE',
            'message': 'Citizen AI is not connected for this service. Use the standard form or contact support.',
            'recovery': 'manual_form',
        })
    return OpenAI(api_key=key, timeout=20, max_retries=0)
