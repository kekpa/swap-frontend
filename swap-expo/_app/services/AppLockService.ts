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
import { getLastActiveProfileId } from '../utils/pinUserStorage';

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
  backgroundedAt: number | null;  // Track when app went to background
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
  PIN_SOURCE: 'app_lock_pin_source', // 'local' | 'backend' - tracks if hash exists locally
  PIN_SET_AT: 'app_lock_pin_set_at', // Timestamp from backend
  USER_IDENTIFIER: 'app_lock_user_identifier', // Phone/email for backend verification
  // Business profile PIN storage (per-profile)
  BUSINESS_PIN_HASH_PREFIX: 'app_lock_business_pin_hash_',
  BUSINESS_PIN_SALT_PREFIX: 'app_lock_business_pin_salt_',
  BUSINESS_PIN_CONFIGURED_PREFIX: 'app_lock_business_configured_',
  BUSINESS_FAILED_ATTEMPTS_PREFIX: 'app_lock_business_failed_',
  BUSINESS_LOCKOUT_PREFIX: 'app_lock_business_lockout_',
  BUSINESS_PIN_SOURCE_PREFIX: 'app_lock_business_pin_source_',
} as const;

// Session timeout: 30 minutes (for inactivity while in app)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Background lock timeout: 3 minutes (for time spent in background)
const BACKGROUND_LOCK_TIMEOUT_MS = 3 * 60 * 1000;

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
    backgroundedAt: null,
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
   * Mark PIN as configured when backend confirms it exists.
   * Called after password login when backend has PIN but local doesn't.
   *
   * This is part of the hybrid PIN sync architecture:
   * - User logs in with password on new device
   * - Backend returns passcode_configured: true
   * - App marks as configured but with source='backend' (no local hash yet)
   * - First PIN unlock verifies via backend, then saves locally
   *
   * @param setAt - When the PIN was originally set (from backend)
   * @param userIdentifier - Phone/email for backend verification
   */
  async markAsConfiguredFromBackend(setAt?: string, userIdentifier?: string): Promise<void> {
    logger.info('[AppLockService] Marking PIN as configured from backend');

    await SecureStore.setItemAsync(STORAGE_KEYS.IS_CONFIGURED, 'true');
    await SecureStore.setItemAsync(STORAGE_KEYS.LOCK_METHOD, 'pin');
    await SecureStore.setItemAsync(STORAGE_KEYS.PIN_SOURCE, 'backend');

    if (setAt) {
      await SecureStore.setItemAsync(STORAGE_KEYS.PIN_SET_AT, setAt);
    }
    if (userIdentifier) {
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_IDENTIFIER, userIdentifier);
    }

    this.state.lockMethod = 'pin';
    logger.debug('[AppLockService] Marked as configured from backend (no local hash yet)');
  }

  /**
   * Mark business PIN as configured from backend.
   * Same pattern as personal PIN but per-business-profile.
   */
  async markBusinessPinConfiguredFromBackend(
    businessProfileId: string,
    setAt?: string
  ): Promise<void> {
    logger.info(`[AppLockService] Marking business PIN as configured from backend for ${businessProfileId}`);

    const keys = this.getBusinessPinKeys(businessProfileId);
    await SecureStore.setItemAsync(keys.configured, 'true');
    await SecureStore.setItemAsync(`${STORAGE_KEYS.BUSINESS_PIN_SOURCE_PREFIX}${businessProfileId}`, 'backend');

    logger.debug(`[AppLockService] Business PIN marked as configured from backend for ${businessProfileId}`);
  }

  /**
   * Check if PIN verification should use backend (no local hash).
   */
  async shouldUseBackendVerification(): Promise<boolean> {
    const source = await SecureStore.getItemAsync(STORAGE_KEYS.PIN_SOURCE);
    const hasLocalHash = await SecureStore.getItemAsync(STORAGE_KEYS.PIN_HASH);
    return source === 'backend' || !hasLocalHash;
  }

  /**
   * Get stored user identifier for backend PIN verification
   */
  async getUserIdentifier(): Promise<string | null> {
    return SecureStore.getItemAsync(STORAGE_KEYS.USER_IDENTIFIER);
  }

  /**
   * Store user identifier for backend PIN verification
   */
  async setUserIdentifier(identifier: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_IDENTIFIER, identifier);
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
   *
   * Hybrid verification:
   * 1. If local hash exists → verify locally (instant, works offline)
   * 2. If no local hash (new device) → verify via backend, then save locally
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

      // Check if we have local hash
      const [storedHash, salt] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.PIN_HASH),
        SecureStore.getItemAsync(STORAGE_KEYS.PIN_SALT),
      ]);

      // If local hash exists, verify locally (instant, offline-capable)
      if (storedHash && salt) {
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
      }

      // No local hash - verify against backend (new device scenario)
      logger.debug('[AppLockService] No local hash, using backend verification');
      return this.verifyPinViaBackend(pin);
    } catch (error: any) {
      logger.error('[AppLockService] PIN unlock error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify PIN against backend when no local hash exists.
   * After successful verification, saves PIN locally for future offline unlocks.
   */
  private async verifyPinViaBackend(pin: string): Promise<UnlockResult> {
    try {
      const identifier = await this.getUserIdentifier();
      if (!identifier) {
        logger.error('[AppLockService] No user identifier found for backend verification');
        return { success: false, error: 'Please log in with your password first' };
      }

      // Dynamically import to avoid circular dependency
      const { loginService } = await import('./auth/LoginService');

      // Get current profile ID for proper profile targeting
      const targetProfileId = await getLastActiveProfileId();

      logger.debug(`[AppLockService] Verifying PIN via backend (targetProfileId: ${targetProfileId || 'none'})`);
      const result = await loginService.loginWithPin(identifier, pin, targetProfileId || undefined);

      if (result.success) {
        // Success! Save PIN locally for future offline unlocks
        await this.savePinLocally(pin);
        await this.onUnlockSuccess('pin');
        logger.info('[AppLockService] Backend PIN verification successful, saved locally');
        return { success: true, method: 'pin' };
      } else {
        await this.onUnlockFailed();
        return { success: false, error: result.message || 'Incorrect PIN' };
      }
    } catch (error: any) {
      logger.error('[AppLockService] Backend PIN verification failed:', error.message);

      // Check if it's a network error
      if (error.message?.includes('Network') || error.message?.includes('network')) {
        return { success: false, error: 'Check your internet connection and try again' };
      }

      return { success: false, error: 'Verification failed. Please try again.' };
    }
  }

  /**
   * Save PIN locally after successful backend verification.
   * Enables future offline unlocks.
   */
  private async savePinLocally(pin: string): Promise<void> {
    try {
      // Generate new salt and hash
      const salt = await Crypto.getRandomBytesAsync(16);
      const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        saltHex + pin
      );

      // Store securely - include IS_CONFIGURED and LOCK_METHOD for proper state
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.PIN_HASH, hash),
        SecureStore.setItemAsync(STORAGE_KEYS.PIN_SALT, saltHex),
        SecureStore.setItemAsync(STORAGE_KEYS.PIN_SOURCE, 'local'),
        SecureStore.setItemAsync(STORAGE_KEYS.IS_CONFIGURED, 'true'),
        SecureStore.setItemAsync(STORAGE_KEYS.LOCK_METHOD, 'pin'),
      ]);

      this.state.lockMethod = 'pin';
      logger.info('[AppLockService] PIN saved locally after backend verification (configured=true)');
    } catch (error: any) {
      // Non-fatal - PIN still works, just won't be available offline
      logger.warn('[AppLockService] Failed to save PIN locally:', error.message);
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
   * Track when app goes to background
   * Used to determine if lock is required on resume
   */
  setBackgroundedAt(timestamp: number | null): void {
    this.state.backgroundedAt = timestamp;
    if (timestamp) {
      logger.debug('[AppLockService] App backgrounded at:', new Date(timestamp).toISOString());
    } else {
      logger.debug('[AppLockService] Background timestamp cleared');
    }
  }

  /**
   * Check if app has been in background for longer than timeout (3 minutes)
   */
  isBackgroundTimeoutExpired(): boolean {
    if (!this.state.backgroundedAt) return false;
    const elapsed = Date.now() - this.state.backgroundedAt;
    const expired = elapsed > BACKGROUND_LOCK_TIMEOUT_MS;
    if (expired) {
      logger.debug(`[AppLockService] Background timeout expired (${Math.round(elapsed / 1000)}s > ${BACKGROUND_LOCK_TIMEOUT_MS / 1000}s)`);
    }
    return expired;
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
  // Business Profile PIN Methods
  // --------------------------------------------------------------------------

  /**
   * Get storage keys for a specific business profile
   */
  private getBusinessPinKeys(businessProfileId: string) {
    return {
      hash: `${STORAGE_KEYS.BUSINESS_PIN_HASH_PREFIX}${businessProfileId}`,
      salt: `${STORAGE_KEYS.BUSINESS_PIN_SALT_PREFIX}${businessProfileId}`,
      configured: `${STORAGE_KEYS.BUSINESS_PIN_CONFIGURED_PREFIX}${businessProfileId}`,
      failedAttempts: `${STORAGE_KEYS.BUSINESS_FAILED_ATTEMPTS_PREFIX}${businessProfileId}`,
      lockout: `${STORAGE_KEYS.BUSINESS_LOCKOUT_PREFIX}${businessProfileId}`,
    };
  }

  /**
   * Check if business PIN is configured for a specific profile
   */
  async isBusinessPinConfigured(businessProfileId: string): Promise<boolean> {
    const keys = this.getBusinessPinKeys(businessProfileId);
    const configured = await SecureStore.getItemAsync(keys.configured);
    return configured === 'true';
  }

  /**
   * Setup PIN for a business profile
   * @param pin 6-digit PIN
   * @param businessProfileId The business profile ID
   */
  async setupBusinessPin(
    pin: string,
    businessProfileId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.debug(`[AppLockService] Setting up business PIN for profile ${businessProfileId}...`);

      // Business PINs are 6 digits
      if (!/^\d{6}$/.test(pin)) {
        return { success: false, error: 'PIN must be 6 digits' };
      }

      const keys = this.getBusinessPinKeys(businessProfileId);

      // Generate salt and hash PIN
      const salt = await Crypto.getRandomBytesAsync(16);
      const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        saltHex + pin
      );

      // Store securely
      await SecureStore.setItemAsync(keys.salt, saltHex);
      await SecureStore.setItemAsync(keys.hash, hash);
      await SecureStore.setItemAsync(keys.configured, 'true');

      logger.info(`[AppLockService] Business PIN configured for profile ${businessProfileId}`);

      return { success: true };
    } catch (error: any) {
      logger.error('[AppLockService] Business PIN setup failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if business profile is in lockout period
   */
  async isBusinessLockedOut(businessProfileId: string): Promise<{ lockedOut: boolean; remainingMs: number }> {
    const keys = this.getBusinessPinKeys(businessProfileId);
    const lockoutStr = await SecureStore.getItemAsync(keys.lockout);

    if (!lockoutStr) {
      return { lockedOut: false, remainingMs: 0 };
    }

    const lockoutUntil = parseInt(lockoutStr, 10);
    const now = Date.now();

    if (now >= lockoutUntil) {
      // Lockout expired, clear it
      await SecureStore.deleteItemAsync(keys.lockout);
      return { lockedOut: false, remainingMs: 0 };
    }

    return {
      lockedOut: true,
      remainingMs: lockoutUntil - now,
    };
  }

  /**
   * Unlock with business PIN
   */
  async unlockWithBusinessPin(pin: string, businessProfileId: string): Promise<UnlockResult> {
    try {
      logger.debug(`[AppLockService] Attempting business PIN unlock for profile ${businessProfileId}...`);

      const keys = this.getBusinessPinKeys(businessProfileId);

      // Check lockout
      const lockout = await this.isBusinessLockedOut(businessProfileId);
      if (lockout.lockedOut) {
        return {
          success: false,
          error: `Too many attempts. Try again in ${Math.ceil(lockout.remainingMs / 1000)} seconds`,
        };
      }

      // Verify PIN
      const [storedHash, salt] = await Promise.all([
        SecureStore.getItemAsync(keys.hash),
        SecureStore.getItemAsync(keys.salt),
      ]);

      if (!storedHash || !salt) {
        return { success: false, error: 'Business PIN not configured' };
      }

      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        salt + pin
      );

      if (hash === storedHash) {
        // Success - clear failed attempts
        await SecureStore.deleteItemAsync(keys.failedAttempts);
        await SecureStore.deleteItemAsync(keys.lockout);

        // Update unlock state
        await this.onUnlockSuccess('pin');

        logger.info(`[AppLockService] Business PIN unlock successful for profile ${businessProfileId}`);
        return { success: true, method: 'pin' };
      }

      // Failed - increment attempts
      await this.onBusinessUnlockFailed(businessProfileId);
      return { success: false, error: 'Incorrect PIN' };
    } catch (error: any) {
      logger.error('[AppLockService] Business PIN unlock error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle failed business PIN attempt
   */
  private async onBusinessUnlockFailed(businessProfileId: string): Promise<void> {
    const keys = this.getBusinessPinKeys(businessProfileId);

    // Get current attempts
    const attemptsStr = await SecureStore.getItemAsync(keys.failedAttempts);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) + 1 : 1;

    await SecureStore.setItemAsync(keys.failedAttempts, attempts.toString());

    // Check if lockout needed
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutDuration = LOCKOUT_DURATION_MS * Math.pow(
        LOCKOUT_MULTIPLIER,
        Math.floor(attempts / MAX_FAILED_ATTEMPTS) - 1
      );

      const lockoutUntil = Date.now() + lockoutDuration;
      await SecureStore.setItemAsync(keys.lockout, lockoutUntil.toString());

      logger.warn(`[AppLockService] Business profile ${businessProfileId}: Too many failed attempts (${attempts}), locked out for ${lockoutDuration / 1000}s`);
    }
  }

  /**
   * Clear business PIN for a specific profile
   */
  async clearBusinessPin(businessProfileId: string): Promise<void> {
    logger.debug(`[AppLockService] Clearing business PIN for profile ${businessProfileId}...`);

    const keys = this.getBusinessPinKeys(businessProfileId);

    await Promise.all([
      SecureStore.deleteItemAsync(keys.hash),
      SecureStore.deleteItemAsync(keys.salt),
      SecureStore.deleteItemAsync(keys.configured),
      SecureStore.deleteItemAsync(keys.failedAttempts),
      SecureStore.deleteItemAsync(keys.lockout),
    ]);

    logger.info(`[AppLockService] Business PIN cleared for profile ${businessProfileId}`);
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
      backgroundedAt: null,
    };

    this.initialized = false;
    logger.info('[AppLockService] Reset complete');
  }

  // --------------------------------------------------------------------------
  // PIN Reset (for "Forgot PIN" flow)
  // --------------------------------------------------------------------------

  /**
   * Clear PIN for reset flow
   *
   * Unlike reset(), this preserves the session and just clears the PIN
   * so the user can set up a new one after password verification.
   *
   * Flow: User forgot PIN → Verify password → clearPinForReset() → Show PIN setup
   */
  async clearPinForReset(): Promise<void> {
    logger.info('[AppLockService] Clearing PIN for reset...');

    // Clear only PIN-related data
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.PIN_HASH),
      SecureStore.deleteItemAsync(STORAGE_KEYS.PIN_SALT),
      SecureStore.deleteItemAsync(STORAGE_KEYS.IS_CONFIGURED),
      SecureStore.deleteItemAsync(STORAGE_KEYS.FAILED_ATTEMPTS),
      SecureStore.deleteItemAsync(STORAGE_KEYS.LOCKOUT_UNTIL),
    ]);

    // Update state - not configured but not fully reset
    this.state.lockMethod = 'none';
    this.state.failedAttempts = 0;
    this.state.lockoutUntil = null;
    this.state.isLocked = false; // Unlocked because user verified with password

    logger.info('[AppLockService] PIN cleared, ready for new setup');
  }
}

// Export singleton instance
export const appLockService = new AppLockService();
export default appLockService;
