import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserGuardContext } from 'app/auth';
import { useUserProfile } from 'utils/userProfile';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { apiClient } from "app";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Loader2, ShieldCheck, Check, ArrowLeft } from 'lucide-react';
import { validateSAId } from 'utils/saIdValidation';
import type { UserRegistrationRequest } from 'types';
import Confetti from 'react-confetti';
import { useWindowSize } from '@uidotdev/usehooks';

const libraries: ('places')[] = ['places'];

export default function CompleteProfile() {
  const { user } = useUserGuardContext();
  const { profile, fetchProfile } = useUserProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { width, height } = useWindowSize();
  const isEditMode = searchParams.get('edit') === 'true';
  const profileLoaded = useRef(false);
  
  // Google Places Autocomplete
  const { isLoaded: mapsLoaded } = useLoadScript({
    googleMapsApiKey: 'AIzaSyAe9H2FqLSLqF7PQDFz4fkgP9kNjQqZwXo',
    libraries,
  });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  // OTP states
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtpCode, setMobileOtpCode] = useState('');
  const [mobileVerifying, setMobileVerifying] = useState(false);
  
  // SA ID validation state
  const [saIdError, setSaIdError] = useState('');
  
  const [formData, setFormData] = useState<Partial<UserRegistrationRequest>>({
    email: user.primaryEmail || '',
    password: '',
    full_name: user.displayName || '',
    phone: '',
    id_number: '',
    account_type: 'personal',
    street_address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'Lesotho',
    nationality: 'Lesotho',
    occupation: '',
    employer: '',
    linkedin_profile: '',
    tax_id: '',
  });

  // Load existing profile data
  useEffect(() => {
    fetchProfile();
  }, []);

  // Smart redirect
  useEffect(() => {
    if (profile && !isEditMode) {
      navigate('/customer-portal');
    }
  }, [profile, isEditMode, navigate]);

  // Populate form with existing profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        email: profile.email || user.primaryEmail || '',
        password: '',
        full_name: profile.full_name || user.displayName || '',
        phone: profile.phone || '',
        id_number: profile.id_number || '',
        account_type: profile.account_type || 'personal',
        street_address: profile.street_address || '',
        city: profile.city || '',
        state_province: profile.state_province || '',
        postal_code: profile.postal_code || '',
        country: profile.country || 'Lesotho',
        nationality: profile.nationality || 'Lesotho',
        occupation: profile.occupation || '',
        employer: profile.employer || '',
        linkedin_profile: profile.linkedin_profile || '',
        tax_id: profile.tax_id || '',
        date_of_birth: profile.date_of_birth || undefined,
      });
      profileLoaded.current = true;
    }
  }, [profile, user]);

  // Handle SA ID validation and auto-population
  const handleIdNumberChange = (value: string) => {
    setFormData({ ...formData, id_number: value });
    setSaIdError('');
    
    // Only validate if country is South Africa
    if (formData.country?.toLowerCase() === 'south africa' && value.length === 13) {
      const validation = validateSAId(value);
      
      if (!validation.isValid) {
        setSaIdError(validation.error || 'Invalid SA ID number');
      } else {
        // Auto-populate fields
        setFormData(prev => ({
          ...prev,
          date_of_birth: validation.dateOfBirth as any,
          // Note: gender and citizenship_status are set in the backend based on validation
        }));
        toast.success('ID Validated', {
          description: `Extracted: ${validation.gender}, ${validation.citizenship === 'citizen' ? 'SA Citizen' : 'Permanent Resident'}`,
        });
      }
    }
  };

  // Send Email OTP
  const handleSendEmailOtp = async () => {
    try {
      setEmailVerifying(true);
      const response = await apiClient.send_otp({ contact_type: 'email', contact_value: formData.email! });
      const result = await response.json();
      
      if (result.success) {
        setEmailOtpSent(true);
        toast.success('OTP Sent', { description: result.message });
      } else {
        toast.error('Failed to send OTP', { description: result.message });
      }
    } catch (error: any) {
      toast.error('Error', { description: error.message || 'Failed to send OTP' });
    } finally {
      setEmailVerifying(false);
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    try {
      setEmailVerifying(true);
      const response = await apiClient.verify_otp({ 
        contact_type: 'email', 
        contact_value: formData.email!, 
        code: emailOtpCode 
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success('Email Verified!', { description: result.message });
        setEmailOtpSent(false);
        setEmailOtpCode('');
        await fetchProfile();
      } else {
        toast.error('Verification Failed', { description: result.message });
      }
    } catch (error: any) {
      toast.error('Error', { description: error.message || 'Failed to verify OTP' });
    } finally {
      setEmailVerifying(false);
    }
  };

  // Send Mobile OTP
  const handleSendMobileOtp = async () => {
    if (!formData.phone) {
      toast.error('Phone number required');
      return;
    }
    
    try {
      setMobileVerifying(true);
      const response = await apiClient.send_otp({ contact_type: 'mobile', contact_value: formData.phone });
      const result = await response.json();
      
      if (result.success) {
        setMobileOtpSent(true);
        toast.success('OTP Sent', { description: result.message });
      } else {
        toast.error('Failed to send OTP', { description: result.message });
      }
    } catch (error: any) {
      toast.error('Error', { description: error.message || 'Failed to send OTP' });
    } finally {
      setMobileVerifying(false);
    }
  };

  // Verify Mobile OTP
  const handleVerifyMobileOtp = async () => {
    try {
      setMobileVerifying(true);
      const response = await apiClient.verify_otp({ 
        contact_type: 'mobile', 
        contact_value: formData.phone!, 
        code: mobileOtpCode 
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success('Mobile Verified!', { description: result.message });
        setMobileOtpSent(false);
        setMobileOtpCode('');
        await fetchProfile();
      } else {
        toast.error('Verification Failed', { description: result.message });
      }
    } catch (error: any) {
      toast.error('Error', { description: error.message || 'Failed to verify OTP' });
    } finally {
      setMobileVerifying(false);
    }
  };

  // Handle place selection from Google Places Autocomplete
  const handlePlaceSelect = () => {
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
          
          if (types.includes('street_number')) {
            street = component.long_name + ' ';
          }
          if (types.includes('route')) {
            street += component.long_name;
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
          street_address: street || prev.street_address,
          city: city || prev.city,
          state_province: state || prev.state_province,
          postal_code: postal || prev.postal_code,
          country: country || prev.country,
        }));
        
        toast.success('Address Auto-filled', {
          description: 'Address fields have been populated from Google Places',
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Starting profile registration submission...');
    console.log('📋 Form data:', JSON.stringify(formData, null, 2));
    console.log('📝 Edit mode:', isEditMode);
    console.log('👤 Has existing profile:', !!profile);
    
    if (!formData.country || !formData.nationality) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // For new users (no profile), use register_user
      // For existing users (edit mode), use update_user_profile
      if (!profile || !isEditMode) {
        console.log('📡 Calling register_user API for new user...');
        const response = await apiClient.register_user({
          email: formData.email!,
          full_name: formData.full_name!,
          phone: formData.phone!,
          id_number: formData.id_number!,
          account_type: formData.account_type!,
          street_address: formData.street_address,
          city: formData.city,
          state_province: formData.state_province,
          postal_code: formData.postal_code,
          country: formData.country || 'Lesotho',
          date_of_birth: formData.date_of_birth,
          nationality: formData.nationality || 'Lesotho',
          occupation: formData.occupation,
          employer: formData.employer,
          linkedin_profile: formData.linkedin_profile,
          tax_id: formData.tax_id,
        });
        
        console.log('✅ Registration API response received:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('❌ Registration API error:', errorData);
          throw new Error(errorData?.detail || 'Failed to complete registration');
        }

        const result = await response.json();
        console.log('✅ Registration completed successfully:', result);
        
        toast.success('Profile completed successfully!', {
          description: 'Welcome to Citizen Hub'
        });
      } else {
        console.log('📡 Calling update_user_profile API for existing user...');
        const response = await apiClient.update_user_profile({
          full_name: formData.full_name,
          phone: formData.phone,
          account_type: formData.account_type as 'personal' | 'business',
          street_address: formData.street_address,
          city: formData.city,
          state_province: formData.state_province,
          postal_code: formData.postal_code,
          country: formData.country,
          date_of_birth: formData.date_of_birth,
          nationality: formData.nationality,
          occupation: formData.occupation,
          employer: formData.employer,
          linkedin_profile: formData.linkedin_profile,
          tax_id: formData.tax_id,
          gender: formData.gender,
          citizenship_status: formData.citizenship_status,
        });

        console.log('✅ Update API response received:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('❌ Update API error:', errorData);
          throw new Error(errorData?.detail || 'Failed to update profile');
        }

        const result = await response.json();
        console.log('✅ Profile updated successfully:', result);
        
        toast.success('Profile updated successfully!', {
          description: 'Your changes have been saved'
        });
      }

      // Refresh profile data
      await fetchProfile();

      // Clear notification cache to refresh completion status
      if (user) {
        clearNotificationCache(user.id);
      }

      // Show confetti celebration
      setShowCelebration(true);

      // Navigate to customer portal after celebration (5 seconds like TypeformProfileModal)
      setTimeout(() => {
        console.log('🔄 Redirecting to customer portal...');
        navigate('/customer-portal');
      }, 5000);
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        status: error?.status,
        data: error?.data
      });
      toast.error('Failed to complete profile', {
        description: error.message || 'Please try again or contact support'
      });
      setIsSubmitting(false);
    }
  };

  const isSouthAfrica = formData.country?.toLowerCase() === 'south africa';

  // Show celebration screen
  if (showCelebration) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <Confetti
          width={width || 0}
          height={height || 0}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
        />
        <div className="relative z-10 text-center space-y-6 px-4">
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
            <p>Your account is ready</p>
            <p className="text-sm mt-2">Redirecting to your portal...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Button
        type="button"
        size="sm"
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Provide your information to access banking services and board membership opportunities</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Basic Information</CardTitle>
              <CardDescription className="text-sm">Your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                {/* Email with OTP Verification */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-muted flex-1"
                    />
                    {profile?.email_verified ? (
                      <Badge variant="default" className="bg-green-600 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSendEmailOtp}
                        disabled={emailVerifying || emailOtpSent}
                      >
                        {emailVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                      </Button>
                    )}
                  </div>
                  {emailOtpSent && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value)}
                        maxLength={6}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleVerifyEmailOtp}
                        disabled={emailVerifying || emailOtpCode.length !== 6}
                      >
                        Submit
                      </Button>
                    </div>
                  )}
                </div>

                {/* Phone with OTP Verification */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+266 XXXX XXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="flex-1"
                    />
                    {profile?.mobile_verified ? (
                      <Badge variant="default" className="bg-green-600 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSendMobileOtp}
                        disabled={mobileVerifying || mobileOtpSent || !formData.phone}
                      >
                        {mobileVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                      </Button>
                    )}
                  </div>
                  {mobileOtpSent && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={mobileOtpCode}
                        onChange={(e) => setMobileOtpCode(e.target.value)}
                        maxLength={6}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleVerifyMobileOtp}
                        disabled={mobileVerifying || mobileOtpCode.length !== 6}
                      >
                        Submit
                      </Button>
                    </div>
                  )}
                </div>

                {/* ID or Passport Number */}
                <div className="space-y-2">
                  <Label htmlFor="id_number">
                    {isSouthAfrica ? 'South African ID Number *' : 'National ID or Passport Number *'}
                  </Label>
                  <Input
                    id="id_number"
                    type="text"
                    placeholder={isSouthAfrica ? '13-digit SA ID' : 'Enter your ID or Passport Number'}
                    value={formData.id_number}
                    onChange={(e) => handleIdNumberChange(e.target.value)}
                    required
                    className={saIdError ? 'border-red-500' : ''}
                  />
                  {saIdError && (
                    <p className="text-xs text-red-600">{saIdError}</p>
                  )}
                  {isSouthAfrica && formData.id_number && !saIdError && formData.id_number.length === 13 && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Valid SA ID - Date of birth and gender extracted
                    </p>
                  )}
                  {!isSouthAfrica && (
                    <p className="text-xs text-muted-foreground">Enter your national ID number or passport number</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth as any}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value as any })}
                    disabled={isSouthAfrica && formData.id_number?.length === 13 && !saIdError}
                  />
                  {isSouthAfrica && formData.id_number?.length === 13 && !saIdError && (
                    <p className="text-xs text-muted-foreground">Auto-populated from SA ID</p>
                  )}
                </div>

                {/* Country - Simple Text Input */}
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    type="text"
                    placeholder="e.g., Lesotho, South Africa"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                  />
                </div>

                {/* Nationality - Simple Text Input */}
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality *</Label>
                  <Input
                    id="nationality"
                    type="text"
                    placeholder="e.g., Basotho, South African"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information with Google Places */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Address Information</CardTitle>
              <CardDescription className="text-sm">Your residential address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Street Address with Google Places Autocomplete */}
                <div className="space-y-2">
                  <Label htmlFor="street_address">Street Address</Label>
                  {mapsLoaded ? (
                    <Autocomplete
                      onLoad={(autocomplete) => {
                        autocompleteRef.current = autocomplete;
                      }}
                      onPlaceChanged={handlePlaceSelect}
                    >
                      <Input
                        id="street_address"
                        type="text"
                        placeholder="Start typing to search..."
                        value={formData.street_address}
                        onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                      />
                    </Autocomplete>
                  ) : (
                    <Input
                      id="street_address"
                      type="text"
                      placeholder="123 Main Street"
                      value={formData.street_address}
                      onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                    />
                  )}
                  {mapsLoaded && (
                    <p className="text-xs text-muted-foreground">Start typing to search with Google Places</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="Maseru"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state_province">District/Province</Label>
                    <Input
                      id="state_province"
                      type="text"
                      placeholder="Maseru District"
                      value={formData.state_province}
                      onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      type="text"
                      placeholder="100"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Professional Information</CardTitle>
              <CardDescription className="text-sm">Your employment and professional details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    type="text"
                    placeholder="e.g., Financial Analyst"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employer">Employer</Label>
                  <Input
                    id="employer"
                    type="text"
                    placeholder="Company Name"
                    value={formData.employer}
                    onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="linkedin_profile">LinkedIn Profile (Optional)</Label>
                  <Input
                    id="linkedin_profile"
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={formData.linkedin_profile}
                    onChange={(e) => setFormData({ ...formData, linkedin_profile: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Useful for board membership applications</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Account Type</CardTitle>
              <CardDescription className="text-sm">Select your banking account type</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.account_type}
                onValueChange={(value) => setFormData({ ...formData, account_type: value as 'personal' | 'business' })}
              >
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="personal" id="personal" />
                  <div className="flex-1">
                    <Label htmlFor="personal" className="cursor-pointer font-medium">
                      Personal Banking
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      For individual customers and personal accounts
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="business" id="business" />
                  <div className="flex-1">
                    <Label htmlFor="business" className="cursor-pointer font-medium">
                      Business Banking
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      For businesses, organizations, and corporate accounts
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {formData.account_type === 'business' && (
                <div className="space-y-2 mt-4">
                  <Label htmlFor="tax_id">Business Tax ID / Registration Number</Label>
                  <Input
                    id="tax_id"
                    type="text"
                    placeholder="Tax ID or Business Registration Number"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              className="w-full md:w-auto bg-blue-800 hover:bg-blue-900 text-white px-8"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing Registration...
                </>
              ) : (
                'Complete Registration'
              )}
            </Button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
