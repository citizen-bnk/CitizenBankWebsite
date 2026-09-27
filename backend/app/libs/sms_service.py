import os
"""SMS service utility for sending SMS messages with proper country code formatting."""

import re
from typing import Optional, Dict
import databutton as db


def format_phone_number(phone: str, default_country: str = "ZA") -> Optional[str]:
    """
    Format a phone number with the correct country code.
    
    Args:
        phone: Phone number (with or without country code)
        default_country: Default country code (ZA for South Africa, LS for Lesotho)
    
    Returns:
        Formatted phone number with country code (e.g., +27821234567) or None if invalid
    
    Examples:
        - "0821234567" (10 digits, SA) -> "+27821234567"
        - "821234567" (9 digits, SA) -> "+27821234567"
        - "12345678" (8 digits, LS) -> "+26612345678"
        - "2345678" (7 digits, LS) -> "+2662345678"
        - "+27821234567" -> "+27821234567" (already formatted)
    """
    if not phone:
        return None
    
    # Remove all non-digit characters except leading +
    cleaned = re.sub(r'[^\d+]', '', phone)
    
    # If it already has a country code, validate and return
    if cleaned.startswith('+'):
        # Remove + for validation
        digits = cleaned[1:]
        
        # South Africa: +27 followed by 9 digits (total 11 chars)
        if digits.startswith('27') and len(digits) == 11:
            return cleaned
        
        # Lesotho: +266 followed by 8 digits (total 11 chars)
        if digits.startswith('266') and len(digits) == 11:
            return cleaned
        
        print(f"⚠️ Invalid phone number format: {phone}")
        return None
    
    # Remove leading zeros
    cleaned = cleaned.lstrip('0')
    
    # Determine country and format
    if default_country == "LS" or default_country == "266":
        # Lesotho: 8 digits without country code
        if len(cleaned) == 8:
            return f"+266{cleaned}"
        # Lesotho: 7 digits (missing leading digit, assume it's 2)
        elif len(cleaned) == 7:
            return f"+266{cleaned}"
        else:
            print(f"⚠️ Invalid Lesotho phone number (expected 8 digits): {phone}")
            return None
    
    else:  # Default to South Africa
        # South Africa: 9 digits without country code (after removing leading 0)
        if len(cleaned) == 9:
            return f"+27{cleaned}"
        # South Africa: 10 digits (user might not have removed leading 0)
        elif len(cleaned) == 10 and cleaned.startswith('0'):
            return f"+27{cleaned[1:]}"
        else:
            print(f"⚠️ Invalid South African phone number (expected 10 digits with leading 0 or 9 without): {phone}")
            return None


async def send_sms(phone_number: str, message: str, country_code: str = "ZA") -> Dict:
    """
    Send an SMS message via the configured SMS provider.
    
    Args:
        phone_number: Phone number (will be auto-formatted)
        message: SMS message content (max 160 chars recommended)
        country_code: Country code (ZA or LS)
    
    Returns:
        Dict with status and details
    
    Note: 
        This function is ready to integrate with SMS providers like:
        - Twilio
        - Africa's Talking
        - Clickatell
        - BulkSMS
        
        To activate, add your SMS provider credentials to secrets and uncomment the provider code below.
    """
    # Format the phone number
    formatted_phone = format_phone_number(phone_number, country_code)
    
    if not formatted_phone:
        return {
            "success": False,
            "error": f"Invalid phone number format: {phone_number}",
            "formatted_phone": None
        }
    
    # Truncate message if too long (160 chars is standard SMS length)
    if len(message) > 160:
        print(f"⚠️ SMS message truncated from {len(message)} to 160 characters")
        message = message[:157] + "..."
    
    # TODO: Uncomment and configure your SMS provider
    # Option 1: Twilio
    # try:
    #     from twilio.rest import Client
    #     
    #     account_sid = db.secrets.get("TWILIO_ACCOUNT_SID")
    #     auth_token = db.secrets.get("TWILIO_AUTH_TOKEN")
    #     from_number = db.secrets.get("TWILIO_PHONE_NUMBER")
    #     
    #     client = Client(account_sid, auth_token)
    #     
    #     sms = client.messages.create(
    #         body=message,
    #         from_=from_number,
    #         to=formatted_phone
    #     )
    #     
    #     print(f"📱 SMS sent to {formatted_phone}: {sms.sid}")
    #     return {
    #         "success": True,
    #         "message_sid": sms.sid,
    #         "formatted_phone": formatted_phone,
    #         "status": sms.status
    #     }
    # except Exception as e:
    #     print(f"❌ Failed to send SMS to {formatted_phone}: {str(e)}")
    #     return {
    #         "success": False,
    #         "error": str(e),
    #         "formatted_phone": formatted_phone
    #     }
    
    # Option 2: Africa's Talking (Popular in Africa)
    # try:
    #     import africastalking
    #     
    #     username = db.secrets.get("AFRICASTALKING_USERNAME")
    #     api_key = db.secrets.get("AFRICASTALKING_API_KEY")
    #     
    #     africastalking.initialize(username, api_key)
    #     sms_client = africastalking.SMS
    #     
    #     response = sms_client.send(message, [formatted_phone])
    #     
    #     print(f"📱 SMS sent to {formatted_phone}: {response}")
    #     return {
    #         "success": True,
    #         "formatted_phone": formatted_phone,
    #         "response": response
    #     }
    # except Exception as e:
    #     print(f"❌ Failed to send SMS to {formatted_phone}: {str(e)}")
    #     return {
    #         "success": False,
    #         "error": str(e),
    #         "formatted_phone": formatted_phone
    #     }
    
    # Africa's Talking (used when credentials are configured)
    at_username = os.environ.get("AFRICASTALKING_USERNAME")
    at_api_key = os.environ.get("AFRICASTALKING_API_KEY")
    if at_username and at_api_key:
        try:
            import asyncio
            import africastalking

            africastalking.initialize(at_username, at_api_key)
            sender_id = os.environ.get("AFRICASTALKING_SENDER_ID") or None
            response = await asyncio.to_thread(
                africastalking.SMS.send, message, [formatted_phone], sender_id
            )
            recipients = response.get("SMSMessageData", {}).get("Recipients", [])
            ok = bool(recipients) and recipients[0].get("status") == "Success"
            print(f"📱 SMS to {formatted_phone}: {recipients[0].get('status') if recipients else response}")
            return {
                "success": ok,
                "formatted_phone": formatted_phone,
                "response": response,
                **({} if ok else {"error": str(response)}),
            }
        except Exception as e:
            print(f"❌ Failed to send SMS to {formatted_phone}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "formatted_phone": formatted_phone
            }

    # For now, just log the SMS (SMS provider not configured)
    print(f"📱 [SMS SIMULATION] To: {formatted_phone} | Message: {message}")
    return {
        "success": True,
        "formatted_phone": formatted_phone,
        "message": message,
        "simulation": True,
        "note": "SMS provider not configured. This is a simulation."
    }


async def send_whatsapp_message(phone_number: str, message: str, country_code: str = "ZA") -> Dict:
    """
    Send a WhatsApp message via the configured provider.
    
    Args:
        phone_number: Phone number (will be auto-formatted)
        message: WhatsApp message content
        country_code: Country code (ZA or LS)
    
    Returns:
        Dict with status and details
    
    Note:
        This function is ready to integrate with WhatsApp Business API providers like:
        - Twilio WhatsApp
        - Meta WhatsApp Business API
        - 360dialog
        - WATI
    """
    # Format the phone number
    formatted_phone = format_phone_number(phone_number, country_code)
    
    if not formatted_phone:
        return {
            "success": False,
            "error": f"Invalid phone number format: {phone_number}",
            "formatted_phone": None
        }
    
    # TODO: Uncomment and configure your WhatsApp provider
    # Option 1: Twilio WhatsApp
    # try:
    #     from twilio.rest import Client
    #     
    #     account_sid = db.secrets.get("TWILIO_ACCOUNT_SID")
    #     auth_token = db.secrets.get("TWILIO_AUTH_TOKEN")
    #     whatsapp_from = db.secrets.get("TWILIO_WHATSAPP_NUMBER")  # e.g., "whatsapp:+14155238886"
    #     
    #     client = Client(account_sid, auth_token)
    #     
    #     msg = client.messages.create(
    #         body=message,
    #         from_=whatsapp_from,
    #         to=f"whatsapp:{formatted_phone}"
    #     )
    #     
    #     print(f"💬 WhatsApp sent to {formatted_phone}: {msg.sid}")
    #     return {
    #         "success": True,
    #         "message_sid": msg.sid,
    #         "formatted_phone": formatted_phone,
    #         "status": msg.status
    #     }
    # except Exception as e:
    #     print(f"❌ Failed to send WhatsApp to {formatted_phone}: {str(e)}")
    #     return {
    #         "success": False,
    #         "error": str(e),
    #         "formatted_phone": formatted_phone
    #     }
    
    # For now, just log the WhatsApp message (WhatsApp provider not configured)
    print(f"💬 [WHATSAPP SIMULATION] To: {formatted_phone} | Message: {message}")
    return {
        "success": True,
        "formatted_phone": formatted_phone,
        "message": message,
        "simulation": True,
        "note": "WhatsApp provider not configured. This is a simulation."
    }
