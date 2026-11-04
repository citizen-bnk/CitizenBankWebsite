export type ProfileStage = 'basic' | 'standard' | 'advanced';

export function calculateProfileCompletion(profile: object | null, stage: ProfileStage = 'basic'): number {
  if (!profile) return 0;
  const value = profile as Record<string, unknown>;
  const available = Array.isArray(value.profile_stages) ? value.profile_stages : ['basic'];
  const selected = available.includes(stage) ? stage : 'basic';
  const percentages = value.profile_completion_by_stage as Record<string, number> | undefined;
  if (typeof percentages?.[selected] === 'number') return percentages[selected];
  // During a rolling release, never reuse the old all-fields percentage.
  const fields = selected === 'basic' ? ['full_name', 'email', 'phone']
    : selected === 'standard' ? ['id_number', 'date_of_birth', 'nationality', 'street_address', 'city', 'country'] : ['occupation'];
  return Math.round(100 * fields.filter(key => String(value[key] || '').trim()).length / fields.length);
}
