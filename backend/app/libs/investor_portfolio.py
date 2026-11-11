"""Canonical investor portfolios and private certificate previews."""
import uuid
from fastapi import HTTPException, Response
from fastapi.concurrency import run_in_threadpool
from app import runtime
from app.libs.database import db_connection
from app.libs.investor_certificate_preview import preview_certificate, TEMPLATE_SOURCE


async def include_registered_investors(conn):
    """Keep future live subscribers visible alongside the reviewed historical import."""
    from app.libs.platform_people import ensure_person
    rows=await conn.fetch("""SELECT p.user_id,p.email,p.phone,p.email_verified FROM user_profiles p
        WHERE NOT EXISTS(SELECT 1 FROM investor_profiles i WHERE i.provider_subject=p.user_id)
        AND (EXISTS(SELECT 1 FROM user_roles u JOIN roles r ON r.id=u.role_id
            WHERE u.user_id=p.user_id AND r.role_name IN ('investor','shareholder'))
            OR EXISTS(SELECT 1 FROM share_subscriptions s WHERE s.user_id=p.user_id AND s.status!='cancelled'))
        ORDER BY p.user_id LIMIT 500""")
    for row in rows:
        person=await ensure_person(conn,row['user_id'])
        await conn.execute("""INSERT INTO investor_profiles(person_id,source_key,entity_type,contact_email,contact_phone,
            contact_status,provider_subject,activation_status,relationship,source_date)
            VALUES($1,$2,'person',$3,$4,$5,$6,'linked','Existing live investment account',CURRENT_DATE)
            ON CONFLICT DO NOTHING""",uuid.UUID(person['person_id']),'live:'+row['user_id'],row['email'],row['phone'],
            'unique_email' if row['email_verified'] else 'review',row['user_id'])


def person_key(value):
    try:
        return uuid.UUID(value)
    except (ValueError,TypeError):
        raise HTTPException(422,'Select an investor profile.') from None


async def investor_portfolio(person_id):
    key=person_key(person_id)
    async with db_connection() as conn:
        profile=await conn.fetchrow("""SELECT i.*,p.display_name FROM investor_profiles i
            JOIN platform.person p ON p.id=i.person_id WHERE i.person_id=$1""",key)
        if not profile:
            raise HTTPException(404,'Investor profile unavailable.')
        holdings=await conn.fetch("""SELECT source_sheet,source_row,kind,quantity,reference,source_status,
            reconciliation_status,review_note,units_under_review,source_date FROM cap_table_working_records
            WHERE person_id=$1 ORDER BY kind,source_row""",key)
        subscriptions=await conn.fetch("""SELECT subscription_id,num_shares,share_class,total_amount,amount_paid,status
            FROM share_subscriptions WHERE user_id=$1 ORDER BY created_at DESC""",profile['provider_subject'])
        certificates=await conn.fetch("""SELECT certificate_number,shares_count,share_class,status,issue_date
            FROM share_certificates WHERE user_id=$1 ORDER BY issue_date DESC""",profile['provider_subject'])
        documents=await conn.fetch('SELECT title,source_url,review_note FROM investor_documents WHERE person_id=$1 ORDER BY title',key)
    return {'person_id':str(key),'name':profile['display_name'],'email':profile['contact_email'],
        'contact_status':profile['contact_status'],'activation_status':profile['activation_status'],
        'holdings':[dict(row) for row in holdings],'subscriptions':[dict(row) for row in subscriptions],
        'certificates':[dict(row) for row in certificates],'source_documents':[dict(row) for row in documents],'template_source':TEMPLATE_SOURCE}


async def certificate_response(data,actor):
    key=person_key(data.get('person_id'))
    async with db_connection() as conn:
        profile=await conn.fetchrow("""SELECT i.provider_subject,p.display_name FROM investor_profiles i
            JOIN platform.person p ON p.id=i.person_id WHERE i.person_id=$1""",key)
        if not profile:
            raise HTTPException(404,'Investor profile unavailable.')
        certificate=data.get('certificate_number')
        if certificate:
            if not isinstance(certificate,str) or len(certificate)>80:
                raise HTTPException(422,'Select a certificate.')
            stored=await conn.fetchrow("""SELECT pdf_storage_key,status FROM share_certificates
                WHERE certificate_number=$1 AND user_id=$2""",certificate,profile['provider_subject'])
            if not stored or not stored['pdf_storage_key']:
                raise HTTPException(404,'This certificate file is unavailable.')
            try:
                pdf=await run_in_threadpool(runtime.storage.binary.get,stored['pdf_storage_key'])
            except FileNotFoundError:
                raise HTTPException(404,'Certificate file unavailable. Review the document record.') from None
        else:
            line=data.get('source_row')
            sheet=data.get('source_sheet')
            if type(line) is not int or not isinstance(sheet,str) or len(sheet)>150:
                raise HTTPException(422,'Select a portfolio record.')
            row=await conn.fetchrow("""SELECT * FROM cap_table_working_records
                WHERE person_id=$1 AND source_row=$2 AND source_sheet=$3""",key,line,sheet)
            if not row or row['reconciliation_status'] in ('excluded','withdrawn') or row['quantity']<=0:
                raise HTTPException(409,'This portfolio record is not available for a certificate preview.')
            pdf=await run_in_threadpool(preview_certificate,profile['display_name'],row['quantity'],
                row['reference'] or 'WORKING-'+str(key)[:8]+'-'+str(line),
                str(row['source_date']),row['kind']!='member_register')
        await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
            VALUES($1,'investor.certificate_previewed','person',$2,'{}'::jsonb)""",actor.sub,str(key))
    return Response(pdf,media_type='application/pdf',headers={
        'Content-Disposition':'inline; filename="citizen-certificate.pdf"',
        'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
    })
