import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserGuardContext } from 'app/auth';
import brain from 'brain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, CheckCircle2, Upload, FileCheck2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { logOnboardingEvent } from 'utils/onboardingAnalytics';
import { canProceedContact, canProceedIdentity, canProceedKyc } from 'utils/validators';
import type {
  GetChecklistData,
  GetMyDocumentStatusData,
  OnboardingStatusResponse,
  UserProfileUpdate,
} from 'types';

const STEPS = [
  { key: 'identity', title: 'Identity', description: 'Your ID details' },
  { key: 'contact', title: 'Contact Details', description: 'Phone and address' },
  { key: 'kyc', title: 'KYC Basics', description: 'Birth date and nationality' },
] as const;

const ID_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'other', label: 'Other' },
] as const;

export default function BoardOnboarding() {
  const navigate = useNavigate();
  const { user } = useUserGuardContext();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<OnboardingStatusResponse | null>(null);
  const [profileDraft, setProfileDraft] = useState<Partial<UserProfileUpdate>>({});
  const [docChecklist, setDocChecklist] = useState<GetChecklistData | null>(null);
  const [docStatus, setDocStatus] = useState<GetMyDocumentStatusData | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const completion = useMemo(() => status?.completion_percentage ?? 0, [status]);
  const stepPercent = ((currentStep + 1) / STEPS.length) * 100;
  
  // Calculate dynamic progress: use step progress plus weighted profile completion
  const dynamicProgress = useMemo(() => {
    // Each step represents 33.33% of the journey
    const baseStepProgress = ((currentStep + 1) / STEPS.length) * 100;
    // Add partial credit if fields in current step are filled
    let currentStepBonus = 0;
    if (currentStep === 0 && (profileDraft.id_type || profileDraft.id_number || profileDraft.full_name)) {
      currentStepBonus = canProceedIdentity(profileDraft) ? 0 : 5;
    } else if (currentStep === 1 && (profileDraft.phone || profileDraft.street_address)) {
      currentStepBonus = canProceedContact(profileDraft) ? 0 : 5;
    } else if (currentStep === 2 && (profileDraft.date_of_birth || profileDraft.nationality)) {
      currentStepBonus = canProceedKyc(profileDraft) ? 0 : 5;
    }
    return Math.min(100, baseStepProgress + currentStepBonus);
  }, [currentStep, profileDraft]);

  useEffect(() => {
    initOnboarding();
  }, []);

  useEffect(() => {
    const key = STEPS[currentStep]?.key;
    if (key && !loading) {
      logOnboardingEvent('step_viewed', key);
    }
  }, [currentStep, loading]);

  const initOnboarding = async () => {
    try {
      setLoading(true);
      
      // Load profile data
      const profRes = await brain.get_user_profile();
      const prof = await profRes.json();
      setProfileDraft({
        full_name: prof.full_name || undefined,
        phone: prof.phone || undefined,
        street_address: prof.street_address || undefined,
        city: prof.city || undefined,
        state_province: prof.state_province || undefined,
        postal_code: prof.postal_code || undefined,
        country: prof.country || 'Lesotho',
        date_of_birth: prof.date_of_birth || undefined,
        nationality: prof.nationality || 'Lesotho',
        id_type: prof.id_type || undefined,
        id_number: prof.id_number || undefined,
        employer: prof.employer || undefined,
        occupation: prof.occupation || undefined,
      });

      // Load status and checklist
      const [stRes, clRes, dsRes] = await Promise.all([
        brain.get_onboarding_status(),
        brain.get_checklist({}),
        brain.get_my_document_status(),
      ]);
      setStatus(await stRes.json());
      setDocChecklist(await clRes.json());
      setDocStatus(await dsRes.json());

      await logOnboardingEvent('modal_opened', STEPS[0]?.key);
    } catch (e) {
      console.error('Failed to init onboarding:', e);
      toast.error('Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (partial: Partial<UserProfileUpdate>) => {
    setProfileDraft(prev => ({ ...prev, ...partial }));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await brain.update_user_profile(profileDraft);
      await logOnboardingEvent('save_success', STEPS[currentStep]?.key);
      toast.success('Progress saved');
      return true;
    } catch (e: any) {
      console.error('Failed to save profile:', e);
      toast.error('Failed to save changes. Please try again.');
      await logOnboardingEvent('save_error', STEPS[currentStep]?.key, { error: String(e?.message || e) });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    // Save current step data before proceeding
    const saved = await saveProfile();
    if (!saved) return;
    
    if (currentStep < STEPS.length - 1) {
      await logOnboardingEvent('step_next', STEPS[currentStep]?.key);
      setCurrentStep(s => s + 1);
    } else {
      // Last step - finish onboarding
      handleFinish();
    }
  };

  const handlePrev = async () => {
    await logOnboardingEvent('step_prev', STEPS[currentStep]?.key);
    setCurrentStep(s => Math.max(0, s - 1));
  };

  const handleSkip = async () => {
    await logOnboardingEvent('onboarding_skipped', STEPS[currentStep]?.key);
    toast.info('You can complete your profile anytime from the Board Portal');
    navigate('/');
  };

  const handleFinish = async () => {
    const saved = await saveProfile();
    if (!saved) return;

    try {
      const res = await brain.get_onboarding_status();
      const data = await res.json();
      setStatus(data);
      
      await logOnboardingEvent('flow_completed', STEPS[currentStep]?.key);
      toast.success('Profile updated successfully!');
      navigate('/board-portal');
    } catch (e) {
      console.error(e);
      toast.error('Failed to complete onboarding');
    }
  };

  // Validation flags
  const canIdentity = canProceedIdentity(profileDraft);
  const canContact = canProceedContact(profileDraft);
  const canKyc = canProceedKyc(profileDraft);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Board Member Profile</h1>
              <p className="text-sm text-gray-600 mt-1">
                Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{Math.round(completion)}%</div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>
          <Progress value={Math.max(completion, stepPercent)} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-32 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Current Step Content */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            {/* Identity Step */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{STEPS[0].title}</h2>
                  <p className="text-gray-600">{STEPS[0].description}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">ID Type *</Label>
                    <Select
                      value={(profileDraft.id_type as string) || ''}
                      onValueChange={(value) => updateDraft({ id_type: value })}
                    >
                      <SelectTrigger className="mt-2 text-lg p-6">
                        <SelectValue placeholder="Select your ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ID_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-base font-medium">ID Number *</Label>
                    <Input
                      placeholder="Enter your ID number"
                      value={(profileDraft.id_number as string) || ''}
                      onChange={(e) => updateDraft({ id_number: e.target.value })}
                      className="mt-2 text-lg p-6"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium">Full Legal Name *</Label>
                    <Input
                      placeholder="Enter your full legal name"
                      value={(profileDraft.full_name as string) || ''}
                      onChange={(e) => updateDraft({ full_name: e.target.value })}
                      className="mt-2 text-lg p-6"
                    />
                  </div>
                </div>

                {!canIdentity && (
                  <Alert className="mt-6">
                    <AlertDescription>
                      Please fill in all required fields to continue.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Contact Step */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{STEPS[1].title}</h2>
                  <p className="text-gray-600">{STEPS[1].description}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Phone Number *</Label>
                    <Input
                      placeholder="e.g., +266 5xxxxxxx"
                      value={(profileDraft.phone as string) || ''}
                      onChange={(e) => updateDraft({ phone: e.target.value })}
                      className="mt-2 text-lg p-6"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium">Street Address *</Label>
                    <Input
                      placeholder="Street and number"
                      value={(profileDraft.street_address as string) || ''}
                      onChange={(e) => updateDraft({ street_address: e.target.value })}
                      className="mt-2 text-lg p-6"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-base font-medium">City *</Label>
                      <Input
                        placeholder="City/Town"
                        value={(profileDraft.city as string) || ''}
                        onChange={(e) => updateDraft({ city: e.target.value })}
                        className="mt-2 text-lg p-6"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-medium">Postal Code</Label>
                      <Input
                        placeholder="Postal code"
                        value={(profileDraft.postal_code as string) || ''}
                        onChange={(e) => updateDraft({ postal_code: e.target.value })}
                        className="mt-2 text-lg p-6"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Country *</Label>
                    <Input
                      value={(profileDraft.country as string) || 'Lesotho'}
                      onChange={(e) => updateDraft({ country: e.target.value })}
                      className="mt-2 text-lg p-6"
                    />
                  </div>
                </div>

                {!canContact && (
                  <Alert className="mt-6">
                    <AlertDescription>
                      Please provide a valid phone number, address, city and country.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* KYC Step */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{STEPS[2].title}</h2>
                  <p className="text-gray-600">{STEPS[2].description}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Date of Birth *</Label>
                    <Input
                      type="date"
                      value={(profileDraft.date_of_birth as string) || ''}
                      onChange={(e) => updateDraft({ date_of_birth: e.target.value })}
                      className="mt-2 text-lg p-6"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium">Nationality *</Label>
                    <Input
                      value={(profileDraft.nationality as string) || 'Lesotho'}
                      onChange={(e) => updateDraft({ nationality: e.target.value })}
                      className="mt-2 text-lg p-6"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium">Occupation</Label>
                    <Input
                      placeholder="Your current occupation"
                      value={(profileDraft.occupation as string) || ''}
                      onChange={(e) => updateDraft({ occupation: e.target.value })}
                      className="mt-2 text-lg p-6"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-medium">Employer</Label>
                    <Input
                      placeholder="Your current employer"
                      value={(profileDraft.employer as string) || ''}
                      onChange={(e) => updateDraft({ employer: e.target.value })}
                      className="mt-2 text-lg p-6"
                    />
                  </div>
                </div>

                {!canKyc && (
                  <Alert className="mt-6">
                    <AlertDescription>
                      Please provide your date of birth and nationality.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0 || saving}
              size="lg"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Previous
            </Button>

            <div className="text-sm text-gray-500">
              {currentStep + 1} / {STEPS.length}
            </div>

            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={saving}
              size="lg"
            >
              <X className="h-5 w-5 mr-2" />
              Skip for Now
            </Button>

            <Button
              onClick={handleNext}
              disabled={
                saving ||
                (currentStep === 0 && !canIdentity) ||
                (currentStep === 1 && !canContact) ||
                (currentStep === 2 && !canKyc)
              }
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : currentStep === STEPS.length - 1 ? (
                <>
                  Complete
                  <CheckCircle2 className="h-5 w-5 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
