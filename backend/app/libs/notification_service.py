"""Multi-channel notification sender used by the board engagement features.

This module was not part of the original export. It currently delivers the
"email" channel through Resend (app.libs.email_service); other channels are
reported as skipped.
"""
from typing import Any, Optional

from pydantic import BaseModel

from app.libs.email_service import send_email


class NotificationRequest(BaseModel):
    user_identifier: str
    user_id: Optional[str] = None
    notification_type: str
    subject: str
    message: str
    html_content: Optional[str] = None
    channels: list[str] = ["email"]
    metadata: dict[str, Any] = {}


class NotificationResult(dict):
    """Dict that also allows attribute access (callers use both styles)."""

    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError as e:
            raise AttributeError(name) from e


async def send_notification(req: NotificationRequest) -> NotificationResult:
    channel_results: dict[str, Any] = {}
    errors: list[str] = []

    for channel in req.channels or ["email"]:
        if channel == "email":
            try:
                result = await send_email(
                    to=req.user_identifier,
                    subject=req.subject,
                    content_html=req.html_content or f"<p>{req.message}</p>",
                    content_text=req.message,
                )
                channel_results["email"] = result
                if not result.get("success"):
                    errors.append(f"email: {result.get('error', 'unknown error')}")
            except Exception as e:
                channel_results["email"] = {"success": False, "error": str(e)}
                errors.append(f"email: {e}")
        else:
            channel_results[channel] = {"success": False, "skipped": True}

    success = channel_results.get("email", {}).get("success", False)
    error = "; ".join(errors) if errors else None
    return NotificationResult(
        success=success,
        channels=channel_results,
        error=error,
        error_details=error,
    )
