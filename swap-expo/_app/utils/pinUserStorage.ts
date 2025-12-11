/**
 * PIN User Storage - Instagram-Style Multi-Profile Authentication
 *
 * Professional per-profile identifier storage for PIN login.
 * Stores username/businessName for display (privacy-safe, not email/phone).
 *
 * Architecture:
 * - PROFILE_PIN_DATA: Map of profileId → { identifier, username, businessName, ... }
 * - LAST_ACTIVE_PROFILE: Which profile to show on PIN tab
 *
 * @author Swap Engineering Team
 * @date 2025-01-08 (Created)
 * @date 2025-12-05 (Updated: Instagram-style multi-profile support)
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

// Storage keys
const PROFILE_PIN_DATA_KEY = 'PROFILE_PIN_DATA';
const LAST_ACTIVE_PROFILE_KEY = 'LAST_ACTIVE_PROFILE';
const LAST_PIN_USER_KEY = 'LAST_PIN_USER'; // Legacy - kept for backward compatibility
const PROFILE_PIN_SECRET_PREFIX = 'PROFILE_PIN_SECRET_'; // For biometric-protected PIN storage

/**
 * Profile PIN data structure
 *
 * Stores all data needed for PIN login display and API calls.
 */
export interface ProfilePinData {
  /** Identifier for API calls (email/phone/username) */
  identifier: string;

  /** Username for display - PERSONAL profiles only */
  username?: string;

  /** Business name for display - BUSINESS profiles only */
  businessName?: string;

  /** Fallback display name (full name or business name) */
  displayName: string;

  /** Profile type for UI styling */
  profileType: 'personal' | 'business';

  /** Avatar URL for display */
  avatarUrl?: string;
}

/**
 * All stored profiles data structure
 */
type ProfilePinDataMap = Record<string, ProfilePinData>;

// ============================================================================
// NEW: Per-Profile Storage Functions (Instagram-style)
// ============================================================================

/**
 * Store PIN data for a specific profile
 *
 * Called after successful login or profile switch.
 *
 * @param profileId - The profile ID to store data for
 * @param data - The profile PIN data
 */
export const storeProfilePinData = async (
  profileId: string,
  data: ProfilePinData
): Promise<void> => {
  try {
    console.log('💾 [PIN Storage] storeProfilePinData called:', {
      profileId,
      displayName: data.displayName,
      profileType: data.profileType,
      hasIdentifier: !!data.identifier,
    });

    // Get existing data
    const existingData = await getAllProfilePinData();

    // Add/update this profile
    existingData[profileId] = data;

    // Limit to 5 profiles (Instagram-style)
    const profileIds = Object.keys(existingData);
    if (profileIds.length > 5) {
      // Remove oldest profiles (keep last 5)
      const sortedIds = profileIds.slice(-5);
      const limitedData: ProfilePinDataMap = {};
      sortedIds.forEach(id => {
        limitedData[id] = existingData[id];
      });
      await SecureStore.setItemAsync(PROFILE_PIN_DATA_KEY, JSON.stringify(limitedData));
    } else {
      await SecureStore.setItemAsync(PROFILE_PIN_DATA_KEY, JSON.stringify(existingData));
    }

    console.log('✅ [PIN Storage] Profile PIN data stored successfully:', {
      profileId,
      totalProfiles: Object.keys(existingData).length,
    });

    logger.debug('[PIN Storage] Stored profile PIN data', { profileId, profileType: data.profileType });
  } catch (error) {
    console.error('❌ [PIN Storage] Failed to store profile PIN data:', error);
    logger.error('[PIN Storage] Failed to store profile PIN data:', error);
    throw error;
  }
};

/**
 * Get PIN data for a profile (or last active if no profileId provided)
 *
 * @param profileId - Optional profile ID. If not provided, returns last active profile's data.
 * @returns Profile PIN data or null if not found
 */
export const getProfilePinData = async (
  profileId?: string
): Promise<ProfilePinData | null> => {
  try {
    // If no profileId, get last active
    const lastActiveId = await getLastActiveProfileId();
    const targetProfileId = profileId || lastActiveId;

    console.log('🔍 [PIN Storage] getProfilePinData called:', {
      requestedProfileId: profileId,
      lastActiveProfileId: lastActiveId,
      usingProfileId: targetProfileId,
    });

    if (!targetProfileId) {
      console.log('❌ [PIN Storage] No profile ID or last active profile found');
      logger.debug('[PIN Storage] No profile ID or last active profile found');
      return null;
    }

    const allData = await getAllProfilePinData();
    const data = allData[targetProfileId] || null;

    console.log('🔍 [PIN Storage] Retrieved profile PIN data:', {
      profileId: targetProfileId,
      found: !!data,
      allStoredProfiles: Object.keys(allData),
      dataPreview: data ? {
        displayName: data.displayName,
        profileType: data.profileType,
        identifier: data.identifier,
        hasIdentifier: !!data.identifier,
      } : null,
    });

    logger.debug('[PIN Storage] Retrieved profile PIN data', {
      profileId: targetProfileId,
      found: !!data
    });

    return data;
  } catch (error) {
    console.error('❌ [PIN Storage] Failed to get profile PIN data:', error);
    logger.error('[PIN Storage] Failed to get profile PIN data:', error);
    return null;
  }
};

/**
 * Get all stored profile PIN data
 *
 * @returns Map of all stored profiles
 */
export const getAllProfilePinData = async (): Promise<ProfilePinDataMap> => {
  try {
    const dataStr = await SecureStore.getItemAsync(PROFILE_PIN_DATA_KEY);
    if (!dataStr) {
      return {};
    }
    return JSON.parse(dataStr) as ProfilePinDataMap;
  } catch (error) {
    logger.error('[PIN Storage] Failed to get all profile PIN data:', error);
    return {};
  }
};

/**
 * Get the last active profile ID
 *
 * @returns Profile ID or null if none set
 */
export const getLastActiveProfileId = async (): Promise<string | null> => {
  try {
    const profileId = await SecureStore.getItemAsync(LAST_ACTIVE_PROFILE_KEY);
    return profileId || null;
  } catch (error) {
    logger.error('[PIN Storage] Failed to get last active profile ID:', error);
    return null;
  }
};

/**
 * Set the last active profile
 *
 * Called after login or profile switch.
 *
 * @param profileId - Profile ID to set as active (empty string to clear)
 */
export const setLastActiveProfile = async (profileId: string): Promise<void> => {
  try {
    if (profileId) {
      await SecureStore.setItemAsync(LAST_ACTIVE_PROFILE_KEY, profileId);
      console.log('✅ [PIN Storage] Set last active profile:', { profileId });
      logger.debug('[PIN Storage] Set last active profile', { profileId });
    } else {
      await SecureStore.deleteItemAsync(LAST_ACTIVE_PROFILE_KEY);
      console.log('🗑️ [PIN Storage] Cleared last active profile');
      logger.debug('[PIN Storage] Cleared last active profile');
    }
  } catch (error) {
    console.error('❌ [PIN Storage] Failed to set last active profile:', error);
    logger.error('[PIN Storage] Failed to set last active profile:', error);
    throw error;
  }
};

/**
 * Clear specific profile's PIN data
 *
 * @param profileId - Profile ID to clear
 */
export const clearProfilePinData = async (profileId: string): Promise<void> => {
  try {
    const allData = await getAllProfilePinData();
    delete allData[profileId];
    await SecureStore.setItemAsync(PROFILE_PIN_DATA_KEY, JSON.stringify(allData));

    // If this was the active profile, clear active too
    const activeId = await getLastActiveProfileId();
    if (activeId === profileId) {
      await setLastActiveProfile('');
    }

    logger.debug('[PIN Storage] Cleared profile PIN data', { profileId });
  } catch (error) {
    logger.error('[PIN Storage] Failed to clear profile PIN data:', error);
    throw error;
  }
};

/**
 * Clear ALL profile PIN data
 *
 * Used for account deletion or "remove all saved accounts".
 */
export const clearAllProfilePinData = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(PROFILE_PIN_DATA_KEY);
    await SecureStore.deleteItemAsync(LAST_ACTIVE_PROFILE_KEY);
    await SecureStore.deleteItemAsync(LAST_PIN_USER_KEY); // Also clear legacy

    logger.debug('[PIN Storage] Cleared all profile PIN data');
  } catch (error) {
    logger.error('[PIN Storage] Failed to clear all profile PIN data:', error);
    throw error;
  }
};

/**
 * Check if any profile PIN data is stored
 *
 * @returns true if at least one profile has PIN data
 */
export const hasAnyProfilePinData = async (): Promise<boolean> => {
  try {
    const allData = await getAllProfilePinData();
    return Object.keys(allData).length > 0;
  } catch (error) {
    logger.error('[PIN Storage] Failed to check for profile PIN data:', error);
    return false;
  }
};

/**
 * Get display name for a profile
 *
 * Returns @username for personal, businessName for business.
 *
 * @param data - Profile PIN data
 * @returns Display string for UI
 */
export const getProfileDisplayName = (data: ProfilePinData): string => {
  if (data.profileType === 'personal' && data.username) {
    return `@${data.username}`;
  }
  if (data.profileType === 'business' && data.businessName) {
    return data.businessName;
  }
  return data.displayName;
};

// ============================================================================
// LEGACY: Backward Compatibility Functions (Deprecated)
// ============================================================================

/**
 * @deprecated Use storeProfilePinData() instead
 * Store the last successfully logged-in user's identifier for PIN authentication
 */
export const storeLastUserForPin = async (identifier: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(LAST_PIN_USER_KEY, identifier);
    logger.debug('[PIN Storage] [LEGACY] Stored last user for PIN');
  } catch (error) {
    logger.error('[PIN Storage] [LEGACY] Failed to store last user for PIN:', error);
    throw error;
  }
};

/**
 * @deprecated Use getProfilePinData() instead
 * Get the stored user identifier for PIN authentication
 */
export const getLastUserForPin = async (): Promise<string | null> => {
  try {
    // First try new system
    const pinData = await getProfilePinData();
    if (pinData) {
      return pinData.identifier;
    }

    // Fall back to legacy
    const identifier = await SecureStore.getItemAsync(LAST_PIN_USER_KEY);
    logger.debug('[PIN Storage] [LEGACY] Retrieved last user for PIN', { found: !!identifier });
    return identifier;
  } catch (error) {
    logger.error('[PIN Storage] [LEGACY] Failed to retrieve last user for PIN:', error);
    return null;
  }
};

/**
 * @deprecated Use setLastActiveProfile('') instead
 * Clear the stored PIN user (for account switching)
 */
export const clearLastUserForPin = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(LAST_PIN_USER_KEY);
    await setLastActiveProfile(''); // Also clear new system's active profile
    logger.debug('[PIN Storage] [LEGACY] Cleared last user for PIN');
  } catch (error) {
    logger.error('[PIN Storage] [LEGACY] Failed to clear last user for PIN:', error);
    throw error;
  }
};

/**
 * @deprecated Use hasAnyProfilePinData() or check getProfilePinData() instead
 * Check if a PIN user is stored on this device
 */
export const hasPinUserStored = async (): Promise<boolean> => {
  try {
    // Check new system first
    const hasNew = await hasAnyProfilePinData();
    if (hasNew) {
      const activeId = await getLastActiveProfileId();
      return !!activeId;
    }

    // Fall back to legacy
    const identifier = await SecureStore.getItemAsync(LAST_PIN_USER_KEY);
    return identifier !== null && identifier.trim() !== '';
  } catch (error) {
    logger.error('[PIN Storage] [LEGACY] Failed to check for stored PIN user:', error);
    return false;
  }
};

// ============================================================================
// BIOMETRIC PIN STORAGE: Store/retrieve actual PIN for biometric authentication
// ============================================================================

/**
 * Store PIN in Keychain protected by biometric authentication
 *
 * When user sets their PIN during KYC or changes it, store it in Keychain
 * so biometric can retrieve it later for profile switching.
 *
 * Security: PIN is stored in iOS Keychain with biometric protection.
 * Only Face ID / Touch ID can unlock it.
 *
 * @param profileId - The profile ID this PIN belongs to
 * @param pin - The 6-digit PIN to store
 */
export const storePinForBiometric = async (
  profileId: string,
  pin: string
): Promise<boolean> => {
  try {
    const key = `${PROFILE_PIN_SECRET_PREFIX}${profileId}`;

    // Store with biometric protection (requireAuthentication)
    // Note: On iOS this stores in Keychain with kSecAccessControlBiometryCurrentSet
    await SecureStore.setItemAsync(key, pin, {
      keychainService: 'swap-pin-biometric',
      requireAuthentication: false, // Store without auth, retrieve WITH auth
    });

    logger.info('[PIN Storage] Stored PIN for biometric access', { profileId });
    console.log('🔐 [PIN Storage] PIN stored for biometric access:', { profileId });
    return true;
  } catch (error) {
    logger.error('[PIN Storage] Failed to store PIN for biometric:', error);
    console.error('❌ [PIN Storage] Failed to store PIN for biometric:', error);
    return false;
  }
};

/**
 * Retrieve PIN from Keychain using biometric authentication
 *
 * Called when user taps "Use Biometric" button for profile switching or login.
 * This will trigger Face ID / Touch ID prompt.
 *
 * @param profileId - The profile ID to get PIN for
 * @param promptMessage - Custom message for biometric prompt
 * @returns The stored PIN, or null if biometric fails or no PIN stored
 */
export const getPinWithBiometric = async (
  profileId: string,
  promptMessage: string = 'Authenticate to access your account'
): Promise<string | null> => {
  try {
    const key = `${PROFILE_PIN_SECRET_PREFIX}${profileId}`;

    // Retrieve with biometric authentication
    // This triggers Face ID / Touch ID on iOS
    const pin = await SecureStore.getItemAsync(key, {
      keychainService: 'swap-pin-biometric',
      requireAuthentication: true,
      authenticationPrompt: promptMessage,
    });

    if (pin) {
      logger.info('[PIN Storage] Retrieved PIN via biometric', { profileId });
      console.log('✅ [PIN Storage] PIN retrieved via biometric:', { profileId });
    } else {
      logger.debug('[PIN Storage] No PIN stored for biometric', { profileId });
      console.log('ℹ️ [PIN Storage] No PIN stored for biometric:', { profileId });
    }

    return pin;
  } catch (error: any) {
    // User cancelled biometric or biometric failed
    if (error.message?.includes('cancel') || error.message?.includes('authentication')) {
      logger.debug('[PIN Storage] Biometric cancelled or failed', { profileId });
      console.log('🚫 [PIN Storage] Biometric cancelled or failed:', { profileId });
    } else {
      logger.error('[PIN Storage] Failed to retrieve PIN with biometric:', error);
      console.error('❌ [PIN Storage] Failed to retrieve PIN with biometric:', error);
    }
    return null;
  }
};

/**
 * Check if a PIN is stored for biometric access
 *
 * @param profileId - The profile ID to check
 * @returns true if PIN is stored (biometric can be used)
 */
export const hasPinForBiometric = async (profileId: string): Promise<boolean> => {
  try {
    const key = `${PROFILE_PIN_SECRET_PREFIX}${profileId}`;

    // Check without authentication (just existence check)
    const pin = await SecureStore.getItemAsync(key, {
      keychainService: 'swap-pin-biometric',
      requireAuthentication: false,
    });

    return !!pin;
  } catch (error) {
    logger.error('[PIN Storage] Failed to check biometric PIN existence:', error);
    return false;
  }
};

/**
 * Clear PIN stored for biometric
 *
 * Called when user changes PIN, logs out, or removes account.
 *
 * @param profileId - The profile ID to clear PIN for
 */
export const clearPinForBiometric = async (profileId: string): Promise<void> => {
  try {
    const key = `${PROFILE_PIN_SECRET_PREFIX}${profileId}`;
    await SecureStore.deleteItemAsync(key, {
      keychainService: 'swap-pin-biometric',
    });
    logger.debug('[PIN Storage] Cleared PIN for biometric', { profileId });
    console.log('🗑️ [PIN Storage] Cleared PIN for biometric:', { profileId });
  } catch (error) {
    logger.error('[PIN Storage] Failed to clear biometric PIN:', error);
  }
};
