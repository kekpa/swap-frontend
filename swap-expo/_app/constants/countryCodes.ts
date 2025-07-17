// Created: Added countryCodes data for phone input - 2025-05-30
// This file provides a list of country codes for international phone numbers

export interface CountryCode {
  code: string;      // The country dial code (e.g., "+1")
  country: string;   // The country name (e.g., "United States")
  iso: string;       // The ISO country code (e.g., "US")
  flag?: string;     // Optional emoji flag
}

// List of common country codes sorted by frequency of use
export const countryCodes: CountryCode[] = [
  { code: "+509", country: "Haiti", iso: "HT", flag: "🇭🇹" },
  { code: "+1", country: "United States", iso: "US", flag: "🇺🇸" },
  { code: "+44", country: "United Kingdom", iso: "GB", flag: "🇬🇧" },
  { code: "+91", country: "India", iso: "IN", flag: "🇮🇳" },
  { code: "+86", country: "China", iso: "CN", flag: "🇨🇳" },
  { code: "+61", country: "Australia", iso: "AU", flag: "🇦🇺" },
  { code: "+49", country: "Germany", iso: "DE", flag: "🇩🇪" },
  { code: "+33", country: "France", iso: "FR", flag: "🇫🇷" },
  { code: "+81", country: "Japan", iso: "JP", flag: "🇯🇵" },
  { code: "+55", country: "Brazil", iso: "BR", flag: "🇧🇷" },
  { code: "+7", country: "Russia", iso: "RU", flag: "🇷🇺" },
  { code: "+39", country: "Italy", iso: "IT", flag: "🇮🇹" },
  { code: "+52", country: "Mexico", iso: "MX", flag: "🇲🇽" },
  { code: "+34", country: "Spain", iso: "ES", flag: "🇪🇸" },
  { code: "+82", country: "South Korea", iso: "KR", flag: "🇰🇷" },
  { code: "+65", country: "Singapore", iso: "SG", flag: "🇸🇬" },
  { code: "+60", country: "Malaysia", iso: "MY", flag: "🇲🇾" },
  { code: "+66", country: "Thailand", iso: "TH", flag: "🇹🇭" },
  { code: "+63", country: "Philippines", iso: "PH", flag: "🇵🇭" },
  { code: "+62", country: "Indonesia", iso: "ID", flag: "🇮🇩" },
  { code: "+84", country: "Vietnam", iso: "VN", flag: "🇻🇳" },
  { code: "+971", country: "United Arab Emirates", iso: "AE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", iso: "SA", flag: "🇸🇦" },
  { code: "+27", country: "South Africa", iso: "ZA", flag: "🇿🇦" },
  { code: "+234", country: "Nigeria", iso: "NG", flag: "🇳🇬" },
  { code: "+20", country: "Egypt", iso: "EG", flag: "🇪🇬" },
  { code: "+90", country: "Turkey", iso: "TR", flag: "🇹🇷" },
  { code: "+48", country: "Poland", iso: "PL", flag: "🇵🇱" },
  { code: "+31", country: "Netherlands", iso: "NL", flag: "🇳🇱" },
  { code: "+46", country: "Sweden", iso: "SE", flag: "🇸🇪" },
  { code: "+41", country: "Switzerland", iso: "CH", flag: "🇨🇭" }
];

// Helper function to find a country code by ISO code
export const findCountryByIso = (iso: string): CountryCode | undefined => {
  return countryCodes.find(country => country.iso.toLowerCase() === iso.toLowerCase());
};

// Helper function to find a country code by dial code
export const findCountryByDialCode = (dialCode: string): CountryCode | undefined => {
  // Ensure the dial code has a "+" prefix
  const formattedDialCode = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;
  return countryCodes.find(country => country.code === formattedDialCode);
};

export default countryCodes; 