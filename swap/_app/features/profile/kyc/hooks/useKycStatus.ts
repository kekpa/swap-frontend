// Created: Added useKycStatus hook to fetch real verification status - 2025-06-03
// Updated: Fixed verifyId step completion to check for submitted documents (pending) not just verified documents (approved) - 2025-06-07
// Updated: Added active document tracking interfaces (is_active, active_document_type) for improved UX - 2025-06-07
// Updated: Fixed selfie and passcode completion tracking to use real backend status instead of hardcoded false - 2025-06-07
// Updated: Refactored to work with new service response structure including document_verification_completed, security_setup_completed, and steps object - 2025-01-26
// Updated: Fixed access logic to make all steps accessible (not greyed out) while maintaining proper completion and active state - 2025-01-26
// Updated: Added biometric device detection to make biometric step conditional based on device capabilities - 2025-01-26
// Updated: Simplified biometric step logic to ensure it's always accessible when hardware is present - 2025-06-27
// Updated: Replaced individual API calls with DataContext integration for better performance - 2025-01-27
import { useMemo } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useData } from '../../../../contexts/DataContext';
import logger from '../../../../utils/logger';

export interface KycDocument {
  id: string;
  entity_id: string;
  document_type: string;
  document_number?: string;
  document_url?: string;
  document_side: 'front' | 'back' | 'single';
  verification_status: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KycRequirement {
  type: string;
  required: boolean;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  submitted_at?: string;
  is_active?: boolean;
}

export interface KycStepDetail {
  status: string;
  completed_at: string | null;
  started_at: string | null;
}

export interface KycProcess {
  id: string;
  entity_id: string;
  overall_status: string;
  created_at: string;
  updated_at: string;
}

export interface KycStatus {
  kyc_status: 'pending' | 'approved' | 'rejected' | 'not_started' | 'not_submitted';
  documents: KycDocument[];
  email_verified: boolean;
  phone_verified: boolean;
  email: string | null;
  phone: string | null;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  personal_info_completed: boolean;
  email_verification_completed: boolean;
  phone_verification_completed: boolean;
  document_verification_completed: boolean;
  selfie_completed: boolean;
  security_setup_completed: boolean;
  biometric_setup_completed: boolean;
  passcode_setup: boolean;
  personal_info_completed_at: string | null;
  email_verification_completed_at: string | null;
  phone_verification_completed_at: string | null;
  document_verification_completed_at: string | null;
  selfie_completed_at: string | null;
  security_setup_completed_at: string | null;
  biometric_setup_completed_at: string | null;
  steps: {
    personal_info?: KycStepDetail;
    email_verification?: KycStepDetail;
    phone_verification?: KycStepDetail;
    document_verification?: KycStepDetail;
    selfie?: KycStepDetail;
    security_setup?: KycStepDetail;
    biometric_setup?: KycStepDetail;
  };
  process?: {
    id: string;
    overall_status: string;
    created_at: string;
    updated_at: string;
  };
}

export interface KycRequirements {
  current_status: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  active_document_type?: string;
  requirements: KycRequirement[];
}

export interface VerificationStepStatus {
  isCompleted: boolean;
  isActive: boolean;
  canAccess: boolean;
}

export interface VerificationStatusData {
  setupAccount: VerificationStepStatus;
  confirmPhone: VerificationStepStatus;
  confirmEmail: VerificationStepStatus;
  personalInfo: VerificationStepStatus;
  verifyId: VerificationStepStatus;
  takeSelfie: VerificationStepStatus;
  setupSecurity: VerificationStepStatus;
  biometricSetup: VerificationStepStatus;
}

export const useKycStatus = () => {
  // Get data from DataContext instead of making individual API calls
  const { 
    kycStatus, 
    verificationStatus, 
    isLoadingUserData, 
    refreshUserData 
  } = useData();
  
  console.log("🔥 [useKycStatus] 📊 DataContext data:", {
    hasKycStatus: !!kycStatus,
    hasVerificationStatus: !!verificationStatus,
    isLoadingUserData,
    verificationStatus
  });

  // Check for biometric hardware availability
  const isBiometricAvailable = useMemo(() => {
    // For now, assume biometric is available - the individual screens will handle the actual check
    // This prevents the verification steps from being hidden due to biometric availability
    return true;
  }, []);

  // Mock requirements for compatibility
  const requirements = useMemo(() => ({
    current_status: 'not_submitted' as const,
    requirements: [] as KycRequirement[]
  }), []);
      
  logger.debug('[useKycStatus] Using cached data from DataContext', 'kyc', { 
    hasKycStatus: !!kycStatus,
    hasVerificationStatus: !!verificationStatus,
    isLoading: isLoadingUserData 
  });

  return {
    kycStatus,
    requirements,
    verificationStatus,
    isLoading: isLoadingUserData,
    error: null, // DataContext would handle errors
    refreshStatus: refreshUserData,
    isBiometricAvailable,
  };
}; 