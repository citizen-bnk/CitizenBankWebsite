"""The live investor offer is Class B; reserved classes are not sale offers."""
from fastapi import HTTPException

INSTALLMENT_MONTHS = (3, 6, 12)


def validate_payment_plan(method, months):
    if method not in ('one_time','installment'):
        raise HTTPException(422, 'Choose a supported payment schedule.')
    if method == 'installment' and months not in INSTALLMENT_MONTHS:
        raise HTTPException(422, 'Supported instalment periods are 3, 6 and 12 months.')


async def approved_offer(conn, share_class='Class B'):
    if share_class != 'Class B':
        raise HTTPException(409, 'Reserved share classes are not approved sale offers. Use the active Class B offer.')
    row = await conn.fetchrow('''SELECT *, price_per_share AS share_price
        FROM share_classes WHERE class_name=$1 AND is_active=true AND price_per_share>0 LIMIT 1''', share_class)
    if not row:
        raise HTTPException(409, 'No approved active Class B offer is configured. Finance must review share setup.')
    return row
