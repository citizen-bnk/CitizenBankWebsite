/**
 * UnifiedIdentityForm - Reusable identity collection component
 * 
 * Used across:
 * - Share subscriptions
 * - Profile completion
 * - Board member onboarding
 * - Customer registration
 * 
 * Features:
 * - Auto-validates SA IDs with real-time feedback
 * - Auto-extracts DOB, gender, citizenship for SA IDs
 * - Supports passports and other countries
 * - Configurable fields based on context (mode)
 * - Consistent UX across all features
 */

import { useState, useEffect } from 'react';
import { apiClient } from 'app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

// ========== Types ==========

export interface IdentityFormData {
  // Identity fields (always collected)
  identity_type: string;
  id_country_of_issue: string;
  id_number: string;
  
  // Auto-extracted fields (read-only)
  date_of_birth?: string;
  gender?: string;
  citizenship_status?: string;
  
  // Personal fields
  full_name?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  
  // Address fields
  street_address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  
  // Investor fields
  source_of_funds?: string;
  investor_type?: string;
  investment_purpose?: string;
  
  // Board member fields
  occupation?: string;
  employer_name?: string;
}

export interface UnifiedIdentityFormProps {
  // Mode determines what fields are shown
  mode: 'basic' | 'investor' | 'board_member';
  
  // Initial values for editing existing profiles
  initialValues?: Partial<IdentityFormData>;
  
  // Callback when form data changes (for parent to track)
  onDataChange?: (data: IdentityFormData) => void;
  
  // Callback when validation status changes
  onValidationChange?: (isValid: boolean) => void;
  
  // Show/hide specific sections (optional override)
  sections?: {
    identity?: boolean;
    personal?: boolean;
    contact?: boolean;
    address?: boolean;
    financial?: boolean;
    employment?: boolean;
  };
  
  // Disable all inputs (for read-only mode)
  disabled?: boolean;
}

interface ExtractedData {
  date_of_birth?: string;
  gender?: string;
  citizenship_status?: string;
  age?: number;
}

interface ValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
  warning: string | null;
  extractedData: ExtractedData | null;
}

// ========== Component ==========

export const UnifiedIdentityForm: React.FC<UnifiedIdentityFormProps> = ({
  mode,
  initialValues = {},
  onDataChange,
  onValidationChange,
  onFormChange,
  sections: sectionOverrides,
  disabled = false
}) => {
  // ========== State ==========
  
  const [formData, setFormData] = useState<IdentityFormData>({
    identity_type: initialValues.identity_type || 'national_id',
    id_country_of_issue: initialValues.id_country_of_issue || 'South Africa',
    id_number: initialValues.id_number || '',
    ...initialValues
  });
  
  const [validation, setValidation] = useState<ValidationState>({
    isValidating: false,
    isValid: null,
    error: null,
    warning: null,
    extractedData: null
  });

  // Track if initial data was pre-loaded from profile (trusted)
  const [isPreLoaded, setIsPreLoaded] = useState(false);
  
  // ========== Sections Configuration ==========
  
  // Default sections based on mode
  const defaultSections = {
    identity: true,
    personal: mode !== 'basic',
    contact: mode !== 'basic',
    address: mode !== 'basic',
    financial: mode === 'investor',
    employment: mode === 'board_member'
  };
  
  // Merge with overrides
  const sections = { ...defaultSections, ...sectionOverrides };
  
  // ========== Update Form When Initial Values Change ==========
  
  useEffect(() => {
    // Update form data when initialValues prop changes (e.g., after profile loads)
    if (initialValues && Object.keys(initialValues).length > 0) {
      setFormData(prev => ({
        ...prev,
        ...initialValues
      }));

      // If ID number is pre-loaded, mark it as trusted and set validation to valid
      if (initialValues.id_number && initialValues.id_number.length >= 6) {
        setIsPreLoaded(true);
        setValidation({
          isValidating: false,
          isValid: true,
          error: null,
          warning: null,
          extractedData: {
            date_of_birth: initialValues.date_of_birth,
            gender: initialValues.gender,
            citizenship_status: initialValues.citizenship_status
          }
        });
      }
    }
  }, [initialValues]);
  
  // ========== Auto-validation Effect ==========
  
  useEffect(() => {
    // Only auto-validate if we have a complete ID number
    const shouldValidate = 
      formData.id_number && 
      formData.id_number.length >= 6 && // Minimum length
      !disabled &&
      !isPreLoaded; // Don't re-validate pre-loaded trusted data
    
    if (shouldValidate) {
      // Debounce validation (wait for user to stop typing)
      const timer = setTimeout(() => {
        validateIdentity();
      }, 800); // 800ms debounce
      
      return () => clearTimeout(timer);
    } else if (!formData.id_number || formData.id_number.length < 6) {
      // Reset validation state if ID is cleared or too short
      setValidation({
        isValidating: false,
        isValid: null,
        error: null,
        warning: null,
        extractedData: null
      });
      setIsPreLoaded(false);
    }
  }, [formData.id_number, formData.identity_type, formData.id_country_of_issue, isPreLoaded]);
  
  // ========== Notify Parent of Changes ==========
  
  useEffect(() => {
    onDataChange?.(formData);
  }, [formData]);
  
  useEffect(() => {
    // A form is valid if the backend says it is, OR if there's an error but we can override it
    const isFormValid = validation.isValid === true || (validation.isValid === false && !!validation.warning);
    onValidationChange?.(isFormValid);
  }, [validation.isValid, validation.warning]);
  
  // ========== Validation Function ==========
  
  const validateIdentity = async () => {
    setValidation(prev => ({ ...prev, isValidating: true }));
    
    try {
      const response = await apiClient.validate_identity({
        id_number: formData.id_number,
        country: formData.id_country_of_issue,
        identity_type: formData.identity_type
      });
      
      const result = await response.json();
      
      if (result.is_valid) {
        // Success - update extracted data
        setValidation({
          isValidating: false,
          isValid: true,
          error: null,
          warning: result.warnings?.[0] || null,
          extractedData: result.extracted_data || null
        });
        
        // Auto-populate extracted fields
        if (result.extracted_data) {
          setFormData(prev => ({
            ...prev,
            date_of_birth: result.extracted_data.date_of_birth || prev.date_of_birth,
            gender: result.extracted_data.gender || prev.gender,
            citizenship_status: result.extracted_data.citizenship_status || prev.citizenship_status
          }));
        }
      } else {
        // Validation failed
        setValidation({
          isValidating: false,
          isValid: false,
          error: result.validation_errors?.[0] || 'Invalid ID number',
          warning: result.allow_override ? 'You can continue, but please verify the ID number is correct' : null,
          extractedData: null
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidation({
        isValidating: false,
        isValid: false,
        error: 'Failed to validate ID. Please try again.',
        warning: null,
        extractedData: null
      });
    }
  };
  
  // ========== Update Functions ==========
  
  const updateField = (field: keyof IdentityFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // ========== Render ==========
  
  return (
    <div className="space-y-6">
      
      {/* Identity Section - ALWAYS SHOWN */}
      {sections.identity && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identity Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Country of Issue */}
              <div className="space-y-2">
                <Label htmlFor="id_country_of_issue">Country of Issue *</Label>
                <Select
                  value={formData.id_country_of_issue}
                  onValueChange={(val) => updateField('id_country_of_issue', val)}
                  disabled={disabled}
                >
                  <SelectTrigger id="id_country_of_issue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="South Africa">South Africa</SelectItem>
                    <SelectItem value="Lesotho">Lesotho</SelectItem>
                    <SelectItem value="Botswana">Botswana</SelectItem>
                    <SelectItem value="Namibia">Namibia</SelectItem>
                    <SelectItem value="Swaziland">Swaziland</SelectItem>
                    <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Identity Type */}
              <div className="space-y-2">
                <Label htmlFor="identity_type">Identity Type *</Label>
                <Select
                  value={formData.identity_type}
                  onValueChange={(val) => updateField('identity_type', val)}
                  disabled={disabled}
                >
                  <SelectTrigger id="identity_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* ID Number */}
            <div className="space-y-2">
              <Label htmlFor="id_number">
                {formData.identity_type === 'passport' ? 'Passport Number' : 'ID Number'} *
              </Label>
              <div className="relative">
                <Input
                  id="id_number"
                  value={formData.id_number}
                  onChange={(e) => updateField('id_number', e.target.value)}
                  disabled={disabled}
                  className={`pr-10 ${validation.error ? 'border-red-500' : validation.isValid ? 'border-green-500' : ''}`}
                  placeholder={formData.identity_type === 'passport' ? 'ABC123456' : '0001015009087'}
                />
                {validation.isValidating && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {validation.isValid === true && !validation.isValidating && (
                  <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                )}
                {validation.isValid === false && !validation.isValidating && (
                  <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-red-600" />
                )}
              </div>
              
              {/* Validation Error */}
              {validation.error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validation.error}</AlertDescription>
                </Alert>
              )}
              
              {/* Validation Warning */}
              {validation.warning && !validation.error && (
                <Alert className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription>{validation.warning}</AlertDescription>
                </Alert>
              )}
            </div>
            
            {/* Extracted Data Display */}
            {validation.extractedData && validation.isValid && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription>
                  <p className="font-medium text-green-800 dark:text-green-200 mb-2">✓ Data extracted from ID</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {validation.extractedData.date_of_birth && (
                      <div>
                        <Label className="text-xs text-green-700 dark:text-green-300">Date of Birth</Label>
                        <Input 
                          value={validation.extractedData.date_of_birth} 
                          disabled 
                          className="mt-1 bg-white dark:bg-gray-950"
                        />
                      </div>
                    )}
                    {validation.extractedData.gender && (
                      <div>
                        <Label className="text-xs text-green-700 dark:text-green-300">Gender</Label>
                        <Input 
                          value={validation.extractedData.gender} 
                          disabled 
                          className="mt-1 bg-white dark:bg-gray-950"
                        />
                      </div>
                    )}
                    {validation.extractedData.citizenship_status && (
                      <div>
                        <Label className="text-xs text-green-700 dark:text-green-300">Citizenship</Label>
                        <Input 
                          value={validation.extractedData.citizenship_status} 
                          disabled 
                          className="mt-1 bg-white dark:bg-gray-950"
                        />
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Financial Section - ONLY for investors */}
      {sections.financial && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Investment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Source of Funds */}
            <div className="space-y-2">
              <Label htmlFor="source_of_funds">Source of Funds *</Label>
              <Select
                value={formData.source_of_funds || ''}
                onValueChange={(val) => updateField('source_of_funds', val)}
                disabled={disabled}
              >
                <SelectTrigger id="source_of_funds">
                  <SelectValue placeholder="Select source of funds..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Business Income">Business Income</SelectItem>
                  <SelectItem value="Inheritance">Inheritance</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Investment Returns">Investment Returns</SelectItem>
                  <SelectItem value="Gift">Gift</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Investor Type */}
            <div className="space-y-2">
              <Label htmlFor="investor_type">Investor Type *</Label>
              <Select
                value={formData.investor_type || ''}
                onValueChange={(val) => updateField('investor_type', val)}
                disabled={disabled}
              >
                <SelectTrigger id="investor_type">
                  <SelectValue placeholder="Select investor type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="institutional">Institutional</SelectItem>
                  <SelectItem value="accredited">Accredited Investor</SelectItem>
                  <SelectItem value="qualified">Qualified Purchaser</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Investment Purpose */}
            <div className="space-y-2">
              <Label htmlFor="investment_purpose">Investment Purpose (Optional)</Label>
              <Input
                id="investment_purpose"
                value={formData.investment_purpose || ''}
                onChange={(e) => updateField('investment_purpose', e.target.value)}
                disabled={disabled}
                placeholder="e.g., Long-term wealth building, retirement planning"
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Employment Section - ONLY for board members */}
      {sections.employment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Occupation */}
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation *</Label>
                <Input
                  id="occupation"
                  value={formData.occupation || ''}
                  onChange={(e) => updateField('occupation', e.target.value)}
                  disabled={disabled}
                  placeholder="e.g., Financial Director, CEO"
                />
              </div>
              
              {/* Employer Name */}
              <div className="space-y-2">
                <Label htmlFor="employer_name">Employer</Label>
                <Input
                  id="employer_name"
                  value={formData.employer_name || ''}
                  onChange={(e) => updateField('employer_name', e.target.value)}
                  disabled={disabled}
                  placeholder="Company name"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
    </div>
  );
};

export default UnifiedIdentityForm;
