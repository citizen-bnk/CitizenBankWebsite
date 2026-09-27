"""
Pushwoosh Multi-Channel Notification Library

Provides unified interface for sending notifications via:
- SMS
- Web Push (Chrome, Firefox, Safari)
- Email (future)
- WhatsApp (future)

Features:
- Channel fallback (SMS → Email)
- Template-based messaging
- Delivery tracking
- Rate limit handling
- User preference checking
"""

import os
import requests
from typing import Optional, Dict, List, Any
from enum import Enum

# Pushwoosh API configuration
PUSHWOOSH_API_URL = "https://api.pushwoosh.com/json/1.3"
APP_CODE = os.environ.get("PUSHWOOSH_APP_CODE")
SERVER_TOKEN = os.environ.get("PUSHWOOSH_SERVER_TOKEN")
DEVICE_TOKEN = os.environ.get("PUSHWOOSH_DEVICE_TOKEN")


class NotificationChannel(str, Enum):
    """Supported notification channels"""
    SMS = "sms"
    EMAIL = "email"
    PUSH = "push"
    WHATSAPP = "whatsapp"


class NotificationStatus(str, Enum):
    """Notification delivery status"""
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    OPENED = "opened"
    CLICKED = "clicked"


class PushwooshError(Exception):
    """Custom exception for Pushwoosh API errors"""
    pass


def _make_api_request(
    endpoint: str,
    payload: Dict[str, Any],
    use_server_token: bool = True
) -> Dict[str, Any]:
    """
    Make request to Pushwoosh API.
    
    Args:
        endpoint: API endpoint (e.g., 'createMessage')
        payload: Request payload
        use_server_token: Use server token (True) or device token (False)
    
    Returns:
        API response as dict
    
    Raises:
        PushwooshError: If API request fails
    """
    url = f"{PUSHWOOSH_API_URL}/{endpoint}"
    
    # Add auth token
    token = SERVER_TOKEN if use_server_token else DEVICE_TOKEN
    if not token:
        raise PushwooshError("Pushwoosh API token not configured")
    
    payload["request"]["auth"] = token
    
    # Add application code if not present
    if "application" not in payload["request"]:
        if not APP_CODE:
            raise PushwooshError("Pushwoosh application code not configured")
        payload["request"]["application"] = APP_CODE
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Check for Pushwoosh-specific errors
        if data.get("status_code") != 200:
            error_msg = data.get("status_message", "Unknown error")
            raise PushwooshError(f"Pushwoosh API error: {error_msg}")
        
        return data
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Pushwoosh API request failed: {str(e)}")
        raise PushwooshError(f"API request failed: {str(e)}")


def send_sms(
    phone: str,
    message: str,
    user_id: Optional[str] = None,
    notification_type: str = "general"
) -> Dict[str, Any]:
    """
    Send SMS via Pushwoosh.
    
    Args:
        phone: Phone number in E.164 format (e.g., +27821234567)
        message: SMS message content (max 160 chars recommended)
        user_id: Optional user ID for tracking
        notification_type: Type of notification for analytics
    
    Returns:
        Dict with 'success', 'message_id', and 'status'
    
    Example:
        >>> result = send_sms("+27821234567", "Your OTP is 123456")
        >>> print(result['message_id'])
    """
    # Validate phone format
    if not phone.startswith("+"):
        raise ValueError("Phone number must be in E.164 format (starting with +)")
    
    # Truncate message if too long
    if len(message) > 160:
        print(f"⚠️ SMS message truncated from {len(message)} to 160 chars")
        message = message[:157] + "..."
    
    payload = {
        "request": {
            "notifications": [{
                "send_date": "now",
                "content": message,
                "sms_phone_number": phone,
                "data": {
                    "notification_type": notification_type,
                    "user_id": user_id or ""
                }
            }]
        }
    }
    
    try:
        response = _make_api_request("createMessage", payload)
        
        # Extract message ID from response
        messages = response.get("response", {}).get("Messages", [])
        message_id = messages[0] if messages else None
        
        print(f"✅ SMS sent to {phone[:7]}*** - Message ID: {message_id}")
        
        return {
            "success": True,
            "message_id": message_id,
            "status": NotificationStatus.SENT,
            "channel": NotificationChannel.SMS
        }
    
    except PushwooshError as e:
        print(f"❌ Failed to send SMS to {phone[:7]}***: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "status": NotificationStatus.FAILED,
            "channel": NotificationChannel.SMS
        }


def send_web_push(
    user_id: str,
    title: str,
    message: str,
    url: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None,
    notification_type: str = "general"
) -> Dict[str, Any]:
    """
    Send Web Push notification to user.
    
    Args:
        user_id: User ID (must have registered device)
        title: Notification title
        message: Notification body
        url: Optional URL to open on click
        data: Optional custom data payload
        notification_type: Type of notification for analytics
    
    Returns:
        Dict with 'success', 'message_id', and 'status'
    
    Example:
        >>> result = send_web_push(
        ...     user_id="123",
        ...     title="New Message",
        ...     message="You have a new invitation",
        ...     url="/board-portal"
        ... )
    """
    custom_data = data or {}
    custom_data.update({
        "notification_type": notification_type,
        "user_id": user_id
    })
    
    notification = {
        "send_date": "now",
        "content": message,
        "heading": title,
        "users": [user_id],  # Target specific user
        "data": custom_data
    }
    
    # Add URL if provided
    if url:
        notification["link"] = url
    
    payload = {
        "request": {
            "notifications": [notification]
        }
    }
    
    try:
        response = _make_api_request("createMessage", payload)
        
        # Extract message ID
        messages = response.get("response", {}).get("Messages", [])
        message_id = messages[0] if messages else None
        
        print(f"✅ Web push sent to user {user_id} - Message ID: {message_id}")
        
        return {
            "success": True,
            "message_id": message_id,
            "status": NotificationStatus.SENT,
            "channel": NotificationChannel.PUSH
        }
    
    except PushwooshError as e:
        print(f"❌ Failed to send web push to user {user_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "status": NotificationStatus.FAILED,
            "channel": NotificationChannel.PUSH
        }


def send_bulk_sms(
    recipients: List[Dict[str, str]],
    message: str,
    notification_type: str = "general"
) -> Dict[str, Any]:
    """
    Send SMS to multiple recipients.
    
    Args:
        recipients: List of dicts with 'phone' and optional 'user_id'
        message: SMS message content
        notification_type: Type of notification
    
    Returns:
        Dict with overall results and per-recipient status
    
    Example:
        >>> recipients = [
        ...     {"phone": "+27821234567", "user_id": "user1"},
        ...     {"phone": "+27827654321", "user_id": "user2"}
        ... ]
        >>> result = send_bulk_sms(recipients, "Important update")
    """
    results = {
        "total": len(recipients),
        "sent": 0,
        "failed": 0,
        "details": []
    }
    
    for recipient in recipients:
        phone = recipient.get("phone")
        user_id = recipient.get("user_id")
        
        if not phone:
            results["failed"] += 1
            results["details"].append({
                "phone": "unknown",
                "success": False,
                "error": "Missing phone number"
            })
            continue
        
        result = send_sms(phone, message, user_id, notification_type)
        
        if result["success"]:
            results["sent"] += 1
        else:
            results["failed"] += 1
        
        results["details"].append({
            "phone": phone[:7] + "***",
            "success": result["success"],
            "message_id": result.get("message_id"),
            "error": result.get("error")
        })
    
    print(f"📤 Bulk SMS: {results['sent']}/{results['total']} sent successfully")
    
    return results


def register_device(
    user_id: str,
    hwid: str,
    push_token: str,
    platform: str,
    device_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Register device for push notifications.
    
    Args:
        user_id: User identifier
        hwid: Hardware ID (unique device identifier)
        push_token: Push notification token from browser
        platform: Platform type (11=Chrome, 12=Firefox, 10=Safari)
        device_data: Optional device metadata
    
    Returns:
        Dict with registration result
    
    Example:
        >>> result = register_device(
        ...     user_id="user123",
        ...     hwid="device-abc-123",
        ...     push_token="fcm-token-here",
        ...     platform="11"  # Chrome
        ... )
    """
    payload = {
        "request": {
            "hwid": hwid,
            "push_token": push_token,
            "platform": int(platform),
            "user_id": user_id,
            "device_type": int(platform)  # Same as platform for web
        }
    }
    
    # Add optional device data
    if device_data:
        payload["request"].update(device_data)
    
    try:
        _make_api_request("registerDevice", payload, use_server_token=False)
        print(f"✅ Device registered for user {user_id} - HWID: {hwid[:10]}***")
        
        return {
            "success": True,
            "hwid": hwid,
            "user_id": user_id
        }
    
    except PushwooshError as e:
        print(f"❌ Failed to register device for user {user_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def set_user_tags(
    user_id: str,
    tags: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Set tags for user for better targeting.
    
    Args:
        user_id: User identifier
        tags: Dict of tag name -> value
    
    Returns:
        Dict with success status
    
    Example:
        >>> set_user_tags("user123", {
        ...     "Name": "John Doe",
        ...     "UserType": "BoardMember",
        ...     "InvestmentAmount": 50000
        ... })
    """
    payload = {
        "request": {
            "user_id": user_id,
            "tags": tags
        }
    }
    
    try:
        _make_api_request("setTags", payload)
        print(f"✅ Tags set for user {user_id}")
        return {"success": True}
    
    except PushwooshError as e:
        print(f"❌ Failed to set tags for user {user_id}: {str(e)}")
        return {"success": False, "error": str(e)}


async def send_notification(
    user_identifier: str,
    subject: str,
    message: str,
    short_message: Optional[str] = None,
    notification_type: str = "general",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Send multi-channel notification with user preference checking and analytics.
    
    This is the main async interface for sending notifications throughout the app.
    It handles:
    - Looking up user preferences
    - Attempting channels in priority order
    - Logging delivery results to analytics
    - Graceful fallback
    
    Args:
        user_identifier: Email or phone number
        subject: Notification subject/title
        message: Full message content (for email/WhatsApp)
        short_message: Short version for SMS/Push (optional, will truncate message if not provided)
        notification_type: Type for analytics (invitation, payment_reminder, etc.)
        metadata: Additional context to log (invitation_id, payment_id, etc.)
    
    Returns:
        Dict with success status, channels attempted, and channels succeeded
    
    Example:
        >>> result = await send_notification(
        ...     user_identifier="user@example.com",
        ...     subject="New Invitation",
        ...     message="You've been invited to join...",
        ...     short_message="Invitation from John Doe",
        ...     notification_type="invitation"
        ... )
        >>> print(result['channels_sent'])  # ['sms', 'email']
    """
    import asyncpg
    import os
    import json
    from datetime import datetime
    
    # Default short message to first 140 chars of message
    if not short_message:
        short_message = message[:140] + "..." if len(message) > 140 else message
    
    # Results structure
    results = {
        "success": False,
        "user_identifier": user_identifier,
        "channels_attempted": [],
        "channels_sent": [],
        "channels_failed": [],
        "error": None,
        "details": {}
    }
    
    # Connect to database
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        results["error"] = "Database not configured"
        return results
    
    conn = await asyncpg.connect(db_url)
    
    try:
        # Look up user by email/phone
        user_row = await conn.fetchrow(
            """SELECT user_id, email, phone_number FROM user_profiles 
               WHERE email = $1 OR phone_number = $1 LIMIT 1""",
            user_identifier
        )
        
        user_id = user_row['user_id'] if user_row else None
        email = user_row['email'] if user_row else (user_identifier if '@' in user_identifier else None)
        phone = user_row['phone_number'] if user_row else (user_identifier if user_identifier.startswith('+') else None)
        
        # Get user preferences (if user exists)
        preferences = {
            "sms_enabled": True,
            "email_enabled": True,
            "push_enabled": True,
            "whatsapp_enabled": True
        }
        
        if user_id:
            pref_row = await conn.fetchrow(
                """SELECT sms_enabled, email_enabled, push_enabled, whatsapp_enabled, notification_types
                   FROM notification_preferences WHERE user_id = $1""",
                user_id
            )
            
            if pref_row:
                preferences.update(dict(pref_row))
                
                # Check notification-type specific preferences
                notification_types = pref_row.get('notification_types') or {}
                if notification_type in notification_types:
                    type_prefs = notification_types[notification_type]
                    preferences.update(type_prefs)
        
        # Determine channels to try (in priority order)
        channels_to_try = []
        
        # Priority order: SMS > Email > Push
        if phone and preferences.get("sms_enabled", True):
            channels_to_try.append(("sms", phone))
        
        if email and preferences.get("email_enabled", True):
            channels_to_try.append(("email", email))
        
        if user_id and preferences.get("push_enabled", True):
            channels_to_try.append(("push", user_id))
        
        # Try each channel
        for channel, identifier in channels_to_try:
            results["channels_attempted"].append(channel)
            
            try:
                if channel == "sms":
                    # Send SMS
                    sms_result = send_sms(
                        phone=identifier,
                        message=short_message,
                        user_id=user_id,
                        notification_type=notification_type
                    )
                    
                    if sms_result["success"]:
                        results["channels_sent"].append("sms")
                        results["details"]["sms"] = sms_result
                    else:
                        results["channels_failed"].append("sms")
                        results["details"]["sms"] = sms_result
                
                elif channel == "email":
                    # Send email via Resend (fallback)
                    try:
                        from app.libs.email import send_email
                        
                        await send_email(
                            to=identifier,
                            subject=subject,
                            body=message
                        )
                        
                        results["channels_sent"].append("email")
                        results["details"]["email"] = {"success": True, "channel": "email"}
                    except Exception as email_err:
                        results["channels_failed"].append("email")
                        results["details"]["email"] = {"success": False, "error": str(email_err), "channel": "email"}
                
                elif channel == "push":
                    # Send web push
                    push_result = send_web_push(
                        user_id=identifier,
                        title=subject,
                        message=short_message,
                        notification_type=notification_type
                    )
                    
                    if push_result["success"]:
                        results["channels_sent"].append("push")
                        results["details"]["push"] = push_result
                    else:
                        results["channels_failed"].append("push")
                        results["details"]["push"] = push_result
            
            except Exception as channel_err:
                print(f"❌ Error sending via {channel}: {str(channel_err)}")
                results["channels_failed"].append(channel)
                results["details"][channel] = {"success": False, "error": str(channel_err)}
        
        # Set overall success
        results["success"] = len(results["channels_sent"]) > 0
        
        # Log to analytics table
        try:
            await conn.execute(
                """
                INSERT INTO notification_delivery_logs
                (user_identifier, user_id, notification_type, subject, message_preview,
                 channels_attempted, channels_succeeded, channels_failed, error_details, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """,
                user_identifier,
                user_id,
                notification_type,
                subject,
                message[:200],  # Preview
                json.dumps(results["channels_attempted"]),
                json.dumps(results["channels_sent"]),
                json.dumps(results["channels_failed"]),
                json.dumps({ch: results["details"].get(ch, {}).get("error") for ch in results["channels_failed"]}),
                json.dumps(metadata or {})
            )
            
            # Update daily stats
            today = datetime.now().date()
            for channel in results["channels_attempted"]:
                success = channel in results["channels_sent"]
                
                await conn.execute(
                    """
                    INSERT INTO notification_channel_stats
                    (channel, notification_type, date, total_attempts, total_successes, total_failures, unique_recipients)
                    VALUES ($1, $2, $3, 1, $4, $5, 1)
                    ON CONFLICT (channel, notification_type, date)
                    DO UPDATE SET
                        total_attempts = notification_channel_stats.total_attempts + 1,
                        total_successes = notification_channel_stats.total_successes + $4,
                        total_failures = notification_channel_stats.total_failures + $5,
                        unique_recipients = notification_channel_stats.unique_recipients + 1,
                        updated_at = NOW()
                    """,
                    channel,
                    notification_type,
                    today,
                    1 if success else 0,
                    0 if success else 1
                )
        
        except Exception as log_err:
            print(f"⚠️ Failed to log notification analytics: {str(log_err)}")
    
    finally:
        await conn.close()
    
    return results
