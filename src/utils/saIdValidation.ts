/**
 * South African ID Number Validation and Parsing
 * 
 * Format: YYMMDD SSSS C A Z
 * - YYMMDD: Date of birth
 * - SSSS: Gender (0000-4999 = Female, 5000-9999 = Male)
 * - C: Citizenship (0 = SA Citizen, 1 = Permanent Resident)
 * - A: Usually 8 or 9 (race, now obsolete)
 * - Z: Checksum digit
 */

export interface SAIdInfo {
  isValid: boolean;
  dateOfBirth?: string; // ISO format YYYY-MM-DD
  gender?: 'male' | 'female';
  citizenship?: 'citizen' | 'permanent_resident';
  error?: string;
}

/**
 * Validate and parse a South African ID number
 */
export function validateSAId(idNumber: string): SAIdInfo {
  // Remove spaces and non-digits
  const cleaned = idNumber.replace(/\D/g, '');

  // Must be exactly 13 digits
  if (cleaned.length !== 13) {
    return {
      isValid: false,
      error: 'ID number must be exactly 13 digits',
    };
  }

  // Validate checksum using Luhn algorithm
  if (!luhnCheck(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid ID number (checksum failed)',
    };
  }

  // Extract date of birth (YYMMDD)
  const year = cleaned.substring(0, 2);
  const month = cleaned.substring(2, 4);
  const day = cleaned.substring(4, 6);

  // Determine century (assume people are not older than 100)
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100);
  const twoDigitYear = currentYear % 100;
  
  let fullYear: number;
  if (parseInt(year) <= twoDigitYear) {
    fullYear = currentCentury * 100 + parseInt(year);
  } else {
    fullYear = (currentCentury - 1) * 100 + parseInt(year);
  }

  // Validate date
  const dateOfBirth = `${fullYear}-${month}-${day}`;
  const date = new Date(dateOfBirth);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date of birth in ID number',
    };
  }

  // Extract gender (SSSS)
  const genderDigits = parseInt(cleaned.substring(6, 10));
  const gender = genderDigits < 5000 ? 'female' : 'male';

  // Extract citizenship (C)
  const citizenshipDigit = cleaned.substring(10, 11);
  const citizenship = citizenshipDigit === '0' ? 'citizen' : 'permanent_resident';

  return {
    isValid: true,
    dateOfBirth,
    gender,
    citizenship,
  };
}

/**
 * Luhn algorithm checksum validation
 */
function luhnCheck(idNumber: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  // Process digits from right to left
  for (let i = idNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(idNumber.charAt(i));

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}
