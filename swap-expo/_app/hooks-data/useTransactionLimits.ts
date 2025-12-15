// Created: Hook for fetching transaction limits from TierLimitsService - 2025-01-XX
import { useQuery } from '@tanstack/react-query';
import apiClient from '../_api/apiClient';
import logger from '../utils/logger';

/**
 * Individual transaction limit
 */
export interface TierLimit {
  per_transaction_limit: number | null;
  daily_limit: number | null;
  weekly_limit: number | null;
  monthly_limit: number | null;
  enabled: boolean;
  requires_approval: boolean;
}

/**
 * Limits organized by currency and transaction type
 */
export interface TransactionLimits {
  [currency: string]: {
    send?: TierLimit;
    receive?: TierLimit;
    withdraw?: TierLimit;
    deposit?: TierLimit;
  };
}

/**
 * Account tier information
 */
export interface AccountTier {
  id: string;
  tier_level: number;
  tier_name: string;
  display_name: string;
}

/**
 * Response from the tiers eligibility endpoint
 */
export interface TierEligibilityResponse {
  eligible: boolean;
  kycStatus: string;
  reason?: 'KYC_REQUIRED' | 'ACCOUNT_SUSPENDED' | 'UNABLE_TO_DETERMINE_LIMITS';
  limits?: TransactionLimits;
  tier?: AccountTier;
}

/**
 * Hook options
 */
interface UseTransactionLimitsOptions {
  enabled?: boolean;
}

/**
 * Hook for fetching transaction limits and tier eligibility
 *
 * This hook fetches:
 * - KYC status from kyc_process (source of truth)
 * - Account tier (Free, Premium, Business)
 * - Transaction limits per currency and transaction type
 *
 * @param entityId - The entity ID to fetch limits for
 * @param options - Optional configuration
 */
export const useTransactionLimits = (
  entityId: string,
  options: UseTransactionLimitsOptions = {}
) => {
  const { enabled = true } = options;

  // Validate entityId
  const isValidEntityId =
    entityId &&
    entityId.trim().length > 0 &&
    entityId !== 'undefined' &&
    entityId !== 'null';

  return useQuery({
    queryKey: ['tier_eligibility', entityId],
    queryFn: async (): Promise<TierEligibilityResponse> => {
      if (!isValidEntityId) {
        throw new Error('Invalid entity ID');
      }

      logger.debug(`[useTransactionLimits] 🔍 Fetching limits for entity: ${entityId}`);
      const response = await apiClient.get(`/tiers/eligibility/${entityId}`);

      // API returns { success: true, data: {...} }
      const data = response.data?.data || response.data;

      logger.debug(`[useTransactionLimits] ✅ Limits result:`, JSON.stringify({
        eligible: data.eligible,
        kycStatus: data.kycStatus,
        tier: data.tier?.display_name,
        hasLimits: !!data.limits,
      }));

      return data;
    },
    enabled: Boolean(enabled && isValidEntityId),
    staleTime: 1000 * 60 * 5, // 5 minutes - limits don't change often
    networkMode: 'always',
  });
};

/**
 * Helper to check if a specific transaction would be allowed
 */
export const useCheckTransaction = (
  entityId: string,
  options: UseTransactionLimitsOptions = {}
) => {
  const { enabled = true } = options;

  const isValidEntityId =
    entityId &&
    entityId.trim().length > 0 &&
    entityId !== 'undefined' &&
    entityId !== 'null';

  return useQuery({
    queryKey: ['check_transaction', entityId],
    queryFn: async () => {
      // This is a placeholder - actual check would need amount, type, currency
      // For now, just return the eligibility
      if (!isValidEntityId) {
        throw new Error('Invalid entity ID');
      }

      const response = await apiClient.get(`/tiers/limits/${entityId}`);
      return response.data?.data || response.data;
    },
    enabled: false, // Only run when explicitly called
  });
};

/**
 * Helper function to format limit for display
 */
export const formatLimit = (limit: number | null, currencyCode: string): string => {
  if (limit === null) return 'Unlimited';

  if (currencyCode === 'HTG') {
    return `G${limit.toLocaleString()}`;
  }

  return `$${limit.toLocaleString()}`;
};

/**
 * Helper function to get the display limit for a transaction type
 */
export const getDisplayLimit = (
  limits: TransactionLimits | undefined,
  currencyCode: string,
  transactionType: 'send' | 'receive' | 'withdraw' | 'deposit'
): { daily: string; perTransaction: string; enabled: boolean } => {
  if (!limits || !limits[currencyCode]) {
    return { daily: 'N/A', perTransaction: 'N/A', enabled: false };
  }

  const limit = limits[currencyCode][transactionType];
  if (!limit) {
    return { daily: 'N/A', perTransaction: 'N/A', enabled: false };
  }

  return {
    daily: formatLimit(limit.daily_limit, currencyCode),
    perTransaction: formatLimit(limit.per_transaction_limit, currencyCode),
    enabled: limit.enabled,
  };
};
