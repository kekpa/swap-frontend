/**
 * WalletSecurity - Wallet Access Control Service
 *
 * Handles wallet-level security:
 * - Wallet unlock via biometric or PIN
 * - Session timeout management
 * - Integration with AppLockService
 *
 * Revolut-style: If app lock is configured and session valid, wallet access is automatic.
 *
 * @author Swap Team
 * @version 1.0.0
 */

import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import appLockService from '../AppLockService';
import logger from '../../utils/logger';
import { AuthLevel } from '../../types/auth.types';

// Storage key for last wallet unlock time
const LAST_WALLET_UNLOCK_KEY = 'last_wallet_unlock';

// Session timeout for wallet operations (5 minutes)
const WALLET_SESSION_TIMEOUT = 5 * 60 * 1000;

export interface WalletSecurityState {
  isUnlocked: boolean;
  lastUnlock: number | null;
  authLevel: AuthLevel;
}

export interface WalletAccessResult {
  success: boolean;
  authLevel: AuthLevel;
  error?: string;
}

class WalletSecurity {
  private static instance: WalletSecurity;
  private isUnlocked: boolean = false;
  private lastUnlock: number | null = null;

  private constructor() {
    logger.debug('[WalletSecurity] Initialized');
  }

  static getInstance(): WalletSecurity {
    if (!WalletSecurity.instance) {
      WalletSecurity.instance = new WalletSecurity();
    }
    return WalletSecurity.instance;
  }

  /**
   * Request wallet access
   * Uses AppLockService if configured, otherwise direct biometric
   */
  async requestAccess(currentAuthLevel: AuthLevel): Promise<WalletAccessResult> {
    // Must be authenticated first
    if (currentAuthLevel < AuthLevel.AUTHENTICATED) {
      return {
        success: false,
        authLevel: currentAuthLevel,
        error: 'Not authenticated'
      };
    }

    // Check if wallet session is still valid
    if (this.isSessionValid()) {
      logger.debug('[WalletSecurity] Session still valid');
      return {
        success: true,
        authLevel: AuthLevel.WALLET_VERIFIED
      };
    }

    // Check if AppLock is configured (Revolut-style unified unlock)
    const isLockConfigured = await appLockService.isConfigured();

    if (isLockConfigured) {
      return this.requestAccessViaAppLock();
    }

    // Legacy: Direct biometric if AppLock not configured
    return this.requestAccessViaBiometric();
  }

  /**
   * Request access via AppLockService
   */
  private async requestAccessViaAppLock(): Promise<WalletAccessResult> {
    try {
      if (!appLockService.isLocked()) {
        // App is unlocked = wallet access granted
        logger.debug('[WalletSecurity] Access granted via app lock session');
        this.unlock();
        return {
          success: true,
          authLevel: AuthLevel.WALLET_VERIFIED
        };
      }

      // App is locked - request unlock
      logger.debug('[WalletSecurity] App locked, requesting unlock...');
      const result = await appLockService.autoUnlock();

      if (result.success) {
        this.unlock();
        return {
          success: true,
          authLevel: AuthLevel.WALLET_VERIFIED
        };
      }

      return {
        success: false,
        authLevel: AuthLevel.AUTHENTICATED,
        error: 'App lock unlock failed'
      };

    } catch (error: any) {
      logger.error('[WalletSecurity] AppLock access error:', error);
      return {
        success: false,
        authLevel: AuthLevel.AUTHENTICATED,
        error: error.message
      };
    }
  }

  /**
   * Request access via direct biometric (legacy fallback)
   */
  private async requestAccessViaBiometric(): Promise<WalletAccessResult> {
    try {
      logger.debug('[WalletSecurity] Requesting direct biometric authentication');

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        logger.warn('[WalletSecurity] Biometric not available');
        return {
          success: false,
          authLevel: AuthLevel.AUTHENTICATED,
          error: 'Biometric not available'
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Access your wallet',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        this.unlock();
        return {
          success: true,
          authLevel: AuthLevel.WALLET_VERIFIED
        };
      }

      return {
        success: false,
        authLevel: AuthLevel.AUTHENTICATED,
        error: 'Biometric authentication cancelled'
      };

    } catch (error: any) {
      logger.error('[WalletSecurity] Biometric access error:', error);
      return {
        success: false,
        authLevel: AuthLevel.AUTHENTICATED,
        error: error.message
      };
    }
  }

  /**
   * Unlock wallet and start session
   */
  private async unlock(): Promise<void> {
    const now = Date.now();
    this.isUnlocked = true;
    this.lastUnlock = now;

    // Persist unlock time
    try {
      await SecureStore.setItemAsync(LAST_WALLET_UNLOCK_KEY, now.toString());
    } catch (error) {
      logger.error('[WalletSecurity] Failed to persist unlock time', error, 'auth');
    }

    logger.debug('[WalletSecurity] Wallet unlocked');
  }

  /**
   * Lock wallet (security measure)
   */
  async lock(): Promise<void> {
    this.isUnlocked = false;
    this.lastUnlock = null;

    try {
      await SecureStore.deleteItemAsync(LAST_WALLET_UNLOCK_KEY);
    } catch (error) {
      logger.error('[WalletSecurity] Failed to clear unlock time', error, 'auth');
    }

    logger.debug('[WalletSecurity] Wallet locked');
  }

  /**
   * Check if wallet session is still valid
   */
  isSessionValid(): boolean {
    if (!this.isUnlocked || !this.lastUnlock) {
      return false;
    }

    const now = Date.now();
    return (now - this.lastUnlock) < WALLET_SESSION_TIMEOUT;
  }

  /**
   * Restore wallet state from storage (on app resume)
   */
  async restoreState(): Promise<boolean> {
    try {
      const lastUnlockStr = await SecureStore.getItemAsync(LAST_WALLET_UNLOCK_KEY);
      if (!lastUnlockStr) {
        return false;
      }

      const lastUnlock = parseInt(lastUnlockStr, 10);
      const now = Date.now();

      if (now - lastUnlock < WALLET_SESSION_TIMEOUT) {
        this.isUnlocked = true;
        this.lastUnlock = lastUnlock;
        logger.debug('[WalletSecurity] State restored, session still valid');
        return true;
      }

      // Session expired
      await this.lock();
      return false;

    } catch (error) {
      logger.error('[WalletSecurity] Failed to restore state', error, 'auth');
      return false;
    }
  }

  /**
   * Get current security state
   */
  getState(): WalletSecurityState {
    return {
      isUnlocked: this.isUnlocked,
      lastUnlock: this.lastUnlock,
      authLevel: this.isSessionValid() ? AuthLevel.WALLET_VERIFIED : AuthLevel.AUTHENTICATED
    };
  }

  /**
   * Get remaining session time in milliseconds
   */
  getRemainingSessionTime(): number {
    if (!this.isSessionValid()) {
      return 0;
    }
    return WALLET_SESSION_TIMEOUT - (Date.now() - (this.lastUnlock || 0));
  }
}

// Export singleton instance
export const walletSecurity = WalletSecurity.getInstance();
export default WalletSecurity;
