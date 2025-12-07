/**
 * AccountSwitcher - Multi-Account Management Service
 *
 * Handles Instagram-style multi-account functionality:
 * - Account switching with biometric verification
 * - Account storage and retrieval
 * - Account removal
 * - Token validation during switch
 *
 * Clean implementation without circuit breakers - uses proper async/await flow.
 *
 * @author Swap Team
 * @version 1.0.0
 */

import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import NetInfo from '@react-native-community/netinfo';
import { jwtDecode } from 'jwt-decode';
import { tokenManager } from '../token';
import apiClient from '../../_api/apiClient';
import AccountsManager, { Account } from '../AccountsManager';
import { sessionManager, SessionData } from './SessionManager';
import { logAccountSwitch } from '../AccountSwitchAuditLogger';
import logger from '../../utils/logger';

export interface AccountSwitchResult {
  success: boolean;
  error?: string;
  account?: Account;
}

class AccountSwitcher {
  private static instance: AccountSwitcher;
  private isSwitching: boolean = false;

  private constructor() {
    logger.debug('[AccountSwitcher] Initialized');
  }

  static getInstance(): AccountSwitcher {
    if (!AccountSwitcher.instance) {
      AccountSwitcher.instance = new AccountSwitcher();
    }
    return AccountSwitcher.instance;
  }

  /**
   * Switch to a different account
   * Requires biometric authentication and network connectivity
   */
  async switchAccount(userId: string, currentUserId?: string): Promise<AccountSwitchResult> {
    // Prevent concurrent switches (simple lock, no circuit breaker)
    if (this.isSwitching) {
      logger.debug('[AccountSwitcher] Switch already in progress');
      return { success: false, error: 'Account switch already in progress' };
    }

    this.isSwitching = true;
    const fromUserId = currentUserId || 'unknown';

    try {
      // Step 1: Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        Alert.alert(
          'No Internet Connection',
          'Account switching requires an internet connection. Please connect to Wi-Fi or mobile data and try again.',
          [{ text: 'OK', style: 'default' }]
        );
        return { success: false, error: 'No network connection' };
      }

      // Step 2: Biometric authentication
      const biometricResult = await this.authenticateWithBiometric();
      if (!biometricResult.success) {
        return { success: false, error: biometricResult.error };
      }

      // Step 3: Get account from storage
      const account = await AccountsManager.switchAccount(userId);
      if (!account) {
        logger.error('[AccountSwitcher] Account not found:', userId);
        return { success: false, error: 'Account not found' };
      }

      // Step 4: Validate token freshness
      const tokenValidation = this.validateToken(account.accessToken);
      if (!tokenValidation.isValid) {
        Alert.alert(
          'Session Expired',
          'This account\'s session has expired. Please login again.',
          [{ text: 'OK', style: 'default' }]
        );
        return { success: false, error: 'Token expired' };
      }

      // Step 5: Update tokens and API client
      tokenManager.setAccessToken(account.accessToken);
      tokenManager.setRefreshToken(account.refreshToken);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;
      apiClient.setProfileId(account.profileId);

      // Step 6: Update session
      // Use stored firstName/lastName if available, fallback to displayName parsing for backward compatibility
      const sessionData: SessionData = {
        userId: account.userId,
        profileId: account.profileId,
        entityId: account.entityId,
        email: account.email || '',
        firstName: account.firstName || account.displayName.split(' ')[0],
        lastName: account.lastName || account.displayName.split(' ').slice(1).join(' ') || undefined,
        avatarUrl: account.avatarUrl,
        profileType: account.profileType as 'personal' | 'business',
        sessionId: `session_${Date.now()}`,
        createdAt: new Date().toISOString(),
        lastValidated: new Date().toISOString(),
      };

      sessionManager.setSession(sessionData);

      // Step 7: Log successful switch
      await logAccountSwitch(fromUserId, userId, true);

      logger.info('[AccountSwitcher] Account switched successfully');
      return { success: true, account };

    } catch (error: any) {
      logger.error('[AccountSwitcher] Switch failed:', error);
      await logAccountSwitch(fromUserId, userId, false);
      return { success: false, error: error.message };
    } finally {
      this.isSwitching = false;
    }
  }

  /**
   * Authenticate with biometric
   */
  private async authenticateWithBiometric(): Promise<{ success: boolean; error?: string }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return { success: false, error: 'Biometric not available' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to switch account',
        fallbackLabel: 'Cancel',
        cancelLabel: 'Cancel',
      });

      if (!result.success) {
        return { success: false, error: 'Biometric authentication cancelled' };
      }

      return { success: true };
    } catch (error: any) {
      logger.error('[AccountSwitcher] Biometric auth error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate token is not expired
   */
  private validateToken(token: string): { isValid: boolean } {
    try {
      const decoded: any = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        return { isValid: false };
      }
      return { isValid: true };
    } catch (error) {
      logger.error('[AccountSwitcher] Token validation error:', error);
      return { isValid: false };
    }
  }

  /**
   * Save current account for later switching
   */
  async saveCurrentAccount(user: SessionData, accessToken: string, refreshToken: string): Promise<boolean> {
    try {
      if (!user.userId) {
        logger.warn('[AccountSwitcher] Cannot save account: no userId');
        return false;
      }

      const account: Account = {
        userId: user.userId,
        email: user.email,
        phone: undefined,
        profileId: user.profileId || '',
        entityId: user.entityId || '',
        profileType: user.profileType || 'personal',
        displayName: user.businessName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        firstName: user.firstName, // Store actual first name
        lastName: user.lastName, // Store actual last name
        avatarUrl: user.avatarUrl,
        accessToken,
        refreshToken: refreshToken || accessToken,
        addedAt: Date.now(),
      };

      await AccountsManager.addAccount(account);
      logger.info('[AccountSwitcher] Account saved');
      return true;

    } catch (error: any) {
      logger.error('[AccountSwitcher] Save account error:', error);

      if (error.message?.includes('Maximum 5 accounts')) {
        Alert.alert(
          'Account Limit Reached',
          'You can have up to 5 accounts on this device. Please remove an existing account from Settings → Accounts to add a new one.',
          [{ text: 'OK', style: 'default' }]
        );
      }

      return false;
    }
  }

  /**
   * Remove an account from storage
   */
  async removeAccount(userId: string, currentUserId?: string): Promise<boolean> {
    try {
      // Can't remove current account
      if (currentUserId === userId) {
        Alert.alert(
          'Cannot Remove Current Account',
          'Please switch to another account before removing this one.',
          [{ text: 'OK', style: 'default' }]
        );
        return false;
      }

      // Can't remove last account
      const accounts = await AccountsManager.getAllAccounts();
      if (accounts.length <= 1) {
        Alert.alert(
          'Cannot Remove Last Account',
          'You must have at least one account. Add another account before removing this one.',
          [{ text: 'OK', style: 'default' }]
        );
        return false;
      }

      await AccountsManager.removeAccount(userId);
      logger.info('[AccountSwitcher] Account removed:', userId);
      return true;

    } catch (error) {
      logger.error('[AccountSwitcher] Remove account error:', error);
      Alert.alert(
        'Error',
        'Failed to remove account. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
      return false;
    }
  }

  /**
   * Get all available accounts
   */
  async getAvailableAccounts(): Promise<Account[]> {
    try {
      return await AccountsManager.getAllAccounts();
    } catch (error) {
      logger.error('[AccountSwitcher] Get accounts error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const accountSwitcher = AccountSwitcher.getInstance();
export default AccountSwitcher;
