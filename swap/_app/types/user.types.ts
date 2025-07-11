/**
 * User and profile related types for the frontend
 */

// KYC status enum
export enum KycStatus {
  NOT_SUBMITTED = 'not_submitted',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

// Profile status enum
export enum ProfileStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

// Profile interface for user details
export interface Profile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  phone_number?: string;
  country_code?: string;
  avatar_url?: string;
  kyc_status: KycStatus;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
  p2p_display_preferences?: Record<string, any>;
  discovery_settings?: Record<string, any>;
}

// KYC document verification status
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

// Document type enum
export enum DocumentType {
  PASSPORT = 'passport',
  NATIONAL_ID = 'national_id',
  UTILITY_BILL = 'utility_bill',
  BANK_STATEMENT = 'bank_statement',
  DRIVERS_LICENSE = 'drivers_license'
}

// KYC document interface
export interface KycDocument {
  id: string;
  profile_id: string;
  document_type: DocumentType;
  document_number?: string;
  document_url: string;
  verification_status: VerificationStatus;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
  verified_at?: string;
}

// KYC verification requirement
export interface VerificationRequirement {
  type: DocumentType;
  required: boolean;
  description: string;
  status: string;
  submitted_at?: string;
}

// Profile search parameters
export interface SearchProfilesDto {
  username?: string;
  country_code?: string;
  query?: string;
} 