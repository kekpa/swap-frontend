/**
 * AppLockService
 *
 * Manages local app locking/unlocking for Revolut-style security.
 * Key features:
 * - Instant Face ID/Touch ID unlock (no network required)
 * - PIN fallback for devices without biometrics
 * - 30-minute session timeout
 * - Brute force protection (5 attempts → lockout)
 *
 * This is LOCAL security only - no backend calls during unlock.
 *
 * @created 2025-12-01
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { logger } from '../utils/logger';
import { eventEmitter } from '../utils/eventEmitter';

// ============================================================================
// Types
// ============================================================================

export type LockMethod = 'biometric' | 'pin' | 'none';

export interface AppLockState {
  isLocked: boolean;
  lockMethod: LockMethod;
  lastUnlockTime: number;
  failedAttempts: number;
  lockoutUntil: number | null;
}

export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricType: 'facial' | 'fingerprint' | 'iris' | 'none';
}

export interface UnlockResult {
  success: boolean;
  error?: string;
  method?: LockMethod;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  PIN_HASH: 'app_lock_pin_hash',
  PIN_SALT: 'app_lock_pin_salt',
  LOCK_METHOD: 'app_lock_method',
  LAST_UNLOCK: 'app_lock_last_unlock',
  FAILED_ATTEMPTS: 'app_lock_failed_attempts',
  LOCKOUT_UNTIL: 'app_lock_lockout_until',
  IS_CONFIGURED: 'app_lock_configured',
} as const;

// Session timeout: 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Brute force protection
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds initial lockout
const LOCKOUT_MULTIPLIER = 2; // Exponential backoff

// ============================================================================
// AppLockService Class
// ============================================================================

class AppLockService {
  private state: AppLockState = {
    isLocked: true,
    lockMethod: 'none',
    lastUnlockTime: 0,
    failedAttempts: 0,
    lockoutUntil: null,
  };

  private initialized = false;

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Initialize the service - must be called on app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.debug('[AppLockService] Initializing...');

      // Load persisted state
      const [lockMethod, lastUnlock, failedAttempts, lockoutUntil] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.LOCK_METHOD),
        SecureStore.getItemAsync(STORAGE_KEYS.LAST_UNLOCK),
        SecureStore.getItemAsync(STORAGE_KEYS.FAILED_ATTEMPTS),
        SecureStore.getItemAsync(STORAGE_KEYS.LOCKOUT_UNTIL),
      ]);

      this.state.lockMethod = (lockMethod as LockMethod) || 'none';
      this.state.lastUnlockTime = lastUnlock ? parseInt(lastUnlock, 10) : 0;
      this.state.failedAttempts = failedAttempts ? parseInt(failedAttempts, 10) : 0;
      this.state.lockoutUntil = lockoutUntil ? parseInt(lockoutUntil, 10) : null;

      // Check if session is still valid
      this.state.isLocked = this.isSessionExpired();

      this.initialized = true;
      logger.info(`[AppLockService] Initialized: lockMethod=${this.state.lockMethod}, isLocked=${this.state.isLocked}`);
    } catch (error: any) {
      logger.error('[AppLockService] Initialization failed:', error.message);
      // Default to locked state on error
      this.state.isLocked = true;
      this.initialized = true;
    }
  }

  // --------------------------------------------------------------------------
  // Biometric Detection
  // --------------------------------------------------------------------------

  /**
   * Check device biometric capabilities
   */
  async detectBiometricCapabilities(): Promise<BiometricCapabilities> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: BiometricCapabilities['biometricType'] = 'none';
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'facial';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'iris';
      }

      return { hasHardware, isEnrolled, biometricType };
    } catch (error: any) {
      logger.error('[AppLockService] Biometric detection failed:', error.message);
      return { hasHardware: false, isEnrolled: false, biometricType: 'none' };
    }
  }

  /**
   * Determine recommended lock method based on device capabilities
   */
  async detectRecommendedLockMethod(): Promise<LockMethod> {
    const capabilities = await this.detectBiometricCapabilities();

    if (capabilities.hasHardware && capabilities.isEnrolled) {
      return 'biometric';
    }
    return 'pin';
  }

  // --------------------------------------------------------------------------
  // Lock Setup
  // --------------------------------------------------------------------------

  /**
   * Check if app lock is configured
   */
  async isConfigured(): Promise<boolean> {
    const configured = await SecureStore.getItemAsync(STORAGE_KEYS.IS_CONFIGURED);
    return configured === 'true';
  }

  /**
   * Setup biometric lock
   */
  async setupBiometric(): Promise<{ success: boolean; error?: string }> {
    try {
      logger.debug('[AppLockService] Setting up biometric lock...');

      const capabilities = await this.detectBiometricCapabilities();
      if (!capabilities.hasHardware || !capabilities.isEnrolled) {
        return {
          success: false,
          error: 'Biometric authentication not available on this device',
        };
      }

      // Test biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to enable biometric unlock',
        fallbackLabel: 'Cancel',
        disableDeviceFallback: true,
      });

      if (!result.success) {
        return { success: false, error: 'Biometric verification failed' };
      }

      // Save lock method
      await SecureStore.setItemAsync(STORAGE_KEYS.LOCK_METHOD, 'biometric');
      await SecureStore.setItemAsync(STORAGE_KEYS.IS_CONFIGURED, 'true');

      this.state.lockMethod = 'biometric';
      logger.info('[AppLockService] Biometric lock configured');

      return { success: true };
    } catch (error: any) {
      logger.error('[AppLockService] Biometric setup failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup PIN lock
   * @param pin 6-digit PIN
   */
  async setupPin(pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.debug('[AppLockService] Setting up PIN lock...');

      if (!/^\d{6}$/.test(pin)) {
        return { success: false, error: 'PIN must be exactly 6 digits' };
      }

      // Generate salt and hash PIN
      const salt = await Crypto.getRandomBytesAsync(16);
      const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        saltHex + pin
      );

      // Store securely
      await SecureStore.setItemAsync(STORAGE_KEYS.PIN_SALT, saltHex);
      await SecureStore.setItemAsync(STORAGE_KEYS.PIN_HASH, hash);
      await SecureStore.setItemAsync(STORAGE_KEYS.LOCK_METHOD, 'pin');
      await SecureStore.setItemAsync(STORAGE_KEYS.IS_CONFIGURED, 'true');

      this.state.lockMethod = 'pin';
      logger.info('[AppLockService] PIN lock configured');

      return { success: true };
    } catch (error: any) {
      logger.error('[AppLockService] PIN setup failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup both biometric and PIN (biometric primary, PIN fallback)
   */
  async setupBiometricWithPinFallback(pin: string): Promise<{ success: boolean; error?: string }> {
    // Setup PIN first (as fallback)
    const pinResult = await this.setupPin(pin);
    if (!pinResult.success) {
      return pinResult;
    }

    // Then setup biometric (as primary)
    const bioResult = await this.setupBiometric();
    if (!bioResult.success) {
      // PIN is still configured, just biometric failed
      logger.warn('[AppLockService] Biometric failed but PIN configured');
      return { success: true }; // Still success since PIN works
    }

    return { success: true };
  }

  // --------------------------------------------------------------------------
  // Unlock Methods
  // --------------------------------------------------------------------------

  /**
   * Check if currently in lockout period
   */
  isLockedOut(): { lockedOut: boolean; remainingMs: number } {
    if (!this.state.lockoutUntil) {
      return { lockedOut: false, remainingMs: 0 };
    }

    const now = Date.now();
    if (now >= this.state.lockoutUntil) {
      // Lockout expired, reset
      this.state.lockoutUntil = null;
      SecureStore.deleteItemAsync(STORAGE_KEYS.LOCKOUT_UNTIL);
      return { lockedOut: false, remainingMs: 0 };
    }

    return {
      lockedOut: true,
      remainingMs: this.state.lockoutUntil - now,
    };
  }

  /**
   * Unlock with biometric (Face ID / Touch ID)
   */
  async unlockWithBiometric(): Promise<UnlockResult> {
    try {
      logger.debug('[AppLockService] Attempting biometric unlock...');

      // Check lockout
      const lockout = this.isLockedOut();
      if (lockout.lockedOut) {
        return {
          success: false,
          error: `Too many attempts. Try again in ${Math.ceil(lockout.remainingMs / 1000)} seconds`,
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Swap',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await this.onUnlockSuccess('biometric');
        return { success: true, method: 'biometric' };
      }

      await this.onUnlockFailed();
      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    } catch (error: any) {
      logger.error('[AppLockService] Biometric unlock error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unlock with PIN
   */
  async unlockWithPin(pin: string): Promise<UnlockResult> {
    try {
      logger.debug('[AppLockService] Attempting PIN unlock...');

      // Check lockout
      const lockout = this.isLockedOut();
      if (lockout.lockedOut) {
        return {
          success: false,
          error: `Too many attempts. Try again in ${Math.ceil(lockout.remainingMs / 1000)} seconds`,
        };
      }

      // Verify PIN
      const [storedHash, salt] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.PIN_HASH),
        SecureStore.getItemAsync(STORAGE_KEYS.PIN_SALT),
      ]);

      if (!storedHash || !salt) {
        return { success: false, error: 'PIN not configured' };
      }

      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        salt + pin
      );

      if (hash === storedHash) {
        await this.onUnlockSuccess('pin');
        return { success: true, method: 'pin' };
      }

      await this.onUnlockFailed();
      return { success: false, error: 'Incorrect PIN' };
    } catch (error: any) {
      logger.error('[AppLockService] PIN unlock error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-unlock with biometric on app open (if available)
   */
  async autoUnlock(): Promise<UnlockResult> {
    if (!this.state.isLocked) {
      return { success: true, method: this.state.lockMethod };
    }

    if (this.state.lockMethod === 'biometric') {
      return this.unlockWithBiometric();
    }

    // For PIN-only, user must enter PIN manually
    return { success: false, error: 'PIN required' };
  }

  // --------------------------------------------------------------------------
  // Lock Methods
  // --------------------------------------------------------------------------

  /**
   * Lock the app immediately
   */
  lock(): void {
    logger.debug('[AppLockService] Locking app...');
    this.state.isLocked = true;
    eventEmitter.emit('app_locked');
  }

  /**
   * Unlock the app after strong authentication
   *
   * Called by LoginService after successful password authentication.
   * Password auth is the highest security level, so it bypasses PIN/biometric.
   *
   * Authentication hierarchy:
   * - Password login → Auto-unlock (this method)
   * - App return → PIN/biometric required (unlockWithPin/unlockWithBiometric)
   *
   * @see LoginService.login() - calls this after password auth
   */
  async unlock(): Promise<void> {
    logger.info('[AppLockService] Unlocking app (password auth bypass)');
    await this.onUnlockSuccess('pin');
  }

  /**
   * Check if session has expired (30 min inactivity)
   */
  isSessionExpired(): boolean {
    if (this.state.lastUnlockTime === 0) return true;

    const elapsed = Date.now() - this.state.lastUnlockTime;
    return elapsed > SESSION_TIMEOUT_MS;
  }

  /**
   * Extend session (call on user activity)
   */
  async extendSession(): Promise<void> {
    if (!this.state.isLocked) {
      const now = Date.now();
      this.state.lastUnlockTime = now;
      await SecureStore.setItemAsync(STORAGE_KEYS.LAST_UNLOCK, now.toString());
    }
  }

  // --------------------------------------------------------------------------
  // State Getters
  // --------------------------------------------------------------------------

  isLocked(): boolean {
    // Check session expiry on every call
    if (!this.state.isLocked && this.isSessionExpired()) {
      this.lock();
    }
    return this.state.isLocked;
  }

  getLockMethod(): LockMethod {
    return this.state.lockMethod;
  }

  getFailedAttempts(): number {
    return this.state.failedAttempts;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private async onUnlockSuccess(method: LockMethod): Promise<void> {
    const now = Date.now();

    this.state.isLocked = false;
    this.state.lastUnlockTime = now;
    this.state.failedAttempts = 0;
    this.state.lockoutUntil = null;

    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.LAST_UNLOCK, now.toString()),
      SecureStore.deleteItemAsync(STORAGE_KEYS.FAILED_ATTEMPTS),
      SecureStore.deleteItemAsync(STORAGE_KEYS.LOCKOUT_UNTIL),
    ]);

    logger.info(`[AppLockService] App unlocked via ${method}`);
    eventEmitter.emit('app_unlocked', { method });
  }

  private async onUnlockFailed(): Promise<void> {
    this.state.failedAttempts++;

    await SecureStore.setItemAsync(
      STORAGE_KEYS.FAILED_ATTEMPTS,
      this.state.failedAttempts.toString()
    );

    // Check if lockout needed
    if (this.state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutDuration = LOCKOUT_DURATION_MS * Math.pow(
        LOCKOUT_MULTIPLIER,
        Math.floor(this.state.failedAttempts / MAX_FAILED_ATTEMPTS) - 1
      );

      this.state.lockoutUntil = Date.now() + lockoutDuration;
      await SecureStore.setItemAsync(
        STORAGE_KEYS.LOCKOUT_UNTIL,
        this.state.lockoutUntil.toString()
      );

      logger.warn(`[AppLockService] Too many failed attempts (${this.state.failedAttempts}), locked out for ${lockoutDuration / 1000}s`);
    }
  }

  // --------------------------------------------------------------------------
  // Reset (for logout)
  // --------------------------------------------------------------------------

  /**
   * Clear all app lock data (on logout)
   */
  async reset(): Promise<void> {
    logger.debug('[AppLockService] Resetting app lock...');

    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.PIN_HASH),
      SecureStore.deleteItemAsync(STORAGE_KEYS.PIN_SALT),
      SecureStore.deleteItemAsync(STORAGE_KEYS.LOCK_METHOD),
      SecureStore.deleteItemAsync(STORAGE_KEYS.LAST_UNLOCK),
      SecureStore.deleteItemAsync(STORAGE_KEYS.FAILED_ATTEMPTS),
      SecureStore.deleteItemAsync(STORAGE_KEYS.LOCKOUT_UNTIL),
      SecureStore.deleteItemAsync(STORAGE_KEYS.IS_CONFIGURED),
    ]);

    this.state = {
      isLocked: true,
      lockMethod: 'none',
      lastUnlockTime: 0,
      failedAttempts: 0,
      lockoutUntil: null,
    };

    this.initialized = false;
    logger.info('[AppLockService] Reset complete');
  }
}

// Export singleton instance
export const appLockService = new AppLockService();
export default appLockService;
