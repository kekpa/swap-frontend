/**
 * useKycStatus Hook
 * 
 * TanStack Query hook for KYC (Know Your Customer) status management.
 * Provides type-safe KYC data fetching with real-time status updates.
 */

import { useQuery } from '@tanstack/react-query';
import { logger } from '../../utils/logger';
import { queryKeys } from '../queryKeys';
import { apiClient } from '../../services/ApiClient';
import { getStaleTimeForQuery } from '../config/staleTimeConfig';

// KYC status types
export type KycLevel = 'none' | 'basic' | 'intermediate' | 'advanced';
export type KycDocumentType = 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement';
export type KycDocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface KycDocument {
  id: string;
  type: KycDocumentType;
  status: KycDocumentStatus;
  uploadedAt: string;
  reviewedAt?: string;
  expiresAt?: string;
  rejectionReason?: string;
  documentUrl?: string; // Should not be exposed to frontend for security
}

export interface KycStatus {
  entityId: string;
  currentLevel: KycLevel;
  targetLevel?: KycLevel;
  isVerificationInProgress: boolean;
  completedAt?: string;
  lastUpdatedAt: string;
  
  // Document verification
  documents: KycDocument[];
  requiredDocuments: KycDocumentType[];
  
  // Verification steps
  steps: {
    personalInfo: {
      completed: boolean;
      completedAt?: string;
    };
    documentUpload: {
      completed: boolean;
      completedAt?: string;
      pendingDocuments: KycDocumentType[];
    };
    identityVerification: {
      completed: boolean;
      completedAt?: string;
      method?: 'selfie' | 'video_call' | 'biometric';
    };
    addressVerification: {
      completed: boolean;
      completedAt?: string;
    };
    backgroundCheck: {
      completed: boolean;
      completedAt?: string;
      status?: 'clear' | 'flagged' | 'pending';
    };
  };
  
  // Limits and capabilities
  limits: {
    dailyTransactionLimit: number;
    monthlyTransactionLimit: number;
    maxSingleTransaction: number;
    currency: string;
  };
  
  // Next steps
  nextSteps?: Array<{
    step: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedCompletionTime?: string;
  }>;
}

/**
 * Fetch KYC status from API
 */
const fetchKycStatus = async (entityId: string): Promise<KycStatus> => {
  logger.debug('[useKycStatus] Fetching KYC status for entity:', entityId);
  
  try {
    const response = await apiClient.get(`/kyc/${entityId}/status`);
    
    if (response.data) {
      logger.debug('[useKycStatus] ✅ KYC status fetched successfully:', {
        level: response.data.currentLevel,
        inProgress: response.data.isVerificationInProgress,
      });
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
export const useKycRequirement = (entityId?: string, requiredLevel: KycLevel = 'basic') => {
  const { data: kycStatus, isLoading } = useKycStatus(entityId);
  
  if (isLoading || !kycStatus) {
    return { isRequired: false, isBlocked: false, isLoading: true };
  }
  
  const levelHierarchy = { none: 0, basic: 1, intermediate: 2, advanced: 3 };
  const currentLevelValue = levelHierarchy[kycStatus.currentLevel];
  const requiredLevelValue = levelHierarchy[requiredLevel];
  
  return {
    isRequired: currentLevelValue < requiredLevelValue,
    isBlocked: currentLevelValue < requiredLevelValue,
    isLoading: false,
    currentLevel: kycStatus.currentLevel,
    requiredLevel,
    canUpgrade: !kycStatus.isVerificationInProgress,
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
  const completedSteps = stepKeys.filter(key => steps[key].completed).length;
  const totalSteps = stepKeys.length;
  
  return {
    percentage: Math.round((completedSteps / totalSteps) * 100),
    completedSteps,
    totalSteps,
    nextStep: stepKeys.find(key => !steps[key].completed),
    steps: steps,
  };
};

/**
 * Hook for getting pending KYC documents
 */
export const usePendingKycDocuments = (entityId?: string) => {
  const { data: kycStatus } = useKycStatus(entityId);
  
  if (!kycStatus) return [];
  
  return kycStatus.documents.filter(doc => doc.status === 'pending');
};

/**
 * Hook for getting KYC transaction limits
 */
export const useKycLimits = (entityId?: string) => {
  const { data: kycStatus } = useKycStatus(entityId);
  
  if (!kycStatus) {
    return {
      dailyTransactionLimit: 0,
      monthlyTransactionLimit: 0,
      maxSingleTransaction: 0,
      currency: 'USD',
    };
  }
  
  return kycStatus.limits;
};

/**
 * Hook for checking if a transaction amount is within KYC limits
 */
export const useTransactionLimitCheck = (entityId?: string, amount: number = 0) => {
  const { data: kycStatus } = useKycStatus(entityId);
  
  if (!kycStatus) {
    return { isWithinLimits: false, exceedsDaily: false, exceedsMonthly: false, exceedsSingle: false };
  }
  
  const { dailyTransactionLimit, monthlyTransactionLimit, maxSingleTransaction } = kycStatus.limits;
  
  return {
    isWithinLimits: amount <= maxSingleTransaction && amount <= dailyTransactionLimit && amount <= monthlyTransactionLimit,
    exceedsDaily: amount > dailyTransactionLimit,
    exceedsMonthly: amount > monthlyTransactionLimit,
    exceedsSingle: amount > maxSingleTransaction,
    limits: kycStatus.limits,
  };
};

export default useKycStatus;