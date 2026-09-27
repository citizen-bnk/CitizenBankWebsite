




















import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from 'app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Loader2, TrendingUp, CheckCircle2, AlertCircle, Calculator, FileText, CreditCard, CheckSquare, Copy, Bitcoin, Wallet, ArrowLeft, ArrowRight, Upload, Info, Pencil, Search, UserPlus } from 'lucide-react';
import type { ShareAvailability, SubscriptionRequest, UserListItem, CreateSubscriptionRequest } from 'types';
import { useCurrency } from "components/CurrencyProvider";
import { useUserGuardContext } from "app/auth";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { UnifiedIdentityForm, type IdentityFormData } from "components/UnifiedIdentityForm";
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useUserRoles } from 'utils/useUserRoles';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CryptoWallet {
  crypto_type: string;
  wallet_address: string;
  network_info: string | null;
}

export default function ShareSubscription() {
  const navigate = useNavigate();
  const { user } = useUserGuardContext();
  const { hasAnyRole, loading: rolesLoading } = useUserRoles();
  const isAdmin = hasAnyRole(['admin', 'super_admin']);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<ShareAvailability | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [trackingToken, setTrackingToken] = useState<string | null>(null);

  // Form state
  const [numShares, setNumShares] = useState<number>(100);
  const [shareInputError, setShareInputError] = useState<string>('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    id_number: '',
    tax_id: '',
    occupation: '',
    source_of_funds: '',
    investment_purpose: '',
    payment_method: 'bank-transfer' as 'bank-transfer' | 'card' | 'debit' | 'installment' | 'cryptocurrency',
    installment_plan: null as string | null,
    selected_crypto: '' as string,
    terms_accepted: false,
    privacy_accepted: false,
  });

  // Crypto payment state
  const [availableCryptos, setAvailableCryptos] = useState<{crypto_type: string, network_info: string | null}[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [cryptoWallet, setCryptoWallet] = useState<CryptoWallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Payment proof upload state
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [remindLater, setRemindLater] = useState(false);

  // Beneficiary state
  const [isForOther, setIsForOther] = useState(false);

  // Identity form state
  const [identityFormData, setIdentityFormData] = useState<IdentityFormData>({} as IdentityFormData);
  const [isIdentityFormValid, setIsIdentityFormValid] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Beneficiary toggle
  const [beneficiaryType, setBeneficiaryType] = useState<'self' | 'other'>('self');

  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [editingFields, setEditingFields] = useState({
    full_name: '',
    email: '',
    phone: '',
    id_number: ''
  });

  // User search state for admin on-behalf subscriptions
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserListItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const { formatCurrency, selectedCurrency } = useCurrency();

  // Track invitation click when page loads with invite parameter
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken) {
      setTrackingToken(inviteToken);
      console.log('📧 User arrived from invitation link:', inviteToken);
      
      // Track the click
      apiClient.track_link_click(inviteToken).catch(err => {
        console.warn('⚠️ Failed to track invitation click:', err);
        // Don't block subscription flow if tracking fails
      });
    }
  }, [searchParams]);

  const loadUserProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await apiClient.get_user_profile();
      if (response.ok) {
        const profile = await response.json();
        console.log('📋 Loaded user profile:', profile);
        
        // Pre-fill identity form data with existing profile
        setIdentityFormData({
          full_name: profile.full_name || '',
          email: profile.email || user.primaryEmail || '',
          phone: profile.phone || '',
          identity_type: profile.identity_type || 'national_id',
          id_country_of_issue: profile.id_country_of_issue || 'South Africa',
          id_number: profile.id_number || '',
          date_of_birth: profile.date_of_birth || '',
          gender: profile.gender || '',
          citizenship_status: profile.citizenship_status || '',
          street_address: profile.street_address || '',
          city: profile.city || '',
          state_province: profile.state_province || '',
          postal_code: profile.postal_code || '',
          country: profile.country || '',
          source_of_funds: profile.source_of_funds || '',
          investor_type: profile.investor_type || '',
          investment_purpose: profile.investment_purpose || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Don't block user if profile load fails - they can still fill form
    } finally {
      setProfileLoading(false);
    }
  }, [user.primaryEmail]);

  useEffect(() => {
    if (subscriptionId) {
      loadAvailableCryptos();
    }
  }, [subscriptionId]);

  useEffect(() => {
    if (beneficiaryType === 'self') {
      loadUserProfile();
    } else {
      // Clear form for beneficiary details
      setIdentityFormData({
        full_name: '',
        email: '',
        phone: '',
        identity_type: 'national_id',
        id_country_of_issue: 'South Africa',
        id_number: '',
        date_of_birth: '',
        gender: '',
        citizenship_status: '',
        street_address: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: '',
        source_of_funds: '',
        investor_type: '',
        investment_purpose: '',
      });
      setIsIdentityFormValid(false); // Reset validation
    }
  }, [beneficiaryType, loadUserProfile]);

  // Load share availability on mount
  useEffect(() => {
    console.log('Mount: calling loadShareAvailability');
    loadShareAvailability();
  }, []);

  const loadShareAvailability = async () => {
    setLoading(true);
    try {
      setError(null);
      const response = await apiClient.core_get_share_availability();
      const data = await response.json();
      setAvailability(data);
      console.log('📊 Share availability loaded:', data);
    } catch (error) {
      console.error('Failed to load availability:', error);
      setError('Unable to load share information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCryptos = async () => {
    try {
      const response = await apiClient.crypto_list_crypto_wallets();
      const data = await response.json();
      setAvailableCryptos(data.available_cryptos || []);
    } catch (error) {
      console.error('Failed to load crypto options:', error);
    }
  };

  const handleCryptoSelect = async (cryptoType: string) => {
    setSelectedCrypto(cryptoType);
    setLoadingWallet(true);
    
    try {
      const response = await apiClient.get_crypto_wallet_details({ cryptoType });
      const wallet = await response.json();
      setCryptoWallet(wallet);
    } catch (error) {
      console.error('Failed to load wallet:', error);
      toast.error('Failed to load wallet details');
      setCryptoWallet(null);
    } finally {
      setLoadingWallet(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handlePaymentProofUpload = async (file: File) => {
    if (!subscriptionId) return;

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.upload_payment_proof({ subscriptionId }, formData);
      
      if (response.ok) {
        toast.success('Payment proof uploaded successfully!');
        setProofUploaded(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Payment proof upload error:', error);
      toast.error(error.message || 'Failed to upload payment proof');
    } finally {
      setUploadingProof(false);
    }
  };

  const totalAmount = availability ? Number(availability.price_per_share) * numShares : 0;
  const sharePrice = availability ? Number(availability.price_per_share) : 0;
  const subscriptionAmount = totalAmount;
  const numberOfShares = numShares;
  const ownershipPercentage = availability && availability.total_authorized > 0
    ? (numShares / availability.total_authorized * 100).toFixed(4)
    : '0';
  const estimatedDividend = totalAmount * 0.08; // Example 8% dividend

  // Validation helper
  const validateShareInput = (shares: number): string => {
    if (!availability) return '';
    
    if (shares < availability.min_subscription) {
      const minAmount = availability.min_subscription * Number(availability.price_per_share);
      return `Minimum investment is ${availability.min_subscription} shares (${formatCurrency(minAmount)}). You need ${availability.min_subscription - shares} more shares.`;
    }
    
    if (shares > availability.max_subscription) {
      return `Maximum allowed is ${availability.max_subscription} shares per subscription.`;
    }
    
    if (shares > availability.remaining) {
      return `Only ${availability.remaining} shares remaining.`;
    }
    
    return '';
  };

  const handleBeneficiaryChange = (value: 'self' | 'other') => {
    setBeneficiaryType(value);
  };

  // Add debounced user search
  useEffect(() => {
    if (beneficiaryType === 'other' && searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        performUserSearch(searchQuery);
      }, 500); // 500ms debounce
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, beneficiaryType]);

  const performUserSearch = async (query: string) => {
    if (!isAdmin) return; // Only admins can search
    
    setSearchLoading(true);
    try {
      const response = await apiClient.search_users({ q: query, page: 1, page_size: 10 });
      const data = await response.json();
      setSearchResults(data.users || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('User search failed:', error);
      toast.error('Failed to search users');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUserSelect = async (selectedUser: UserListItem | 'new') => {
    if (selectedUser === 'new') {
      // New user - clear form
      setIsNewUser(true);
      setSelectedUser(null);
      setIdentityFormData({
        full_name: '',
        email: searchQuery.includes('@') ? searchQuery : '',
        phone: '',
        identity_type: 'national_id',
        id_country_of_issue: 'South Africa',
        id_number: '',
        date_of_birth: '',
        gender: '',
        citizenship_status: '',
        street_address: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: '',
        source_of_funds: '',
        investor_type: '',
        investment_purpose: '',
      });
      setShowSearchResults(false);
    } else {
      // Existing user - load their profile
      setIsNewUser(false);
      setSelectedUser(selectedUser);
      setProfileLoading(true);
      
      try {
        const response = await apiClient.get_user_profile_by_id({ userId: selectedUser.user_id });
        if (response.ok) {
          const profile = await response.json();
          console.log('📋 Loaded selected user profile:', profile);
          
          // Pre-fill with existing user data
          setIdentityFormData({
            full_name: profile.full_name || selectedUser.full_name || '',
            email: profile.email || selectedUser.email || '',
            phone: profile.phone || selectedUser.contact_number || '',
            identity_type: profile.identity_type || 'national_id',
            id_country_of_issue: profile.id_country_of_issue || 'South Africa',
            id_number: profile.id_number || selectedUser.id_number || '',
            date_of_birth: profile.date_of_birth || '',
            gender: profile.gender || '',
            citizenship_status: profile.citizenship_status || '',
            street_address: profile.street_address || '',
            city: profile.city || '',
            state_province: profile.state_province || '',
            postal_code: profile.postal_code || '',
            country: profile.country || '',
            source_of_funds: profile.source_of_funds || '',
            investor_type: profile.investor_type || '',
            investment_purpose: profile.investment_purpose || '',
          });
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        toast.error('Failed to load user profile');
      } finally {
        setProfileLoading(false);
        setShowSearchResults(false);
      }
    }
  };

  const handleIdentityFormChange = useCallback(
    (data: IdentityFormData, isValid: boolean) => {
      setIdentityFormData(data);
      setIsIdentityFormValid(isValid);
    },
    [],
  );

  const canProceed = () => {
    if (!availability) return false;
    
    switch (step) {
      case 1:
        return numShares >= availability.min_subscription && 
               numShares <= availability.max_subscription &&
               numShares <= availability.remaining;
      case 2:
        // Direct validation: check if required fields are filled
        return !!(identityFormData.full_name && 
                 identityFormData.email && 
                 identityFormData.phone && 
                 identityFormData.id_number &&
                 identityFormData.source_of_funds &&
                 identityFormData.investor_type);
      case 3:
        if (formData.payment_method === 'installment') {
          return formData.installment_plan !== null;
        }
        if (formData.payment_method === 'cryptocurrency') {
          return formData.selected_crypto !== '';
        }
        return true;
      case 4:
        return formData.terms_accepted && formData.privacy_accepted;
      default:
        return false;
    }
  };

  // Add debugging effect to track checkbox state changes
  useEffect(() => {
    if (step === 4) {
      console.log('🔍 Step 4 State Check:', {
        terms_accepted: formData.terms_accepted,
        privacy_accepted: formData.privacy_accepted,
        canProceed: canProceed(),
        loading
      });
    }
  }, [formData.terms_accepted, formData.privacy_accepted, step, loading]);

  const handleSubmit = useCallback(async () => {
    console.log('🔵 handleSubmit called');
    console.log('canProceed():', canProceed());
    console.log('availability:', availability);
    console.log('formData:', formData);
    console.log('identityFormData:', identityFormData);
    console.log('numShares:', numShares);
    
    if (!canProceed() || !availability) {
      console.log('❌ Submission blocked - canProceed or availability check failed');
      return;
    }

    setLoading(true);
    setSubmitError(null);
    console.log('✅ Starting subscription...');

    const executeSubscription = async (attempt = 1) => {
      try {
        // Step 1: Update user profile first (only for self subscriptions)
        if (beneficiaryType === 'self') {
          console.log('💾 [Attempt ' + attempt + '] Updating user profile with identity data...');
          await apiClient.update_user_profile({
            ...identityFormData,
            // Ensure these base fields are included, even if empty initially
            full_name: identityFormData.full_name || '',
            email: identityFormData.email || '',
            phone: identityFormData.phone || '',
            id_number: identityFormData.id_number || '',
            street_address: identityFormData.street_address || null,
            city: identityFormData.city || null,
            state_province: identityFormData.state_province || null,
            postal_code: identityFormData.postal_code || null,
            country: identityFormData.country || null,
            date_of_birth: identityFormData.date_of_birth || null,
            gender: identityFormData.gender || null,
            citizenship_status: identityFormData.citizenship_status || null,
            source_of_funds: identityFormData.source_of_funds || null,
            investor_type: identityFormData.investor_type || null,
            investment_purpose: identityFormData.investment_purpose || null,
          });
          console.log('✅ [Attempt ' + attempt + '] Profile updated successfully.');
        }

        // Step 2: Create the subscription
        let response;
        let data;
        
        if (beneficiaryType === 'other' && isAdmin) {
          // Admin creating on behalf of someone else
          console.log('👤 [Attempt ' + attempt + '] Creating subscription on behalf of user...');
          const adminRequestData: CreateSubscriptionRequest = {
            full_name: identityFormData.full_name,
            email: identityFormData.email,
            phone: identityFormData.phone,
            id_number: identityFormData.id_number,
            num_shares: numShares,
            share_class: availability.share_class || 'Class A',
            payment_method: formData.payment_method === 'installment' ? 'installment' : 'one-time',
            payment_proof_filename: null,
            admin_notes: selectedUser 
              ? `Created on behalf of existing user: ${selectedUser.full_name || selectedUser.email}`
              : 'Created on behalf of new user',
          };

          console.log('📤 [Attempt ' + attempt + '] Sending admin on-behalf request:', adminRequestData);
          response = await apiClient.create_subscription_on_behalf(adminRequestData);
        } else {
          // Regular user creating for themselves
          console.log('👤 [Attempt ' + attempt + '] Creating self-subscription...');
          const backendPaymentMethod = formData.payment_method === 'installment' ? 'installment' : 'one-time';
          const requestData: SubscriptionRequest = {
            full_name: identityFormData.full_name,
            email: identityFormData.email,
            phone: identityFormData.phone,
            id_number: identityFormData.id_number,
            num_shares: numShares,
            payment_method: backendPaymentMethod,
            purchase_currency: selectedCurrency,
            ...(backendPaymentMethod === 'installment' && formData.installment_plan ? { installment_plan: formData.installment_plan } : {}),
          };

          console.log('📤 [Attempt ' + attempt + '] Sending subscription request:', requestData);
          response = await apiClient.core_create_subscription(requestData);
        }
        
        console.log('📥 [Attempt ' + attempt + '] Subscription response received:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [Attempt ' + attempt + '] API Error Response:', errorText);
          throw new Error(errorText);
        }

        data = await response.json();
        console.log('📊 [Attempt ' + attempt + '] Subscription response data:', data);

        setSubscriptionId(data.subscription_id);
        setStep(5);
        
        const successMessage = beneficiaryType === 'other' && isAdmin
          ? `Subscription created successfully for ${identityFormData.full_name}!`
          : 'Subscription created successfully!';
        toast.success(successMessage);
        console.log('✅ [Attempt ' + attempt + '] Subscription created:', data);
        setLoading(false);

      } catch (error: any) {
        console.error(`❌ [Attempt ${attempt}] Subscription process failed:`, error);

        if (attempt < 3) {
          const delay = 500 * Math.pow(2, attempt - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          await executeSubscription(attempt + 1);
        } else {
          let errorMessage = 'Failed to create subscription after multiple attempts.';
          try {
            const parsedError = JSON.parse(error.message);
            errorMessage = parsedError.detail || 'An unknown validation error occurred.';
          } catch {
            if (error.message) {
              errorMessage = error.message;
            }
          }
          setSubmitError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
        }
      }
    };

    await executeSubscription();
    console.log('🔵 handleSubmit complete');
  }, [
    availability,
    identityFormData,
    isIdentityFormValid,
    numShares,
    selectedCurrency,
    formData.payment_method,
    formData.installment_plan,
    formData.selected_crypto,
    beneficiaryType,
    isAdmin,
    selectedUser,
  ]);

  const handleConfirmClick = () => {
    console.log('🟢 Confirm button clicked!');
    console.log('Button state - canProceed:', canProceed(), 'loading:', loading);
    handleSubmit();
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {s}
            </div>
            {s < 4 && <div className={`h-1 w-16 mx-2 ${
              step > s ? 'bg-blue-600' : 'bg-gray-200'
            }`} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-sm mt-2">
        <span className="w-20 text-center">Calculator</span>
        <span className="w-20 text-center">Details</span>
        <span className="w-20 text-center">Payment</span>
        <span className="w-20 text-center">Review</span>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch(step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-6 w-6" />
                  Share Subscription Calculator
                </CardTitle>
                <CardDescription>
                  Calculate your investment and potential ownership. 
                  There are <span className="font-bold text-primary">{availability.remaining.toLocaleString()}</span> shares remaining.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="numShares">Number of Shares</Label>
                  <Input
                    id="numShares"
                    type="number"
                    value={numShares}
                    onChange={(e) => setNumShares(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className={`text-lg ${shareInputError ? 'border-red-500' : ''}`}
                    min={availability.min_subscription}
                    max={availability.max_subscription}
                  />
                  {shareInputError && <p className="text-sm text-red-500 mt-1">{shareInputError}</p>}
                </div>
                
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${Math.min((numShares / availability.max_subscription) * 100, 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-muted-foreground">Share Price</p>
                    <p className="font-semibold text-lg">{formatCurrency(sharePrice)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-muted-foreground">Total Subscription Amount</p>
                    <p className="font-semibold text-lg text-blue-600">{formatCurrency(totalAmount)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-muted-foreground">Ownership Percentage</p>
                    <p className="font-semibold text-lg">{ownershipPercentage}%</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-muted-foreground">Est. Annual Dividend</p>
                    <p className="font-semibold text-lg">{formatCurrency(estimatedDividend)}</p>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> The minimum subscription is {availability.min_subscription} shares. 
                    The maximum is {availability.max_subscription} shares per application.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <Card>
              <CardHeader>
                <CardTitle>Subscriber Details</CardTitle>
                <CardDescription>
                  Please provide your details for the share certificate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup 
                  value={beneficiaryType}
                  onValueChange={handleBeneficiaryChange}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="self" id="self" />
                    <Label htmlFor="self">This is for me</Label>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other">This is for someone else (beneficiary)</Label>
                    </div>
                  )}
                </RadioGroup>
                
                {/* User Search for Admin On-Behalf Subscriptions */}
                {beneficiaryType === 'other' && isAdmin && (
                  <div className="space-y-3">
                    <Label>Search for Subscriber</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, phone, or ID number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                      {searchLoading && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Search Results Dropdown */}
                    {showSearchResults && searchQuery.length >= 2 && (
                      <Card className="border-blue-200 dark:border-blue-800">
                        <CardContent className="p-2">
                          {/* New User Option */}
                          <div
                            className="flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg cursor-pointer border-b border-gray-200 dark:border-gray-700"
                            onClick={() => handleUserSelect('new')}
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                              <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-green-600 dark:text-green-400">This is a new user</p>
                              <p className="text-xs text-muted-foreground">Manually enter their information</p>
                            </div>
                          </div>
                          
                          {/* Existing Users */}
                          {searchResults.length > 0 ? (
                            <div className="space-y-1 mt-2">
                              <p className="text-xs text-muted-foreground px-3 py-1">Existing Users</p>
                              {searchResults.map((user) => (
                                <div
                                  key={user.user_id}
                                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                                  onClick={() => handleUserSelect(user)}
                                >
                                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{user.full_name || user.email}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {user.email}
                                      {user.contact_number && ` • ${user.contact_number}`}
                                      {user.id_number && ` • ID: ${user.id_number}`}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-muted-foreground">No users found matching "{searchQuery}"</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Selected User Display */}
                    {selectedUser && (
                      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription>
                          <span className="font-semibold">Selected User:</span> {selectedUser.full_name || selectedUser.email}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* New User Indicator */}
                    {isNewUser && (
                      <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                        <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertDescription>
                          <span className="font-semibold">New User:</span> Fill in the details below to create a subscription for a new investor
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
                
                <Separator />
                
                {/* Identity Fields Display with Edit Button */}
                {!profileLoading && identityFormData.full_name && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg">Your Information</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingFields({
                            full_name: identityFormData.full_name || '',
                            email: identityFormData.email || '',
                            phone: identityFormData.phone || '',
                            id_number: identityFormData.id_number || ''
                          });
                          setShowEditDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Full Name</Label>
                        <p className="font-medium">{identityFormData.full_name}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="font-medium">{identityFormData.email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Phone Number</Label>
                        <p className="font-medium">{identityFormData.phone}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">ID Number</Label>
                        <p className="font-medium">{identityFormData.id_number}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {profileLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <UnifiedIdentityForm
                    mode="investor"
                    initialValues={identityFormData}
                    onDataChange={handleIdentityFormChange}
                    onValidationChange={setIsIdentityFormValid}
                  />
                )}
              </CardContent>
            </Card>
            
            <div className="flex gap-4 mt-6">
              <Button 
                onClick={() => setStep(1)} 
                variant="outline"
                className="flex-1"
              >
                Back to Calculator
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!canProceed() || profileLoading}
                className="flex-1"
              >
                {profileLoading ? 'Loading...' : 'Continue to Payment'}
              </Button>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-6 w-6" />
                  Payment Method
                </CardTitle>
                <CardDescription>
                  Choose how you'd like to pay for your subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <RadioGroup
                    value={formData.payment_method}
                    onValueChange={(value: any) => setFormData({...formData, payment_method: value, selected_crypto: value === 'cryptocurrency' ? formData.selected_crypto : ''})}
                    className="flex items-center space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bank-transfer" id="bank" />
                      <Label htmlFor="bank" className="font-normal">Bank Transfer</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="font-normal">Debit/Credit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="installment" id="installment" />
                      <Label htmlFor="installment" className="font-normal">Installment Plan</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cryptocurrency" id="crypto" />
                      <Label htmlFor="crypto" className="font-normal">Cryptocurrency</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {formData.payment_method === 'installment' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <Label className="mb-2 block">Select Installment Plan</Label>
                    <RadioGroup value={formData.installment_plan || ''} onValueChange={(value) => setFormData({...formData, installment_plan: value})}>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="6-months" id="6m" />
                          <Label htmlFor="6m" className="cursor-pointer">6 Months ({formatCurrency(totalAmount / 6)}/month)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="12-months" id="12m" />
                          <Label htmlFor="12m" className="cursor-pointer">12 Months ({formatCurrency(totalAmount / 12)}/month)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="24-months" id="24m" />
                          <Label htmlFor="24m" className="cursor-pointer">24 Months ({formatCurrency(totalAmount / 24)}/month)</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {formData.payment_method === 'cryptocurrency' && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="crypto-selection">
                      <AccordionTrigger className="text-base font-semibold">
                        {formData.selected_crypto ? `Selected: ${formData.selected_crypto}` : 'Select Cryptocurrency'}
                      </AccordionTrigger>
                      <AccordionContent>
                        {availableCryptos.length === 0 ? (
                          <div className="text-center py-8">
                            <Bitcoin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-2">
                              Cryptocurrency payment options are currently being configured.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Please use bank transfer or check back later.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {availableCryptos.map((crypto) => (
                              <Card
                                key={crypto.crypto_type}
                                className={cn(
                                  "cursor-pointer hover:border-primary transition-all",
                                  formData.selected_crypto === crypto.crypto_type && "border-primary bg-primary/5"
                                )}
                                onClick={() => setFormData({...formData, selected_crypto: crypto.crypto_type})}
                              >
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    {crypto.crypto_type === 'BTC' && <Bitcoin className="h-5 w-5" />}
                                    {crypto.crypto_type !== 'BTC' && <Wallet className="h-5 w-5" />}
                                    {crypto.crypto_type}
                                    {formData.selected_crypto === crypto.crypto_type && (
                                      <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                                    )}
                                  </CardTitle>
                                  {crypto.network_info && (
                                    <CardDescription className="text-xs">{crypto.network_info}</CardDescription>
                                  )}
                                </CardHeader>
                              </Card>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                <div className="flex gap-4">
                  <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                    Back
                  </Button>
                  <Button onClick={() => setStep(4)} disabled={!canProceed()} className="flex-1">
                    Review Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6" />
                  Review and Confirm
                </CardTitle>
                <CardDescription>
                  Please review your subscription details before confirming.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Accordion type="single" collapsible defaultValue="item-1">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Subscription Summary</AccordionTrigger>
                    <AccordionContent className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-muted-foreground">Number of Shares:</p><p className="font-semibold">{numberOfShares.toLocaleString()}</p></div>
                        <div><p className="text-muted-foreground">Share Price:</p><p className="font-semibold">{formatCurrency(sharePrice)}</p></div>
                        <div className="col-span-2"><p className="text-muted-foreground">Total Subscription Amount:</p><p className="font-bold text-2xl text-primary">{formatCurrency(totalAmount)}</p></div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Subscriber Information</AccordionTrigger>
                    <AccordionContent className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-muted-foreground">Full Name:</p><p className="font-semibold">{identityFormData.full_name}</p></div>
                        <div><p className="text-muted-foreground">Email:</p><p className="font-semibold">{identityFormData.email}</p></div>
                        <div><p className="text-muted-foreground">Phone Number:</p><p className="font-semibold">{identityFormData.phone}</p></div>
                        <div><p className="text-muted-foreground">ID Number:</p><p className="font-semibold">{identityFormData.id_number}</p></div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>Payment Plan</AccordionTrigger>
                    <AccordionContent className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-muted-foreground">Payment Method:</p>
                      <p className="font-semibold capitalize">{formData.payment_method.replace('-', ' ')}</p>
                      {formData.payment_method === 'installment' && formData.installment_plan && (
                        <p className="text-sm mt-2">Plan: <span className="font-semibold">{formData.installment_plan}</span></p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={formData.terms_accepted}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, terms_accepted: checked === true}))}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        I agree to the <a href="/terms-of-service" target="_blank" className="text-primary underline">terms and conditions</a>.
                      </label>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="privacy"
                      checked={formData.privacy_accepted}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, privacy_accepted: checked === true}))}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="privacy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        I accept the <a href="/privacy-policy" target="_blank" className="text-primary underline">privacy policy</a>.
                      </label>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleConfirmClick}
                  disabled={!canProceed() || loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Confirm & Create Subscription'
                  )}
                </Button>

              </CardContent>
            </Card>
          </motion.div>
        );
      default:
        return null;
    }
  };

  if (!availability) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-24 flex justify-center items-center">
          {error ? (
            <Card className="max-w-md w-full mx-4">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" onClick={loadShareAvailability}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin" />
          )}
        </main>
        <Footer />
      </div>
    );
  }

  if (step === 5 && subscriptionId) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-24">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <CardTitle className="text-2xl">Subscription Confirmed!</CardTitle>
                <CardDescription>Your share subscription has been successfully created</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subscription ID:</span>
                    <span className="font-mono font-semibold">{subscriptionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shares:</span>
                    <span className="font-semibold">{numShares.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-semibold capitalize">{formData.payment_method.replace('-', ' ')}</span>
                  </div>
                </div>

                {/* Payment Options Tabs */}
                <Tabs defaultValue="bank" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
                    <TabsTrigger value="crypto">Cryptocurrency</TabsTrigger>
                  </TabsList>

                  {/* Bank Transfer Tab */}
                  <TabsContent value="bank">
                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 p-6 rounded-lg">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        Bank Payment Instructions
                      </h3>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground mb-4">
                          Please make your payment to the following bank account:
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Account Holder</p>
                            <p className="font-semibold">Citizen Pay</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Bank</p>
                            <p className="font-semibold">FNB/RMB</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Account Type</p>
                            <p className="font-semibold">Savings</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Branch Code</p>
                            <p className="font-semibold font-mono">250655</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Account Number</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-semibold">62748870301</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard('62748870301')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Payment Reference</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-semibold">{subscriptionId}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(subscriptionId)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Amount to Transfer</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
                          </div>
                        </div>
                        <Alert className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            <strong>Important:</strong> Please use your subscription ID ({subscriptionId}) as the payment reference to ensure your payment is correctly allocated.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Cryptocurrency Tab */}
                  <TabsContent value="crypto">
                    <div className="space-y-4">
                      {availableCryptos.length === 0 ? (
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center py-8">
                              <Bitcoin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground mb-2">
                                Cryptocurrency payment options are currently being configured.
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Please use bank transfer or check back later.
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ) : !selectedCrypto ? (
                        <div className="space-y-3">
                          <Label>Select Cryptocurrency</Label>
                          <div className="grid grid-cols-1 gap-3">
                            {availableCryptos.map((crypto) => (
                              <Card
                                key={crypto.crypto_type}
                                className="cursor-pointer hover:border-primary transition-all"
                                onClick={() => handleCryptoSelect(crypto.crypto_type)}
                              >
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    {crypto.crypto_type === 'BTC' && <Bitcoin className="h-5 w-5" />}
                                    {crypto.crypto_type !== 'BTC' && <Wallet className="h-5 w-5" />}
                                    {crypto.crypto_type}
                                  </CardTitle>
                                  {crypto.network_info && (
                                    <CardDescription className="text-xs">{crypto.network_info}</CardDescription>
                                  )}
                                </CardHeader>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{selectedCrypto} Payment Details</h4>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedCrypto('');
                              setCryptoWallet(null);
                              setQrCode('');
                            }}>
                              Change Crypto
                            </Button>
                          </div>

                          {loadingWallet && (
                            <div className="flex justify-center p-8">
                              <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                          )}

                          {!loadingWallet && cryptoWallet && (
                            <Card>
                              <CardContent className="pt-6 space-y-4">
                                <div>
                                  <Label className="text-sm text-muted-foreground">Wallet Address</Label>
                                  <div className="flex items-start gap-2 mt-1">
                                    <p className="font-mono text-sm bg-muted p-3 rounded-md break-all flex-1">
                                      {cryptoWallet.wallet_address}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(cryptoWallet.wallet_address)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {cryptoWallet.network_info && (
                                  <div>
                                    <Label className="text-sm text-muted-foreground">Network</Label>
                                    <p className="text-sm mt-1">{cryptoWallet.network_info}</p>
                                  </div>
                                )}

                                <div>
                                  <Label className="text-sm text-muted-foreground">Amount (LSL)</Label>
                                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Send the equivalent amount in {selectedCrypto} to the wallet address above
                                  </p>
                                </div>

                                <div className="flex flex-col items-center">
                                  <Label className="text-sm text-muted-foreground mb-2">QR Code</Label>
                                  <div className="bg-white p-4 rounded-lg">
                                    <QRCodeSVG 
                                      value={cryptoWallet.wallet_address} 
                                      size={256}
                                      level="L"
                                      includeMargin={true}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm text-muted-foreground">Payment Reference</Label>
                                  <div className="flex items-center gap-2">
                                    <p className="font-mono font-semibold">{subscriptionId}</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(subscriptionId)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              <strong>Important:</strong> Send the exact amount to the wallet address above. 
                              Your investment will be processed once the transaction is confirmed on the blockchain.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Next Steps:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>A confirmation email will be sent to {identityFormData.email}</li>
                      <li>Make payment using bank transfer or cryptocurrency</li>
                      <li>Your certificate will be issued once payment is verified</li>
                      <li>Track your subscription in "My Subscriptions"</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                {/* Payment Proof Upload Section */}
                <Card className="border-2 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Upload Payment Proof
                    </CardTitle>
                    <CardDescription>
                      Upload your payment receipt or proof of transaction to expedite processing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {proofUploaded ? (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="font-semibold text-green-900 dark:text-green-100">Payment proof uploaded successfully!</p>
                            <p className="text-sm text-green-700 dark:text-green-300">Our team will review and verify your payment shortly.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                            <input
                              type="file"
                              id="payment-proof"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={uploadingProof || remindLater}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handlePaymentProofUpload(file);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <div className="space-y-2">
                              <Upload className="h-12 w-12 mx-auto text-gray-400" />
                              <div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={uploadingProof || remindLater}
                                  onClick={() => document.getElementById('payment-proof')?.click()}
                                  className="mb-2"
                                >
                                  {uploadingProof ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Select File
                                    </>
                                  )}
                                </Button>
                                <p className="text-sm text-muted-foreground">
                                  Accepted formats: PDF, JPG, PNG (Max 10MB)
                                </p>
                              </div>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Checkbox
                              id="remind-later"
                              checked={remindLater}
                              onCheckedChange={(checked) => setRemindLater(checked === true)}
                              disabled={proofUploaded}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor="remind-later"
                                className="text-sm font-medium cursor-pointer"
                              >
                                Remind me to send via email later
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                We'll send you a reminder email at <strong>{formData.email}</strong> within 24 hours if payment proof is not uploaded
                              </p>
                            </div>
                          </div>
                        </div>

                        {remindLater && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              You will receive a reminder email at <strong>{formData.email}</strong> within 24 hours.
                              You can also upload your payment proof anytime from "My Subscriptions".
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-4">
                  <Button onClick={() => navigate('/my-subscriptions')} className="flex-1">
                    View My Subscriptions
                  </Button>
                  <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
                    Back to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-16">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {step < 5 && renderStepIndicator()}
          
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Calculator</CardTitle>
                <CardDescription>
                  Enter the number of shares you wish to purchase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="shares" className={cn(
                        shareInputError && "text-destructive"
                      )}>Number of Shares</Label>
                      <Input
                        id="shares"
                        type="number"
                        value={numShares}
                        onChange={(e) => setNumShares(Number(e.target.value))}
                        min={availability.min_subscription}
                        max={Math.min(availability.max_subscription, availability.remaining)}
                        className={cn(
                          "text-lg font-semibold",
                          shareInputError && "border-destructive focus-visible:ring-destructive",
                          numShares > 0 && numShares < availability.min_subscription && "border-orange-500",
                          numShares >= availability.min_subscription && numShares <= Math.min(availability.max_subscription, availability.remaining) && "border-green-500"
                        )}
                      />
                      
                      {/* Progress indicator when below minimum */}
                      {numShares > 0 && numShares < availability.min_subscription && (
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress to minimum</span>
                            <span>{Math.round((numShares / availability.min_subscription) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-full bg-orange-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((numShares / availability.min_subscription) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-sm text-orange-600 dark:text-orange-400 flex items-start gap-1">
                            <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>
                              You need <strong>{(availability.min_subscription - numShares).toLocaleString()} more shares</strong> to meet the minimum requirement.
                              That's an additional <strong>{formatCurrency((availability.min_subscription - numShares) * Number(availability.price_per_share))}</strong>.
                            </span>
                          </p>
                        </div>
                      )}
                      
                      {/* Success indicator when meets minimum */}
                      {numShares >= availability.min_subscription && numShares <= Math.min(availability.max_subscription, availability.remaining) && (
                        <div className="mt-3">
                          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Great! Your investment meets the minimum requirement.</span>
                          </p>
                        </div>
                      )}
                      
                      {shareInputError ? (
                        <p className="text-sm text-destructive mt-2 flex items-start gap-1">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{shareInputError}</span>
                        </p>
                      ) : numShares === 0 ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          Min: {availability.min_subscription.toLocaleString()} | Max: {Math.min(availability.max_subscription, availability.remaining).toLocaleString()} | Available: {availability.remaining.toLocaleString()}
                        </p>
                      ) : null}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Price per Share</p>
                      <p className="text-2xl font-bold">{formatCurrency(Number(availability.price_per_share))}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Subscription Amount</p>
                      <p className="text-3xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground">Ownership</p>
                        <p className="text-lg font-semibold">{ownershipPercentage}%</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground">Est. Annual Dividend</p>
                        <p className="text-lg font-semibold">{formatCurrency(estimatedDividend)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {numShares < availability.min_subscription && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Minimum subscription is {availability.min_subscription.toLocaleString()} shares
                    </AlertDescription>
                  </Alert>
                )}

                {numShares > availability.remaining && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Only {availability.remaining.toLocaleString()} shares available
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={() => setStep(2)} 
                  disabled={!canProceed() || !!shareInputError} 
                  className="w-full"
                  size="lg"
                >
                  {shareInputError ? 'Please meet minimum requirements' : 'Continue to Details'}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && renderStepContent()}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Payment Method</CardTitle>
                <CardDescription>
                  Choose how you'd like to pay for your subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <RadioGroup
                    value={formData.payment_method}
                    onValueChange={(value: any) => setFormData({...formData, payment_method: value, selected_crypto: value === 'cryptocurrency' ? formData.selected_crypto : ''})}
                    className="flex items-center space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bank-transfer" id="bank" />
                      <Label htmlFor="bank" className="font-normal">Bank Transfer</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="font-normal">Debit/Credit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="installment" id="installment" />
                      <Label htmlFor="installment" className="font-normal">Installment Plan</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cryptocurrency" id="crypto" />
                      <Label htmlFor="crypto" className="font-normal">Cryptocurrency</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {formData.payment_method === 'installment' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <Label className="mb-2 block">Select Installment Plan</Label>
                    <RadioGroup value={formData.installment_plan || ''} onValueChange={(value) => setFormData({...formData, installment_plan: value})}>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="6-months" id="6m" />
                          <Label htmlFor="6m" className="cursor-pointer">6 Months ({formatCurrency(totalAmount / 6)}/month)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="12-months" id="12m" />
                          <Label htmlFor="12m" className="cursor-pointer">12 Months ({formatCurrency(totalAmount / 12)}/month)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="24-months" id="24m" />
                          <Label htmlFor="24m" className="cursor-pointer">24 Months ({formatCurrency(totalAmount / 24)}/month)</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {formData.payment_method === 'cryptocurrency' && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="crypto-selection">
                      <AccordionTrigger className="text-base font-semibold">
                        {formData.selected_crypto ? `Selected: ${formData.selected_crypto}` : 'Select Cryptocurrency'}
                      </AccordionTrigger>
                      <AccordionContent>
                        {availableCryptos.length === 0 ? (
                          <div className="text-center py-8">
                            <Bitcoin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-2">
                              Cryptocurrency payment options are currently being configured.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Please use bank transfer or check back later.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {availableCryptos.map((crypto) => (
                              <Card
                                key={crypto.crypto_type}
                                className={cn(
                                  "cursor-pointer hover:border-primary transition-all",
                                  formData.selected_crypto === crypto.crypto_type && "border-primary bg-primary/5"
                                )}
                                onClick={() => setFormData({...formData, selected_crypto: crypto.crypto_type})}
                              >
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    {crypto.crypto_type === 'BTC' && <Bitcoin className="h-5 w-5" />}
                                    {crypto.crypto_type !== 'BTC' && <Wallet className="h-5 w-5" />}
                                    {crypto.crypto_type}
                                    {formData.selected_crypto === crypto.crypto_type && (
                                      <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                                    )}
                                  </CardTitle>
                                  {crypto.network_info && (
                                    <CardDescription className="text-xs">{crypto.network_info}</CardDescription>
                                  )}
                                </CardHeader>
                              </Card>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                <div className="flex gap-4">
                  <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                    Back
                  </Button>
                  <Button onClick={() => setStep(4)} disabled={!canProceed()} className="flex-1">
                    Review Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Review & Confirm</h2>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg space-y-4">
                <h3 className="font-semibold">Subscription Summary</h3>
                <Separator />
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Subscriber</p>
                    <p className="font-semibold">{identityFormData.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold">{identityFormData.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Number of Shares</p>
                    <p className="font-semibold">{numShares.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-semibold text-green-600">{formatCurrency(totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p className="font-semibold capitalize">{formData.payment_method.replace('-', ' ')}</p>
                  </div>
                  {formData.installment_plan && (
                    <div>
                      <p className="text-sm text-muted-foreground">Installment Plan</p>
                      <p className="font-semibold">{formData.installment_plan}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={formData.terms_accepted}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, terms_accepted: checked === true}))}
                  />
                  <Label htmlFor="terms" className="text-sm cursor-pointer">
                    I accept the <a href="/terms-of-service" className="text-blue-600 hover:underline" target="_blank">Terms of Service</a> and Share Subscription Agreement
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="privacy"
                    checked={formData.privacy_accepted}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, privacy_accepted: checked === true}))}
                  />
                  <Label htmlFor="privacy" className="text-sm cursor-pointer">
                    I accept the <a href="/privacy-policy" className="text-blue-600 hover:underline" target="_blank">Privacy Policy</a> and consent to data processing
                  </Label>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  By confirming, you agree to subscribe to {numShares.toLocaleString()} shares for a total of {formatCurrency(totalAmount)}
                </AlertDescription>
              </Alert>

              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {submitError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button onClick={() => setStep(3)} variant="outline" className="flex-1" disabled={loading}>
                  Back
                </Button>
                <Button
                  onClick={handleConfirmClick}
                  disabled={!canProceed() || loading}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Confirm & Create Subscription'
                  )}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
      
      {/* Edit Identity Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Your Information</DialogTitle>
            <DialogDescription>
              Update your personal details for the share subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-full-name">Full Name *</Label>
              <Input
                id="edit-full-name"
                value={editingFields.full_name}
                onChange={(e) => setEditingFields({ ...editingFields, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editingFields.email}
                onChange={(e) => setEditingFields({ ...editingFields, email: e.target.value })}
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number *</Label>
              <Input
                id="edit-phone"
                value={editingFields.phone}
                onChange={(e) => setEditingFields({ ...editingFields, phone: e.target.value })}
                placeholder="Enter your phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-id-number">ID Number *</Label>
              <Input
                id="edit-id-number"
                value={editingFields.id_number}
                onChange={(e) => setEditingFields({ ...editingFields, id_number: e.target.value })}
                placeholder="Enter your ID number"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Update identityFormData with edited values
              setIdentityFormData({
                ...identityFormData,
                full_name: editingFields.full_name,
                email: editingFields.email,
                phone: editingFields.phone,
                id_number: editingFields.id_number
              });
              setShowEditDialog(false);
              toast.success('Information updated successfully');
            }}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
