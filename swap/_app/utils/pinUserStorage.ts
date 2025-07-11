// Created: PIN user storage utilities for device-bound authentication - 2025-01-08

import * as SecureStore from 'expo-secure-store';

const LAST_PIN_USER_KEY = 'LAST_PIN_USER';

/**
 * Store the last successfully logged-in user's identifier for PIN authentication
 */
export const storeLastUserForPin = async (identifier: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(LAST_PIN_USER_KEY, identifier);
    console.log('[PIN Storage] Stored last user for PIN:', identifier);
  } catch (error) {
    console.error('[PIN Storage] Failed to store last user for PIN:', error);
    throw error;
  }
};

/**
 * Get the stored user identifier for PIN authentication
 */
export const getLastUserForPin = async (): Promise<string | null> => {
  try {
    const identifier = await SecureStore.getItemAsync(LAST_PIN_USER_KEY);
    console.log('[PIN Storage] Retrieved last user for PIN:', identifier || 'none');
    return identifier;
  } catch (error) {
    console.error('[PIN Storage] Failed to retrieve last user for PIN:', error);
    return null;
  }
};

/**
 * Clear the stored PIN user (for account switching)
 */
export const clearLastUserForPin = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(LAST_PIN_USER_KEY);
    console.log('[PIN Storage] Cleared last user for PIN');
  } catch (error) {
    console.error('[PIN Storage] Failed to clear last user for PIN:', error);
    throw error;
  }
};

/**
 * Check if a PIN user is stored on this device
 */
export const hasPinUserStored = async (): Promise<boolean> => {
  try {
    const identifier = await getLastUserForPin();
    return identifier !== null && identifier.trim() !== '';
  } catch (error) {
    console.error('[PIN Storage] Failed to check for stored PIN user:', error);
    return false;
  }
}; 