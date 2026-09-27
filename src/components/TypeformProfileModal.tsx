import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowRight, ArrowLeft, Loader2, ShieldCheck, CheckCircle2, Sparkles, Check } from 'lucide-react';
import { apiClient } from 'app';
import { UserRegistrationRequest } from 'types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLoadScript } from '@react-google-maps/api';
import { showSuccessToast, showErrorToast, showWarningToast } from 'utils/errorHandling';
import Confetti from 'react-confetti';
import { useWindowSize } from '@uidotdev/usehooks';

const GOOGLE_LIBRARIES: ('places')[] = ['places'];

// Helper functions for text formatting
const toTitleCase = (str: string): string => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const toUpperCase = (str: string): string => {
  return str.toUpperCase();
};

interface TypeformProfileModalProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
  userDisplayName?: string;
  userRoles?: string[];
}

export function TypeformProfileModal({ 
  open, 
  onClose, 
  userEmail, 
  userDisplayName,
  userRoles = [] 
}: TypeformProfileModalProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserRegistrationRequest>>({
    email: userEmail,
    full_name: userDisplayName || '',
    account_type: 'personal', // Set default account type
    country: 'Lesotho', // Set default country
    nationality: 'Lesotho', // Set default nationality
  });

  // Determine total steps based on roles
  const isBoardMember = userRoles.includes('board_member') || userRoles.includes('investor');
  const isBusinessAccount = formData.account_type === 'business';
  
  // Dynamic step calculation
  const getTotalSteps = () => {
    let steps = 4; // Basic: name, contact, id, address
    if (isBoardMember) steps += 1; // Professional info (step 5)
    if (isBusinessAccount) steps += 1; // Business info (step 5 or 6)
    steps += 1; // Thank you step (final)
    return steps;
  };

  const totalSteps = getTotalSteps();
  const progress = (currentStep / totalSteps) * 100;

  // Google Places
  const { isLoaded: mapsLoaded } = useLoadScript({
    googleMapsApiKey: 'AIzaSyAe9H2FqLSLqF7PQDFz4fkgP9kNjQqZwXo',
    libraries: GOOGLE_LIBRARIES,
  });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // OTP states
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingMobile, setVerifyingMobile] = useState(false);

  // SA ID validation
  const [saIdError, setSaIdError] = useState('');

  // Loading
  const [loading, setLoading] = useState(false);

  // IP detection state
  const [ipDetectionDone, setIpDetectionDone] = useState(false);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const { width, height } = useWindowSize();

  // Auto-focus input when step changes
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentStep, open]);

  // Auto-detect country from IP when modal opens
  useEffect(() => {
    const detectCountry = async () => {
      // Only run once when modal opens and if country is not already set
      if (!open || ipDetectionDone || formData.country) return;

      try {
        console.log('Detecting country from IP...');
        // Pass empty string - backend will detect IP from request
        const response = await apiClient.lookup_ip({ ip_address: "" });
        const data: GeolocationResponse = await response.json();
        
        if (data.country_code) {
          // Try to map country code to country name
          const country = getCountryByCode(data.country_code);
          if (country) {
            console.log(`Country detected: ${country.name} (${data.country_code})`);
            setFormData(prev => ({
              ...prev,
              country: country.name,
              nationality: country.name,
            }));
          } else {
            // Fallback to Lesotho if country code not found in our list
            console.log(`Country code ${data.country_code} not in list, defaulting to Lesotho`);
            setFormData(prev => ({
              ...prev,
              country: 'Lesotho',
              nationality: 'Lesotho',
            }));
          }
        } else {
          // Fallback to Lesotho if no country code returned
          console.log('No country code returned, defaulting to Lesotho');
          setFormData(prev => ({
            ...prev,
            country: 'Lesotho',
            nationality: 'Lesotho',
          }));
        }
      } catch (error) {
        console.warn('IP detection failed, defaulting to Lesotho:', error);
        // Graceful fallback to Lesotho on any error
        setFormData(prev => ({
          ...prev,
          country: 'Lesotho',
          nationality: 'Lesotho',
        }));
      } finally {
        setIpDetectionDone(true);
      }
    };

    detectCountry();
  }, [open, ipDetectionDone, formData.country]);

  // Handle SA ID validation
  const handleIdNumberChange = (value: string) => {
    setFormData(prev => ({ ...prev, id_number: value }));
    setSaIdError('');

    if (formData.country === 'South Africa' && value.length === 13) {
      const validation = validateSAId(value);

      if (!validation.isValid) {
        setSaIdError(validation.error || 'Invalid SA ID number');
      } else {
        setFormData(prev => ({
          ...prev,
          date_of_birth: validation.dateOfBirth as any,
          citizenship_status: validation.citizenshipStatus,
        }));
        toast.success('✓ ID validated! Date of birth auto-filled.');
      }
    }
  };

  // Handle Google Places autocomplete
  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.address_components) {
        let street = '';
        let city = '';
        let state = '';
        let postal = '';
        let country = '';

        place.address_components.forEach(component => {
          const types = component.types;
          if (types.includes('street_number') || types.includes('route')) {
            street += component.long_name + ' ';
          }
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
          }
          if (types.includes('postal_code')) {
            postal = component.long_name;
          }
          if (types.includes('country')) {
            country = component.long_name;
          }
        });

        setFormData(prev => ({
          ...prev,
          street_address: street.trim() || prev.street_address,
          city: city || prev.city,
          state_province: state || prev.state_province,
          postal_code: postal || prev.postal_code,
          country: country || prev.country,
        }));

        toast.success('✓ Address auto-filled!');
      }
    }
  };

  // Send OTP
  const sendEmailOtp = async () => {
    try {
      await apiClient.send_otp({ email: formData.email!, phone: null });
      setEmailOtpSent(true);
      showSuccessToast('Verification code sent to your email');
    } catch (error) {
      showErrorToast(error, 'Unable to send verification code. Please try again.', 'send');
    }
  };

  const sendMobileOtp = async () => {
    try {
      await apiClient.send_otp({ email: null, phone: formData.phone! });
      setMobileOtpSent(true);
      showSuccessToast('Verification code sent to your mobile');
    } catch (error) {
      showErrorToast(error, 'Unable to send verification code. Please try again.', 'send');
    }
  };

  // Verify OTP
  const verifyEmailOtp = async () => {
    setVerifyingEmail(true);
    try {
      const response = await apiClient.verify_otp({ email: formData.email!, phone: null, code: emailOtp });
      const result = await response.json();
      if (result.verified) {
        setEmailVerified(true);
        showSuccessToast('Email verified successfully!');
      } else {
        showWarningToast('The code you entered is incorrect. Please try again.');
      }
    } catch (error) {
      showErrorToast(error, 'Verification failed. Please check the code and try again.', 'verify');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const verifyMobileOtp = async () => {
    setVerifyingMobile(true);
    try {
      const response = await apiClient.verify_otp({ email: null, phone: formData.phone!, code: mobileOtp });
      const result = await response.json();
      if (result.verified) {
        setMobileVerified(true);
        showSuccessToast('Mobile number verified successfully!');
      } else {
        showWarningToast('The code you entered is incorrect. Please try again.');
      }
    } catch (error) {
      showErrorToast(error, 'Verification failed. Please check the code and try again.', 'verify');
    } finally {
      setVerifyingMobile(false);
    }
  };

  // Navigate steps
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle complete later
  const handleCompleteLater = async () => {
    try {
      await apiClient.dismiss_profile_completion();
      localStorage.setItem('profile_dismissed_session', Date.now().toString());
      onClose();
      toast.info('You can complete your profile anytime from settings');
    } catch (error) {
      console.error('Failed to dismiss:', error);
      onClose();
    }
  };

  // Submit profile
  const handleSubmit = async () => {
    console.log('🚀 Starting registration submission...');
    console.log('📋 Form data:', JSON.stringify(formData, null, 2));
    
    setLoading(true);
    try {
      console.log('📡 Calling register_user API...');
      const response = await apiClient.register_user(formData);
      console.log('✅ Registration API response received:', response.status);
      
      const result = await response.json();
      console.log('✅ Registration successful:', result);
      
      setShowCelebration(true);
      // Auto-close and refresh after 5 seconds
      setTimeout(() => {
        console.log('🔄 Redirecting and reloading...');
        onClose();
        window.location.reload();
      }, 5000);
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        status: error?.status,
        data: error?.data
      });
      showErrorToast(error, 'Unable to complete your profile. Please try again or contact support.');
      setLoading(false);
    }
  };

  // Validation for each step
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.full_name && formData.full_name.length > 0;
      case 2:
        return formData.email && formData.phone;
      case 3:
        return formData.id_number && !saIdError && formData.country;
      case 4:
        return formData.street_address && formData.city;
      case 5:
        if (isBoardMember) return formData.occupation;
        if (isBusinessAccount) return formData.business_name && formData.company_registration_number;
        return true; // If neither, proceed to thank you
      case 6:
        if (isBoardMember && isBusinessAccount) return formData.business_name && formData.company_registration_number;
        return true; // Thank you step if only one condition
      case 7:
        return true; // Thank you step when both conditions
      default:
        return true;
    }
  };

  // Render current step
  const renderStep = () => {
    const isSouthAfrica = formData.country === 'South Africa';
    
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                What's your full name?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                This should match your official identification
              </p>
            </div>
            <div className="space-y-2">
              <Input
                ref={inputRef}
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => {
                  const value = toTitleCase(e.target.value);
                  setFormData(prev => ({ ...prev, full_name: value }));
                }}
                placeholder="e.g., John Doe"
                className="h-12 text-lg"
                autoFocus
              />
            </div>
            <div className="space-y-4">
              <Label>Account Type</Label>
              <RadioGroup
                value={formData.account_type || 'personal'}
                onValueChange={(value: 'personal' | 'business') => 
                  setFormData(prev => ({ ...prev, account_type: value }))
                }
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <RadioGroupItem value="personal" id="personal" />
                  <Label htmlFor="personal" className="cursor-pointer flex-1">
                    Personal Account
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <RadioGroupItem value="business" id="business" />
                  <Label htmlFor="business" className="cursor-pointer flex-1">
                    Business Account
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                How can we reach you?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                We'll use these for important account updates
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    disabled
                    className="flex-1"
                  />
                  {emailVerified ? (
                    <Button disabled variant="outline" className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </Button>
                  ) : emailOtpSent ? (
                    <div className="flex gap-1">
                      <Input
                        type="text"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        placeholder="Code"
                        className="w-20"
                      />
                      <Button onClick={verifyEmailOtp} disabled={verifyingEmail} size="sm">
                        {verifyingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={sendEmailOtp} variant="outline" size="sm">
                      Verify
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+27 XX XXX XXXX"
                    className="flex-1"
                  />
                  {mobileVerified ? (
                    <Button disabled variant="outline" className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </Button>
                  ) : mobileOtpSent ? (
                    <div className="flex gap-1">
                      <Input
                        type="text"
                        value={mobileOtp}
                        onChange={(e) => setMobileOtp(e.target.value)}
                        placeholder="Code"
                        className="w-20"
                      />
                      <Button onClick={verifyMobileOtp} disabled={verifyingMobile} size="sm">
                        {verifyingMobile ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={sendMobileOtp} 
                      variant="outline" 
                      size="sm"
                      disabled={!formData.phone}
                    >
                      Verify
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Identification details
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                We need this to verify your identity
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Country/Nationality</Label>
                <Input
                  type="text"
                  value={formData.country || ''}
                  onChange={(e) => {
                    const value = toTitleCase(e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      country: value,
                      nationality: value 
                    }));
                  }}
                  placeholder="e.g., South Africa, Lesotho, Botswana"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>{isSouthAfrica ? 'SA ID Number' : 'Passport Number'}</Label>
                <Input
                  ref={inputRef}
                  type="text"
                  value={formData.id_number || ''}
                  onChange={(e) => {
                    const value = toUpperCase(e.target.value);
                    setFormData(prev => ({ ...prev, id_number: value }));
                    
                    if (isSouthAfrica && value.length === 13) {
                      if (!/^\d{13}$/.test(value)) {
                        setSaIdError('SA ID must be 13 digits');
                      } else {
                        setSaIdError('');
                      }
                    } else if (isSouthAfrica && value.length > 0 && value.length !== 13) {
                      setSaIdError('SA ID must be exactly 13 digits');
                    } else {
                      setSaIdError('');
                    }
                  }}
                  placeholder={isSouthAfrica ? "13-digit ID number" : "Passport number"}
                  className="h-12"
                />
                {saIdError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{saIdError}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Where do you live?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Your residential address
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                {mapsLoaded && formData.country === 'South Africa' ? (
                  <Input
                    ref={inputRef}
                    type="text"
                    value={formData.street_address || ''}
                    onChange={(e) => {
                      const value = toTitleCase(e.target.value);
                      setFormData(prev => ({ ...prev, street_address: value }));
                    }}
                    placeholder="Street address"
                    className="h-12"
                    id="street-address-autocomplete"
                  />
                ) : (
                  <Input
                    ref={inputRef}
                    type="text"
                    value={formData.street_address || ''}
                    onChange={(e) => {
                      const value = toTitleCase(e.target.value);
                      setFormData(prev => ({ ...prev, street_address: value }));
                    }}
                    placeholder="Street address"
                    className="h-12"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => {
                      const value = toTitleCase(e.target.value);
                      setFormData(prev => ({ ...prev, city: value }));
                    }}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input
                    type="text"
                    value={formData.postal_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="Postal code"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>State/Province (Optional)</Label>
                <Input
                  type="text"
                  value={formData.state_province || ''}
                  onChange={(e) => {
                    const value = toTitleCase(e.target.value);
                    setFormData(prev => ({ ...prev, state_province: value }));
                  }}
                  placeholder="State or province"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        if (isBoardMember) {
          return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Professional information
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Help us understand your background
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Occupation</Label>
                  <Input
                    ref={inputRef}
                    type="text"
                    value={formData.occupation || ''}
                    onChange={(e) => {
                      const value = toTitleCase(e.target.value);
                      setFormData(prev => ({ ...prev, occupation: value }));
                    }}
                    placeholder="Your current occupation"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employer (Optional)</Label>
                  <Input
                    type="text"
                    value={formData.employer || ''}
                    onChange={(e) => {
                      const value = toTitleCase(e.target.value);
                      setFormData(prev => ({ ...prev, employer: value }));
                    }}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn Profile (Optional)</Label>
                  <Input
                    type="url"
                    value={formData.linkedin_profile || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedin_profile: e.target.value }))}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
              </div>
            </div>
          );
        } else if (isBusinessAccount) {
          return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Business details
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Required information for business accounts
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Business Name <span className="text-red-500">*</span></Label>
                  <Input
                    ref={inputRef}
                    type="text"
                    value={formData.business_name || ''}
                    onChange={(e) => {
                      const value = toTitleCase(e.target.value);
                      setFormData(prev => ({ ...prev, business_name: value }));
                    }}
                    placeholder="Enter your business name"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Registration Number <span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    value={formData.company_registration_number || ''}
                    onChange={(e) => {
                      const value = toUpperCase(e.target.value);
                      setFormData(prev => ({ ...prev, company_registration_number: value }));
                    }}
                    placeholder="Enter company registration number"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax ID (Optional)</Label>
                  <Input
                    type="text"
                    value={formData.tax_id || ''}
                    onChange={(e) => {
                      const value = toUpperCase(e.target.value);
                      setFormData(prev => ({ ...prev, tax_id: value }));
                    }}
                    placeholder="Enter tax ID if available"
                  />
                </div>
              </div>
            </div>
          );
        } else {
          // No board member, no business - go to thank you
          return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Thank you! 🎉
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  Your profile is complete. You can now access all features of Citizen Hub.
                </p>
              </div>
            </div>
          );
        }

      case 6:
        if (isBoardMember && isBusinessAccount) {
          return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Business details
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Required for business accounts
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tax ID / Business Registration Number</Label>
                  <Input
                    ref={inputRef}
                    type="text"
                    value={formData.tax_id || ''}
                    onChange={(e) => {
                      const value = toUpperCase(e.target.value);
                      setFormData(prev => ({ ...prev, tax_id: value }));
                    }}
                    placeholder="Enter tax/business ID"
                    className="h-12"
                  />
                </div>
              </div>
            </div>
          );
        } else {
          // Thank you step for single condition (board member OR business)
          return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Thank you! 🎉
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  Your profile is complete. You can now access all features of Citizen Hub.
                </p>
              </div>
            </div>
          );
        }

      case 7:
        // Thank you step for both conditions (board member AND business)
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Thank you! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Your profile is complete. You can now access all features of Citizen Hub.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Celebration Screen */}
        {showCelebration ? (
          <div className="relative min-h-[600px] flex flex-col items-center justify-center p-12 bg-gradient-to-br from-blue-50 to-green-50">
            <Confetti
              width={width || 800}
              height={height || 600}
              recycle={true}
              numberOfPieces={200}
              gravity={0.2}
            />
            <div className="relative z-10 text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-12 h-12 text-green-600" />
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl font-bold text-gray-900">
                  Welcome to Citizen Bank!
                </h2>
                <p className="text-xl text-gray-600">
                  Thank you for completing your profile
                </p>
              </div>
              <div className="pt-4 text-gray-500">
                <p>Your account is being set up...</p>
                <p className="text-sm mt-2">You'll be redirected shortly</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Hidden title for accessibility */}
            <DialogTitle className="sr-only">Complete Your Profile</DialogTitle>
            <DialogDescription className="sr-only">
              Complete your profile information step by step. Step {currentStep} of {totalSteps}.
            </DialogDescription>

            <div className="space-y-6 py-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Step {currentStep} of {totalSteps}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-100">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Step Content */}
              <div className="min-h-[300px]">
                {renderStep()}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button
                  variant="ghost"
                  onClick={handleCompleteLater}
                  className="text-gray-600 dark:text-gray-400"
                >
                  Complete Later
                </Button>

                <div className="flex gap-2">
                  {currentStep > 1 && (
                    <Button
                      variant="outline"
                      onClick={prevStep}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}

                  {currentStep < totalSteps ? (
                    <Button
                      onClick={nextStep}
                      disabled={!canProceed()}
                      className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={loading || !canProceed()}
                      className="w-full bg-gradient-to-r from-orange-600 to-purple-700 hover:from-orange-700 hover:to-purple-800 text-white"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Completing Registration...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          Complete Registration
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
