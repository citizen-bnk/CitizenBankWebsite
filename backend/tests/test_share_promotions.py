from decimal import Decimal

import pytest

from app.libs.share_promotions import active_promotion, effective_price


class PromotionConnection:
    def __init__(self, audience):
        self.audience = audience

    async def fetchrow(self, query, *_):
        assert 'FROM share_promotions' in query
        return {'id': 'offer-1', 'title': 'Shareholder offer',
                'price_per_share': Decimal('8.00'), 'audience': self.audience}

    async def fetchval(self, query, *_):
        assert 'shareholder' in query or 'share_subscriptions' in query
        return False


@pytest.mark.asyncio
async def test_shareholder_only_price_cannot_reach_an_unqualified_invitee():
    promotion = await active_promotion(PromotionConnection('existing_shareholders'), 'new-investor', 'new@example.com')
    assert promotion is None
    assert effective_price(Decimal('10.00'), promotion) == Decimal('10.00')


@pytest.mark.asyncio
async def test_invited_offer_keeps_the_promotion_price_as_a_decimal():
    promotion = await active_promotion(PromotionConnection('invited_and_shareholders'), 'invited', 'i@example.com')
    assert effective_price(Decimal('10.00'), promotion) == Decimal('8.00')
