/**
 * useKycStatus Hook
 * 
 * TanStack Query hook for KYC (Know Your Customer) status management.
 * Provides type-safe KYC data fetching with real-time status updates.
 */

import { useQuery } from '@tanstack/react-query';
import { logger } from '../../utils/logger';
import { queryKeys } from '../queryKeys';
import apiClient from '../../_api/apiClient';
import { getStaleTimeForQuery } from '../config/staleTimeConfig';

// KYC status types based on actual backend response
export type KycLevel = 'not_started' | 'pending' | 'approved' | 'rejected';
export type KycDocumentType = 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement';
export type KycDocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface KycDocument {
  id: string;
  document_type: KycDocumentType;
  verification_status: KycDocumentStatus;
  created_at: string;
  updated_at: string;
  document_number?: string;
  review_notes?: string;
  verified_at?: string;
}

export interface KycStepStatus {
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  completed_at?: string;
  data?: any;
}

export interface KycStatus {
  // Entity info
  entity_type: 'profile' | 'business';
  kyc_status: KycLevel;

  // Documents
  documents: KycDocument[];

  // Verification flags
  email_verified: boolean;
  phone_verified: boolean;
  setup_account_completed: boolean;
  personal_info_completed: boolean;
  email_verification_completed: boolean;
  phone_verification_completed: boolean;
  document_verification_completed: boolean;
  selfie_completed: boolean;
  security_setup_completed: boolean;
  biometric_setup_completed: boolean;
  passcode_setup: boolean;
  
  // Contact info
  email?: string;
  phone?: string;
  
  // Completion timestamps
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  setup_account_completed_at?: string;
  personal_info_completed_at?: string;
  email_verification_completed_at?: string;
  phone_verification_completed_at?: string;
  document_verification_completed_at?: string;
  selfie_completed_at?: string;
  security_setup_completed_at?: string;
  biometric_setup_completed_at?: string;
  
  // Step details
  steps: {
    setup_account: KycStepStatus;
    personal_info: KycStepStatus;
    email_verification: KycStepStatus;
    phone_verification: KycStepStatus;
    document_verification: KycStepStatus;
    selfie: KycStepStatus;
    security_setup: KycStepStatus;
    biometric_setup: KycStepStatus;
    business_info?: KycStepStatus;
    business_verification?: KycStepStatus;
    business_security?: KycStepStatus;
  };

  // Process info
  process: any;

  // Compatibility properties for existing code
  currentLevel?: KycLevel;
  isVerificationInProgress?: boolean;
  completedAt?: string;
}

/**
 * Fetch KYC status from API
 */
const fetchKycStatus = async (entityId: string): Promise<KycStatus> => {
  logger.debug('[useKycStatus] Fetching KYC status for entity:', entityId);
  
  try {
    // Use the correct backend endpoint
    const response = await apiClient.get('/kyc/verification-status');
    
    if (response.data) {
      logger.debug(`[useKycStatus] ✅ KYC status fetched successfully: level=${response.data.currentLevel}, inProgress=${response.data.isVerificationInProgress}`);
      return response.data;
    } else {
      throw new Error('No KYC status data received');
    }
  } catch (error) {
    logger.error('[useKycStatus] ❌ Failed to fetch KYC status:', error);
    throw error;
  }
};

/**
 * useKycStatus Hook
 */
export const useKycStatus = (entityId?: string) => {
  return useQuery({
    queryKey: queryKeys.kycStatus(entityId || ''),
    queryFn: () => fetchKycStatus(entityId!),
    enabled: !!entityId,
    staleTime: getStaleTimeForQuery('profile'), // KYC status changes infrequently
    networkMode: 'offlineFirst',
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (no KYC record) or 403 (access denied)
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < 3; // KYC is important, retry more
    },
    meta: {
      errorMessage: 'Failed to load KYC verification status',
    },
  });
};

/**
 * Hook for checking if KYC is required for specific actions
 */
export const useKycRequirement = (entityId?: string, requiredLevel: KycLevel = 'approved') => {
  const { data: kycStatus, isLoading } = useKycStatus(entityId);
  
  if (isLoading || !kycStatus) {
    return { isRequired: false, isBlocked: false, isLoading: true };
  }
  
  const levelHierarchy = { not_started: 0, pending: 1, approved: 2, rejected: 0 };
  const currentLevelValue = levelHierarchy[kycStatus.kyc_status];
  const requiredLevelValue = levelHierarchy[requiredLevel];
  
  return {
    isRequired: currentLevelValue < requiredLevelValue,
    isBlocked: currentLevelValue < requiredLevelValue,
    isLoading: false,
    currentLevel: kycStatus.kyc_status,
    requiredLevel,
    canUpgrade: kycStatus.kyc_status !== 'pending', // Can upgrade if not currently pending
  };
};

/**
 * Hook for getting KYC completion progress
 */
export const useKycProgress = (entityId?: string) => {
  const { data: kycStatus } = useKycStatus(entityId);
  
  if (!kycStatus) return { percentage: 0, completedSteps: 0, totalSteps: 0 };
  
  const steps = kycStatus.steps;
  const stepKeys = Object.keys(steps) as (keyof typeof steps)[];
  const completedSteps = stepKeys.filter(key => steps[key].status === 'completed').length;
  const totalSteps = stepKeys.length;
  
  return {
    percentage: Math.round((completedSteps / totalSteps) * 100),
    completedSteps,
    totalSteps,
    nextStep: stepKeys.find(key => steps[key].status !== 'completed'),
    steps: steps,
  };
};

/**
 * Hook for getting pending KYC documents
 */
export const usePendingKycDocuments = (entityId?: string) => {
  const { data: kycStatus } = useKycStatus(entityId);
  
  if (!kycStatus) return [];
  
  return kycStatus.documents.filter(doc => doc.verification_status === 'pending');
};

/**
 * Hook for getting KYC transaction limits
 */
export const useKycLimits = (entityId?: string) => {
  const { data: kycStatus } = useKycStatus(entityId);
  
  // Return default limits since the backend doesn't provide limits in the response
  const defaultLimits = {
    dailyTransactionLimit: 1000,
    monthlyTransactionLimit: 10000,
    maxSingleTransaction: 500,
    currency: 'USD',
  };
  
  if (!kycStatus) {
    return defaultLimits;
  }
  
  // Adjust limits based on KYC status
  switch (kycStatus.kyc_status) {
    case 'approved':
      return {
        dailyTransactionLimit: 10000,
        monthlyTransactionLimit: 100000,
        maxSingleTransaction: 5000,
        currency: 'USD',
      };
    case 'pending':
      return {
        dailyTransactionLimit: 500,
        monthlyTransactionLimit: 5000,
        maxSingleTransaction: 200,
        currency: 'USD',
      };
    default:
      return defaultLimits;
  }
};

/**
 * Hook for checking transaction limits
 */
export const useTransactionLimitCheck = (entityId?: string, amount: number = 0) => {
  const { data: kycStatus } = useKycStatus(entityId);
  const limits = useKycLimits(entityId);
  
  if (!kycStatus || !limits) {
    return { 
      canTransact: false, 
      exceedsLimit: false, 
      limitType: null as string | null,
      isLoading: true 
    };
  }
  
  // Check against single transaction limit
  if (amount > limits.maxSingleTransaction) {
    return {
      canTransact: false,
      exceedsLimit: true,
      limitType: 'single_transaction',
      isLoading: false,
    };
  }
  
  // For approved users, allow transaction
  if (kycStatus.kyc_status === 'approved') {
    return {
      canTransact: true,
      exceedsLimit: false,
      limitType: null,
      isLoading: false,
    };
  }
  
  // For pending/not_started users, check daily limit
  if (amount > limits.dailyTransactionLimit) {
    return {
      canTransact: false,
      exceedsLimit: true,
      limitType: 'daily_limit',
      isLoading: false,
    };
  }
  
  return {
    canTransact: true,
    exceedsLimit: false,
    limitType: null,
    isLoading: false,
  };
};

export default useKycStatus;