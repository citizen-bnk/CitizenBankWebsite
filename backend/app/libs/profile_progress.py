"""Completion is scoped to visible profile sections, independently of KYC approval."""
def profile_progress(profile, stages, roles=(), has_subscription=False):
    fields = {'basic': ['full_name', 'email', 'phone']}
    if 'standard' in stages:
        fields['standard'] = ['id_number', 'date_of_birth', 'nationality', 'street_address', 'city', 'country']
        if profile.get('account_type') == 'business':
            fields['standard'] += ['business_name', 'company_registration_number', 'tax_id']
    if 'advanced' in stages:
        fields['advanced'] = ['occupation']
        if has_subscription or set(roles) & {'investor', 'shareholder'}:
            fields['advanced'] += ['source_of_funds', 'investor_type', 'investment_purpose']
    missing = {stage: [key for key in keys if not str(profile.get(key) or '').strip()] for stage, keys in fields.items()}
    percentages = {stage: round(100 * (len(keys) - len(missing[stage])) / len(keys)) for stage, keys in fields.items()}
    return {'profile_completion_by_stage': percentages, 'profile_missing_by_stage': missing,
            'profile_completion_percentage': percentages['basic'],
            'profile_completed': all(value == 100 for value in percentages.values())}
