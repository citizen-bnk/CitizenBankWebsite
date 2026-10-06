"""Outgoing email through Resend (see also app/libs/email_service.py).

Without RESEND_API_KEY nothing is sent and the call says so, so a missing key is visible in the logs.
"""
import os


def email(to, subject, content_html, content_text=None, attachments=None, **_ignored) -> bool:
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        print(f"[notify.email] RESEND_API_KEY is not set; not sending '{subject}'")
        return False
    import resend

    resend.api_key = key
    sender = os.environ.get("EMAIL_FROM", "Citizen Bank <noreply@notify.citizenbank.co.za>")
    params = {"from": sender, "to": [to] if isinstance(to, str) else list(to), "subject": subject, "html": content_html}
    if content_text:
        params["text"] = content_text
    if attachments:
        params["attachments"] = attachments
    resend.Emails.send(params)
    return True
