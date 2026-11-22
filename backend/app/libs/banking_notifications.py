"""Templates for signed Core events. Caller-supplied HTML is never accepted."""
import html
from decimal import Decimal
from typing import Literal
from fastapi import HTTPException
from pydantic import BaseModel,ConfigDict,EmailStr,Field
from app.libs.email_queue import enqueue_email
from app.libs.database import db_transaction

class BankingNotice(BaseModel):
    model_config=ConfigDict(extra='forbid')
    event:Literal['accounts_ready','card_created','access_updated','account_energized']
    event_key:str=Field(min_length=8,max_length=240)
    recipient_email:EmailStr
    recipient_name:str=Field(min_length=1,max_length=220)
    fictional:Literal[True]
    details:dict


def render_notice(notice):
    esc=lambda value:html.escape(str(value))
    details=notice.details
    if notice.event=='accounts_ready':
        subject='Your Citizen banking accounts are ready'
        accounts=details.get('accounts',[]);cards=details.get('cards',[])
        text='Your pre-licensing banking setup is ready.'
        if accounts:text+=' Accounts ready: '+', '.join(map(str,accounts))+'.'
        if cards:text+=' Virtual cards ready for: '+', '.join(map(str,cards))+'.'
        text+=' Open Accounts to view them. You can energize your cheque account once with M5,000 in test funds.'
    elif notice.event=='card_created':
        subject='Your Citizen card has been created'
        text=f"Your {str(details.get('form','virtual')).lower()} {str(details.get('kind','debit')).lower()} card ending {details.get('last4','')} is ready for {details.get('account','your account')}."
        if details.get('form')=='PHYSICAL':text='Your simulated physical card order has been recorded. No physical card will be delivered during pre-licensing.'
    elif notice.event=='account_energized':
        try:amount=Decimal(str(details['amount']))
        except Exception:raise HTTPException(422,'Invalid notification amount.') from None
        if not amount.is_finite() or not 0<amount<=1000000:raise HTTPException(422,'Invalid notification amount.')
        subject='Your Citizen cheque account has been energized'
        text=f"M{amount:,.2f} in test funds has been added to your {details.get('account','cheque account')} ending {details.get('last4','')}. You can now explore transfers, payments and your card features. This once-only credit is not an investment refund."
    else:
        subject='Your Citizen banking access has been updated'
        enabled=[label for key,label in [('accounts','accounts and test transactions'),('cards','card creation'),('energize','once-only account credit')] if details.get(key) is True]
        disabled=[label for key,label in [('accounts','accounts and test transactions'),('cards','card creation'),('energize','once-only account credit')] if details.get(key) is False]
        text=('Enabled: '+', '.join(enabled)+'. ' if enabled else '')+('Disabled: '+', '.join(disabled)+'.' if disabled else '')
    body='<p>Hello '+esc(notice.recipient_name)+',</p><p>'+esc(text)+'</p><p><a href="https://banking.citizenbank.co.ls/accounts">Open my banking accounts</a> · <a href="https://app.citizenbank.co.ls">Open the mobile app</a></p><p>Citizen Bank is in pre-licensing. These features use fictional funds only; no real deposits, withdrawals or card settlement are enabled.</p><p>Need help? Contact admin@citizenbank.co.ls.</p>'
    return subject,body


async def queue_notice(notice,person_id):
    subject,body=render_notice(notice)
    async with db_transaction() as conn:
        result=await enqueue_email(recipient_email=str(notice.recipient_email),recipient_name=notice.recipient_name,
            subject=subject,body_html=body,created_by='citizen_core',priority='normal',conn=conn,
            dedupe_key='banking-notice:'+notice.event_key)
        await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
            SELECT $1,'banking.notification_queued','email',$2,$3::jsonb
            WHERE NOT EXISTS(SELECT 1 FROM platform.audit_log WHERE action='banking.notification_queued' AND target_id=$2)""",person_id,result['queue_id'],__import__('json').dumps({'event':notice.event,'fictional':True}))
    return {'queued':True,'queue_id':result['queue_id']}
