"""Queue board communications without claiming that the provider has delivered them."""
from app.libs.email_queue import enqueue_email

async def send_email(to,subject,content_html,content_text='',**options):
    result=await enqueue_email(recipient_email=to,recipient_name=to,subject=subject,
        body_html=content_html,body_text=content_text,created_by='system',priority='high')
    return {'success':True,'status':'queued','queue_id':result['queue_id']}
