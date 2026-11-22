"""Read-only, role-protected person workspace. Never include authentication secrets."""
import json

PROFILE_GROUPS = {
    'Basic': ['full_name','email','phone','country','gender','date_of_birth','nationality','bio'],
    'Identity and address': ['id_type','id_number','identity_type','id_country_of_issue','citizenship_status',
        'street_address','city','state_province','postal_code','email_verified','mobile_verified'],
    'Professional and business': ['occupation','employer','employment_status','employment_type','linkedin_profile',
        'business_name','company_registration_number','tax_id','account_type'],
    'Investor information': ['source_of_funds','investor_type','investment_purpose'],
    'Documents': ['cv_filename','cv_uploaded_at','cv_share_link','selfie_picture_url','half_body_picture_url'],
    'Account': ['status','created_at','updated_at','profile_completion_percentage'],
}


def profile_sections(profile):
    sections = {label:{field:profile[field] for field in fields if profile.get(field) is not None and profile[field] != ''}
            for label,fields in PROFILE_GROUPS.items()}
    if profile.get('cv_document_url'):
        sections['Documents']['cv_available']=True
        sections['Documents']['cv_filename']=profile['cv_document_url'].rsplit('/',1)[-1]
    return sections


async def user_overview(conn, subject):
    row = await conn.fetchrow('SELECT to_jsonb(p) AS profile FROM user_profiles p WHERE user_id=$1', subject)
    if not row:
        return None
    profile = row['profile']
    if isinstance(profile,str):
        profile = json.loads(profile)
    roles = await conn.fetch('SELECT r.role_name FROM user_roles u JOIN roles r ON r.id=u.role_id WHERE u.user_id=$1',subject)
    investors = await conn.fetch('''SELECT i.person_id::text,i.relationship,i.activation_status,i.contact_status
        FROM investor_profiles i WHERE i.provider_subject=$1 OR i.person_id IN
        (SELECT person_id FROM platform.identity_mapping WHERE provider='stack_auth' AND subject=$1 AND status='verified')''',subject)
    subscriptions = await conn.fetch('''SELECT subscription_id,num_shares,share_class,total_amount,amount_paid,status,payment_status
        FROM share_subscriptions WHERE user_id=$1 OR investor_person_id IN (SELECT person_id FROM platform.identity_mapping WHERE provider='stack_auth' AND subject=$1 AND status='verified') ORDER BY created_at DESC''',subject)
    board = await conn.fetch('''SELECT position,status,appointed_date,term_end_date FROM board_members WHERE user_id=$1''',subject)
    invitations = await conn.fetch('''SELECT id,invitation_type,role,status,created_at,expires_at,accepted_at
        FROM invitations WHERE accepted_by=$1 OR lower(email)=lower($2) ORDER BY created_at DESC''',subject,profile['email'])
    return {'user_id':subject,'name':profile.get('full_name') or profile['email'],
        'sections':profile_sections(profile),'roles':[r['role_name'] for r in roles],
        'investor_records':[dict(r) for r in investors], 'subscriptions':[dict(r) for r in subscriptions],
        'board_records':[dict(r) for r in board], 'invitations':[dict(r) for r in invitations]}

async def relationship_counts(conn, subjects):
    if not subjects:
        return {}
    rows=await conn.fetch('''SELECT p.user_id,
        (SELECT count(*) FROM share_subscriptions s WHERE s.user_id=p.user_id) AS subscription_count,
        (SELECT count(*) FROM board_members b WHERE b.user_id=p.user_id) AS board_count,
        EXISTS(SELECT 1 FROM investor_profiles i WHERE i.provider_subject=p.user_id OR i.person_id IN
            (SELECT person_id FROM platform.identity_mapping WHERE provider='stack_auth' AND subject=p.user_id AND status='verified')) AS has_investor_profile
        FROM user_profiles p WHERE p.user_id=ANY($1::text[])''',subjects)
    return {row['user_id']:{key:row[key] for key in ['subscription_count','board_count','has_investor_profile']} for row in rows}
