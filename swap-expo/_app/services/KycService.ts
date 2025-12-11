/**
 * KYC Service - API layer for KYC operations
 *
 * Professional service layer pattern (used by Stripe, Revolut, Square).
 *
 * This service handles pure API calls without navigation concerns.
 * Used by:
 * - useKycCompletion hook (adds navigation on top)
 * - AppLockSetupScreen (direct call, outside NavigationContainer)
 *
 * Why service layer?
 * - Separation of concerns: API calls vs React features (navigation, state)
 * - Single source of truth for API logic
 * - Testable: Pure functions are easy to unit test
 * - Scalable: Add more KYC methods as needed
 */

import apiClient from '../_api/apiClient';
import { invalidateQueries } from '../tanstack-query/queryClient';
import { logger } from '../utils/logger';
import { storePinForBiometric } from '../utils/pinUserStorage';

export interface StorePasscodeResult {
  success: boolean;
  error?: string;
}

export const KycService = {
  /**
   * Store passcode in backend and optionally in Keychain for biometric access
   *
   * Backend stores a hash of the passcode (never plain text) for:
   * - Account recovery (SIM swap protection)
   * - Password reset verification (OTP + PIN required)
   *
   * If profileId is provided, also stores PIN in Keychain for biometric access
   * during profile switching (industry standard - used by banks).
   *
   * @param passcode - 6-digit PIN to store
   * @param profileId - Optional profile ID for biometric storage
   * @returns Result with success status
   */
  async storePasscode(passcode: string, profileId?: string): Promise<StorePasscodeResult> {
    try {
      logger.info('[KycService] Storing passcode in backend...');
      await apiClient.post('/auth/store-passcode', { passcode });

      // Invalidate relevant caches
      invalidateQueries(['kyc']);
      invalidateQueries(['auth']);

      // If profileId provided, also store for biometric access
      if (profileId) {
        try {
          await storePinForBiometric(profileId, passcode);
          logger.info('[KycService] ✅ Passcode also stored for biometric access');
        } catch (biometricError) {
          // Non-fatal - biometric storage is optional
          logger.warn('[KycService] ⚠️ Failed to store for biometric (non-fatal):', biometricError);
        }
      }

      logger.info('[KycService] ✅ Passcode stored successfully');
      return { success: true };
    } catch (error: any) {
      logger.error('[KycService] ❌ Failed to store passcode:', error);
      return {
        success: false,
        error: error?.response?.data?.message || error.message || 'Failed to store passcode',
      };
    }
  },

  // Future: Add other KYC API methods here as needed
  // async uploadDocument(documentType: string, file: any): Promise<...> { }
  // async submitSelfie(selfieData: any): Promise<...> { }
  // async verifyPhone(code: string): Promise<...> { }
};

export default KycService;
