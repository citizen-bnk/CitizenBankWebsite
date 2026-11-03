"""Price selection for the original website's Class B offer."""

from decimal import Decimal


async def existing_shareholder(conn, subject: str | None, email: str | None) -> bool:
    if subject and await conn.fetchval(
        """SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id
           WHERE ur.user_id=$1 AND r.role_name='shareholder')""", subject,
    ):
        return True
    if email and await conn.fetchval(
        """SELECT EXISTS (SELECT 1 FROM share_subscriptions
           WHERE lower(email)=lower($1) AND status IN ('active','completed'))""", email,
    ):
        return True
    return False


async def active_promotion(conn, subject: str | None, email: str | None):
    """Return an active offer only for its eligible audience."""
    promotion = await conn.fetchrow(
        """SELECT id,title,price_per_share,audience,ends_at FROM share_promotions
           WHERE status='active' AND starts_at<=now() AND ends_at>now()
           ORDER BY created_at DESC LIMIT 1"""
    )
    if not promotion:
        return None
    if promotion['audience'] == 'existing_shareholders' and not await existing_shareholder(conn, subject, email):
        return None
    return promotion


def effective_price(base_price, promotion) -> Decimal:
    return Decimal(str(promotion['price_per_share'] if promotion else base_price))
