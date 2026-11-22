import pytest
from pydantic import ValidationError
from app.libs.banking_notifications import BankingNotice,render_notice

def notice(event,details):
 return BankingNotice(event=event,event_key='bank-event-123',recipient_email='person@example.com',recipient_name='Person <script>',details=details,fictional=True)

def test_energize_email_states_amount_and_fictional_money_without_claiming_a_real_deposit():
 subject,body=render_notice(notice('account_energized',{'amount':'5000.00','account':'Cheque Account','last4':'1234'}))
 assert 'energized' in subject
 assert 'M5,000.00' in body and '1234' in body
 assert 'fictional funds only' in body
 assert '<script>' not in body
 assert '&lt;script&gt;' in body

def test_account_and_card_templates_describe_created_products():
 _,body=render_notice(notice('accounts_ready',{'accounts':['Cheque Account','Savings Account','Crypto sandbox account'],'cards':['Cheque Account']}))
 assert 'Savings Account' in body and 'Virtual cards ready' in body
 _,body=render_notice(notice('card_created',{'form':'VIRTUAL','kind':'CRYPTO','last4':'1234','account':'Crypto sandbox account'}))
 assert 'virtual crypto card ending 1234' in body
 _,body=render_notice(notice('card_created',{'form':'PHYSICAL'}))
 assert 'No physical card will be delivered' in body

def test_notification_cannot_claim_real_money_or_accept_caller_html():
 with pytest.raises(ValidationError):
  BankingNotice(event='accounts_ready',event_key='event-123',recipient_email='person@example.com',recipient_name='Person',details={},fictional=False)
 with pytest.raises(ValidationError):
  BankingNotice(event='accounts_ready',event_key='event-123',recipient_email='person@example.com',recipient_name='Person',details={},fictional=True,html='<p>Injected</p>')
