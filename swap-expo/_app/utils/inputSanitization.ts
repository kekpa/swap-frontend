/**
 * Input sanitization and validation utilities for secure form handling
 */

// XSS protection - remove potentially dangerous characters
export const sanitizeText = (input: string): string => {
  if (!input) return '';

  return input
    .replace(/[<>'"&]/g, '') // Remove basic XSS characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
};

// Name validation and sanitization
export const sanitizeName = (name: string): string => {
  if (!name) return '';

  return name
    .replace(/[^a-zA-ZÀ-ÿŠšŽžœŒæÆęĘćĆźŹłŁĄą\s\-'\.]/g, '') // Allow letters, accents, hyphens, apostrophes, dots
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[-'\.]{2,}/g, '') // Remove consecutive special characters
    .trim()
    .slice(0, 50); // Limit to 50 characters
};

// Username validation and sanitization
export const sanitizeUsername = (username: string): string => {
  if (!username) return '';

  return username
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '') // Only alphanumeric and underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .slice(0, 20); // Limit to 20 characters
};

// Business name sanitization
export const sanitizeBusinessName = (businessName: string): string => {
  if (!businessName) return '';

  return businessName
    .replace(/[<>'"]/g, '') // Remove XSS characters (keep & for business names like "A & B Corp")
    .replace(/[^a-zA-Z0-9À-ÿŠšŽžœŒæÆęĘćĆźŹłŁĄą\s\-&.,()]/g, '') // Allow alphanumeric, accents, spaces, and business chars
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
    .slice(0, 100); // Limit to 100 characters
};

// Registration number sanitization
export const sanitizeRegistrationNumber = (regNumber: string): string => {
  if (!regNumber) return '';

  return regNumber
    .replace(/[^a-zA-Z0-9\-]/g, '') // Only alphanumeric and hyphens
    .toUpperCase()
    .slice(0, 20); // Limit to 20 characters
};

// Email validation (enhanced)
export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Invalid email format' };
  }

  // Length check
  if (email.length > 254) {
    return { isValid: false, message: 'Email too long' };
  }

  // Domain validation
  const domain = email.split('@')[1];
  if (domain && domain.length > 253) {
    return { isValid: false, message: 'Domain name too long' };
  }

  return { isValid: true };
};

// Phone number validation (already handled well in phoneUtils.ts)
export const validatePhoneNumber = (phone: string, countryCode: string): { isValid: boolean; message?: string } => {
  if (!phone) {
    return { isValid: false, message: 'Phone number is required' };
  }

  const cleanPhone = phone.replace(/[^\d]/g, '');

  // Basic length validation
  if (cleanPhone.length < 6 || cleanPhone.length > 15) {
    return { isValid: false, message: 'Phone number must be 6-15 digits' };
  }

  // Country-specific validation could be added here
  return { isValid: true };
};

// Password validation (already handled in usePasswordStrength hook)
export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { isValid: false, message: 'Password too long' };
  }

  return { isValid: true };
};

// General text input validation
export const validateTextInput = (
  input: string,
  minLength: number = 0,
  maxLength: number = 255,
  fieldName: string = 'Field'
): { isValid: boolean; message?: string } => {
  if (minLength > 0 && (!input || input.trim().length < minLength)) {
    return { isValid: false, message: `${fieldName} must be at least ${minLength} characters` };
  }

  if (input && input.trim().length > maxLength) {
    return { isValid: false, message: `${fieldName} cannot exceed ${maxLength} characters` };
  }

  return { isValid: true };
};