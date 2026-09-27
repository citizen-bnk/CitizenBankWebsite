"""Email configuration and sender addresses for Citizen Bank."""

# ============ EMAIL SENDER CONFIGURATION ============

# Primary subdomain for transactional emails (protects main domain)
# Recommended: notify.citizenbank.co.za or mail.citizenbank.co.za
EMAIL_SUBDOMAIN = "invites.citizenbank.co.za"

# Sender configurations with friendly names
EMAIL_SENDERS = {
    "noreply": {
        "email": f"noreply@{EMAIL_SUBDOMAIN}",
        "name": "Citizen Bank",
        "description": "General notifications and system emails"
    },
    "invitations": {
        "email": f"invitations@{EMAIL_SUBDOMAIN}",
        "name": "Citizen Bank Invitations",
        "description": "Board member and shareholder invitations"
    },
    "documents": {
        "email": f"documents@{EMAIL_SUBDOMAIN}",
        "name": "Citizen Bank Document Review",
        "description": "Document review notifications"
    },
    "admin": {
        "email": f"admin@{EMAIL_SUBDOMAIN}",
        "name": "Citizen Bank Administration",
        "description": "Administrative notifications"
    },
    "shares": {
        "email": f"shares@{EMAIL_SUBDOMAIN}",
        "name": "Citizen Bank Shareholder Services",
        "description": "Share subscription and certificate notifications"
    },
    "verification": {
        "email": f"verification@{EMAIL_SUBDOMAIN}",
        "name": "Citizen Bank Security",
        "description": "Verification codes and security notifications"
    }
}

# Default sender (noreply)
DEFAULT_SENDER = EMAIL_SENDERS["noreply"]

# Customer service emails (display only, not for sending)
# These should forward to your actual support systems
CUSTOMER_SERVICE_EMAILS = {
    "info": "info@citizenbank.co.ls",
    "support": "support@citizenbank.co.ls",
    "media": "media@citizenbank.co.ls",
    "privacy": "privacy@citizenbank.co.ls",
    "security": "security@citizenbank.co.ls",
    "legal": "legal@citizenbank.co.ls"
}


def get_sender(sender_type: str = "noreply") -> dict:
    """Get sender configuration by type.
    
    Args:
        sender_type: Type of sender (noreply, invitations, documents, admin, shares, verification)
        
    Returns:
        Dict with 'email' and 'name' keys
    """
    sender = EMAIL_SENDERS.get(sender_type, DEFAULT_SENDER)
    return {
        "email": sender["email"],
        "name": sender["name"]
    }


def format_sender(sender_type: str = "noreply") -> str:
    """Format sender as 'Name <email@example.com>'.
    
    Args:
        sender_type: Type of sender
        
    Returns:
        Formatted sender string
    """
    sender = get_sender(sender_type)
    return f"{sender['name']} <{sender['email']}>"
