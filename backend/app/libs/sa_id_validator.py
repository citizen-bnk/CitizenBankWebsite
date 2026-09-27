"""South African ID Number Validation Utility

Validates SA ID numbers and extracts information:
- Date of Birth (YYMMDD)
- Gender (0000-4999 = Female, 5000-9999 = Male)
- Citizenship (0 = SA Citizen, 1 = Permanent Resident)
- Checksum validation using Luhn algorithm
"""

from datetime import datetime
from typing import Dict, Optional


class SAIDValidationResult:
    """Result of SA ID validation"""
    def __init__(self, is_valid: bool, error: Optional[str] = None, data: Optional[Dict] = None):
        self.is_valid = is_valid
        self.error = error
        self.data = data or {}


def validate_sa_id(id_number: str) -> SAIDValidationResult:
    """
    Validate South African ID number and extract information.
    
    Format: YYMMDD SSSS C A Z
    - YYMMDD: Date of birth
    - SSSS: Gender (0000-4999 Female, 5000-9999 Male)
    - C: Citizenship (0 = SA Citizen, 1 = Permanent Resident)
    - A: Usually 8 or 9 (historically used for race classification, now unused)
    - Z: Checksum digit
    
    Args:
        id_number: 13-digit SA ID number as string
        
    Returns:
        SAIDValidationResult with validation status and extracted data
    """
    # Remove any spaces or dashes
    id_number = id_number.replace(" ", "").replace("-", "")
    
    # Check length
    if len(id_number) != 13:
        return SAIDValidationResult(
            is_valid=False,
            error="ID number must be exactly 13 digits"
        )
    
    # Check if all characters are digits
    if not id_number.isdigit():
        return SAIDValidationResult(
            is_valid=False,
            error="ID number must contain only digits"
        )
    
    # Extract components
    yy = id_number[0:2]
    mm = id_number[2:4]
    dd = id_number[4:6]
    gender_code = id_number[6:10]
    citizenship_code = id_number[10]
    checksum = id_number[12]
    
    # Validate date of birth
    try:
        month = int(mm)
        day = int(dd)
        year_suffix = int(yy)
        
        # Determine century (assume people born after 2000 if year < 25, else 1900s)
        current_year = datetime.now().year
        current_year_suffix = current_year % 100
        
        if year_suffix <= current_year_suffix:
            year = 2000 + year_suffix
        else:
            year = 1900 + year_suffix
        
        # Validate date
        date_of_birth = datetime(year, month, day)
        
        # Check if date is not in the future
        if date_of_birth > datetime.now():
            return SAIDValidationResult(
                is_valid=False,
                error="Date of birth cannot be in the future"
            )
            
    except ValueError:
        return SAIDValidationResult(
            is_valid=False,
            error=f"Invalid date of birth: {yy}/{mm}/{dd}"
        )
    
    # Extract gender
    gender_int = int(gender_code)
    if gender_int < 5000:
        gender = "Female"
    else:
        gender = "Male"
    
    # Extract citizenship
    citizenship_int = int(citizenship_code)
    if citizenship_int == 0:
        citizenship = "SA Citizen"
    elif citizenship_int == 1:
        citizenship = "Permanent Resident"
    else:
        citizenship = "Other"
    
    # Validate checksum using Luhn algorithm
    if not _validate_luhn_checksum(id_number):
        return SAIDValidationResult(
            is_valid=False,
            error="Invalid ID number (checksum failed)"
        )
    
    # Calculate age
    age = (datetime.now() - date_of_birth).days // 365
    
    return SAIDValidationResult(
        is_valid=True,
        data={
            "date_of_birth": date_of_birth.strftime("%Y-%m-%d"),
            "gender": gender,
            "citizenship_status": citizenship,
            "age": age
        }
    )


def _validate_luhn_checksum(id_number: str) -> bool:
    """
    Validate ID number checksum using Luhn algorithm.
    
    Args:
        id_number: 13-digit ID number
        
    Returns:
        True if checksum is valid, False otherwise
    """
    # Take first 12 digits
    digits = [int(d) for d in id_number[:12]]
    
    # Step 1: Add digits in odd positions (1st, 3rd, 5th, etc.)
    odd_sum = sum(digits[i] for i in range(0, 12, 2))
    
    # Step 2: Multiply even position digits by 2 and concatenate
    even_digits = [digits[i] for i in range(1, 12, 2)]
    even_concat = ''.join(str(d * 2) for d in even_digits)
    
    # Step 3: Add individual digits of the concatenated result
    even_sum = sum(int(d) for d in even_concat)
    
    # Step 4: Add odd_sum and even_sum
    total = odd_sum + even_sum
    
    # Step 5: Subtract from next multiple of 10
    checksum_calc = (10 - (total % 10)) % 10
    
    # Compare with actual checksum
    actual_checksum = int(id_number[12])
    
    return checksum_calc == actual_checksum


def extract_info_from_sa_id(id_number: str) -> Optional[Dict]:
    """
    Quick helper to extract info from SA ID without full validation.
    Returns None if invalid.
    
    Args:
        id_number: 13-digit SA ID number
        
    Returns:
        Dictionary with extracted data or None if invalid
    """
    result = validate_sa_id(id_number)
    return result.data if result.is_valid else None
