// Updated: Enhanced phone number utilities for scalable international formatting - 2025-06-26

/**
 * Country code mappings with their typical local number formats
 * This helps identify country codes and their expected local number patterns
 */
const COUNTRY_CODE_PATTERNS = [
  // North America (NANP)
  { code: '+1', minLength: 10, maxLength: 10, pattern: /^\d{10}$/ },
  
  // Caribbean and Central America
  { code: '+509', minLength: 8, maxLength: 8, pattern: /^\d{8}$/ }, // Haiti
  { code: '+590', minLength: 9, maxLength: 9, pattern: /^\d{9}$/ }, // Guadeloupe
  { code: '+596', minLength: 9, maxLength: 9, pattern: /^\d{9}$/ }, // Martinique
  
  // Europe
  { code: '+33', minLength: 9, maxLength: 9, pattern: /^\d{9}$/ }, // France
  { code: '+44', minLength: 10, maxLength: 11, pattern: /^\d{10,11}$/ }, // UK
  { code: '+49', minLength: 10, maxLength: 12, pattern: /^\d{10,12}$/ }, // Germany
  { code: '+34', minLength: 9, maxLength: 9, pattern: /^\d{9}$/ }, // Spain
  { code: '+39', minLength: 9, maxLength: 11, pattern: /^\d{9,11}$/ }, // Italy
  
  // Add more as needed - this is extensible
];

/**
 * Parses a full international phone number and extracts the country code and local number
 * @param fullPhoneNumber The complete international phone number (e.g., "+50944965234")
 * @returns Object with countryCode and localNumber, or null if parsing fails
 */
export const parseInternationalPhoneNumber = (fullPhoneNumber: string): { countryCode: string; localNumber: string } | null => {
  if (!fullPhoneNumber || !fullPhoneNumber.startsWith('+')) {
    return null;
  }

  // Clean the number (remove spaces, dashes, parentheses)
  const cleaned = fullPhoneNumber.replace(/[\s-()]/g, '');

  // Try to match against known country code patterns
  for (const pattern of COUNTRY_CODE_PATTERNS) {
    if (cleaned.startsWith(pattern.code)) {
      const localPart = cleaned.substring(pattern.code.length);
      
      // Validate local number length and pattern
      if (localPart.length >= pattern.minLength && 
          localPart.length <= pattern.maxLength && 
          pattern.pattern.test(localPart)) {
        return {
          countryCode: pattern.code,
          localNumber: localPart
        };
      }
    }
  }

  // Fallback: try common country code lengths (1-4 digits)
  for (let codeLength = 4; codeLength >= 1; codeLength--) {
    const potentialCode = cleaned.substring(0, codeLength + 1); // +1 for the '+' sign
    const potentialLocal = cleaned.substring(codeLength + 1);
    
    // Basic validation: local number should be at least 6 digits
    if (potentialLocal.length >= 6 && /^\d+$/.test(potentialLocal)) {
      return {
        countryCode: potentialCode,
        localNumber: potentialLocal
      };
    }
  }

  return null;
};

/**
 * Combines a country code and local number into a full international number
 * @param countryCode The country code (e.g., "+509")
 * @param localNumber The local number (e.g., "44965234")
 * @returns The full international number (e.g., "+50944965234")
 */
export const combinePhoneNumber = (countryCode: string, localNumber: string): string => {
  const cleanCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  const cleanLocal = localNumber.replace(/[\s-()]/g, '');
  return `${cleanCode}${cleanLocal}`;
};

/**
 * Normalizes a phone number by removing the leading zero for specific country codes.
 * This is common for countries like France (+33), where a leading '0' is used for
 * national dialing but must be removed for international formatting.
 * 
 * @param phoneNumber The phone number entered by the user.
 * @param countryCode The selected international country code (e.g., '+33').
 * @returns The normalized phone number.
 */
export const normalizePhoneNumber = (phoneNumber: string, countryCode: string): string => {
  let normalized = phoneNumber.replace(/[\s-()]/g, ''); // Remove spaces, dashes, parentheses

  // Rule for France (+33)
  if (countryCode === '+33' && normalized.startsWith('0')) {
    return normalized.substring(1);
  }

  // Rule for UK (+44)
  if (countryCode === '+44' && normalized.startsWith('0')) {
    return normalized.substring(1);
  }

  // Add more rules for other countries here as needed
  return normalized;
};

/**
 * Formats a phone number for display based on country-specific patterns
 * @param localNumber The local phone number
 * @param countryCode The country code
 * @returns Formatted phone number for display
 */
export const formatPhoneNumberForDisplay = (localNumber: string, countryCode: string): string => {
  const clean = localNumber.replace(/[\s-()]/g, '');
  
  switch (countryCode) {
    case '+1': // NANP (US, Canada, etc.)
      if (clean.length === 10) {
        return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
      }
      break;
    case '+509': // Haiti
      if (clean.length === 8) {
        return `${clean.slice(0, 4)} ${clean.slice(4)}`;
      }
      break;
    case '+33': // France
      if (clean.length === 9) {
        return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)} ${clean.slice(8)}`;
      }
      break;
    case '+44': // UK
      // UK formatting is complex, simplified version
      if (clean.length >= 10) {
        return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
      }
      break;
  }
  
  // Default: just return the clean number
  return clean;
}; 