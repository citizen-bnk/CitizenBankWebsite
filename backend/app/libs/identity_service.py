"""Unified Identity Validation Service

Provides consistent identity validation across all platform features:
- Share subscriptions
- Profile completion
- Board member onboarding
- Customer registration

Supports:
- South African ID numbers (with auto-extraction)
- Passports (basic validation)
- Future: Other country ID formats
"""

from datetime import date
from typing import Dict, List, Optional
from pydantic import BaseModel
from app.libs.sa_id_validator import validate_sa_id, SAIDValidationResult


class IdentityValidationResult(BaseModel):
    """Result of identity validation"""
    is_valid: bool
    extracted_data: Optional[Dict] = None
    validation_errors: List[str] = []
    warnings: List[str] = []
    allow_override: bool = False  # User can confirm if checksum fails but format is valid


class ProfileCompletenessResult(BaseModel):
    """Result of profile completeness check"""
    is_complete: bool
    completion_percentage: int
    missing_fields: List[str] = []
    required_level: str  # basic, investor, board_member


class IdentityService:
    """Unified identity validation and profile checking service"""
    
    # Define required fields for each profile level
    REQUIRED_FIELDS = {
        'basic': [
            'full_name',
            'email',
            'phone',
            'id_number'
        ],
        'investor': [
            'full_name',
            'email', 
            'phone',
            'id_number',
            'date_of_birth',
            'nationality',
            'street_address',
            'city',
            'country',
            'source_of_funds',
            'investor_type'
        ],
        'board_member': [
            'full_name',
            'email',
            'phone', 
            'id_number',
            'date_of_birth',
            'nationality',
            'street_address',
            'city',
            'state_province',
            'postal_code',
            'country',
            'occupation',
            'employer_name'
        ]
    }
    
    @staticmethod
    def validate_and_extract(
        id_number: str,
        country: str,
        identity_type: str
    ) -> IdentityValidationResult:
        """
        Universal identity validation that works for ANY use case.
        
        Args:
            id_number: The ID/passport number
            country: Country of issue (e.g., 'South Africa', 'Lesotho')
            identity_type: Type of identity ('national_id', 'passport')
            
        Returns:
            IdentityValidationResult with validation status and extracted data
        """
        # Handle South African ID numbers with auto-extraction
        if country == 'South Africa' and identity_type == 'national_id':
            return IdentityService._validate_sa_id(id_number)
        
        # Handle passports (basic validation only)
        elif identity_type == 'passport':
            return IdentityService._validate_passport(id_number, country)
        
        # Handle other country IDs (basic format validation)
        else:
            return IdentityService._validate_generic_id(id_number, country)
    
    @staticmethod
    def _validate_sa_id(id_number: str) -> IdentityValidationResult:
        """Validate South African ID with auto-extraction"""
        result: SAIDValidationResult = validate_sa_id(id_number)
        
        if result.is_valid:
            return IdentityValidationResult(
                is_valid=True,
                extracted_data=result.data,
                validation_errors=[],
                warnings=[]
            )
        else:
            # Check if it's a checksum error (might allow override)
            allow_override = 'checksum' in result.error.lower() if result.error else False
            
            return IdentityValidationResult(
                is_valid=False,
                extracted_data=None,
                validation_errors=[result.error] if result.error else ['Invalid ID number'],
                warnings=[],
                allow_override=allow_override
            )
    
    @staticmethod
    def _validate_passport(id_number: str, country: str) -> IdentityValidationResult:
        """Validate passport number (basic format check)"""
        # Remove spaces and convert to uppercase
        passport = id_number.strip().upper().replace(' ', '')
        
        # Basic validation rules
        errors = []
        warnings = []
        
        # Length check (most passports are 6-12 characters)
        if len(passport) < 6:
            errors.append('Passport number too short (minimum 6 characters)')
        elif len(passport) > 12:
            errors.append('Passport number too long (maximum 12 characters)')
        
        # Format check (alphanumeric only)
        if not passport.isalnum():
            errors.append('Passport number must contain only letters and numbers')
        
        # Warning for passport validation
        warnings.append(
            f'Passport validation is basic only. Please verify {country} passport number manually.'
        )
        
        if errors:
            return IdentityValidationResult(
                is_valid=False,
                extracted_data=None,
                validation_errors=errors,
                warnings=warnings,
                allow_override=True  # Passports can be manually verified
            )
        
        return IdentityValidationResult(
            is_valid=True,
            extracted_data={
                'identity_type': 'passport',
                'id_country_of_issue': country
            },
            validation_errors=[],
            warnings=warnings
        )
    
    @staticmethod
    def _validate_generic_id(id_number: str, country: str) -> IdentityValidationResult:
        """Validate generic ID number (basic format check)"""
        # Remove spaces
        cleaned_id = id_number.strip().replace(' ', '').replace('-', '')
        
        errors = []
        warnings = []
        
        # Basic length check
        if len(cleaned_id) < 6:
            errors.append('ID number too short (minimum 6 characters)')
        elif len(cleaned_id) > 20:
            errors.append('ID number too long (maximum 20 characters)')
        
        # Warning about limited validation
        warnings.append(
            f'Limited validation available for {country} IDs. Please verify manually.'
        )
        
        if errors:
            return IdentityValidationResult(
                is_valid=False,
                extracted_data=None,
                validation_errors=errors,
                warnings=warnings,
                allow_override=True
            )
        
        return IdentityValidationResult(
            is_valid=True,
            extracted_data={
                'identity_type': 'national_id',
                'id_country_of_issue': country
            },
            validation_errors=[],
            warnings=warnings
        )
    
    @staticmethod
    def check_profile_completeness(
        profile: Dict,
        required_level: str = 'basic'
    ) -> ProfileCompletenessResult:
        """
        Check if profile meets completeness requirements for specific use case.
        
        Args:
            profile: User profile dictionary
            required_level: Completeness level ('basic', 'investor', 'board_member')
            
        Returns:
            ProfileCompletenessResult with completion status and missing fields
        """
        # Get required fields for this level
        required_fields = IdentityService.REQUIRED_FIELDS.get(
            required_level,
            IdentityService.REQUIRED_FIELDS['basic']
        )
        
        # Check which fields are missing or empty
        missing_fields = []
        for field in required_fields:
            value = profile.get(field)
            # Consider field missing if None, empty string, or whitespace only
            if value is None or (isinstance(value, str) and not value.strip()):
                missing_fields.append(field)
        
        # Calculate completion percentage
        total_fields = len(required_fields)
        completed_fields = total_fields - len(missing_fields)
        completion_percentage = int((completed_fields / total_fields) * 100) if total_fields > 0 else 0
        
        return ProfileCompletenessResult(
            is_complete=len(missing_fields) == 0,
            completion_percentage=completion_percentage,
            missing_fields=missing_fields,
            required_level=required_level
        )
    
    @staticmethod
    def format_field_name(field_name: str) -> str:
        """Convert field_name to human-readable format"""
        # Handle special cases
        special_cases = {
            'id_number': 'ID Number',
            'date_of_birth': 'Date of Birth',
            'source_of_funds': 'Source of Funds',
            'investor_type': 'Investor Type',
            'employer_name': 'Employer Name'
        }
        
        if field_name in special_cases:
            return special_cases[field_name]
        
        # Convert snake_case to Title Case
        return field_name.replace('_', ' ').title()
