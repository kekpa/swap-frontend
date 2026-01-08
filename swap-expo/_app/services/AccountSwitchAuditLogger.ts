/**
 * AccountSwitchAuditLogger
 *
 * Local audit logging for Instagram-style account switching
 * - Encrypted MMKV storage for security
 * - FIFO retention (last 50 switches)
 * - Device info tracking
 * - User awareness via Settings → Security → Account Activity
 *
 * Compliance: Provides user awareness and security monitoring
 * Pattern: Similar to Google's "Device Activity" and Instagram's "Login Activity"
 */

import { MMKV } from 'react-native-mmkv';
import * as Device from 'expo-device';
import logger from '../utils/logger';

// Encrypted MMKV storage for audit logs
const auditStorage = new MMKV({
  id: 'swap-account-switch-audit',
  encryptionKey: 'swap-account-audit-encryption-key-2025'
});

const AUDIT_LOG_KEY = 'account_switch_history';
const MAX_AUDIT_ENTRIES = 50; // FIFO retention

export interface AccountSwitchAuditEntry {
  timestamp: number;
  fromUserId: string;
  toUserId: string;
  deviceId: string | null;
  deviceName: string | null;
  deviceModel: string | null;
  osVersion: string | null;
  success: boolean;
}

/**
 * Log an account switch event
 */
export async function logAccountSwitch(
  fromUserId: string,
  toUserId: string,
  success: boolean = true
): Promise<void> {
  try {
    const entry: AccountSwitchAuditEntry = {
      timestamp: Date.now(),
      fromUserId,
      toUserId,
      deviceId: Device.osInternalBuildId || null,
      deviceName: Device.deviceName || null,
      deviceModel: Device.modelName || null,
      osVersion: Device.osVersion || null,
      success,
    };

    // Get existing history
    const history = getAccountSwitchHistory();

    // Add new entry at the beginning
    history.unshift(entry);

    // Keep only last MAX_AUDIT_ENTRIES (FIFO)
    const trimmedHistory = history.slice(0, MAX_AUDIT_ENTRIES);

    // Save back to storage
    auditStorage.set(AUDIT_LOG_KEY, JSON.stringify(trimmedHistory));

    logger.debug('[AccountSwitchAudit] Logged switch', 'auth', {
      from: fromUserId.substring(0, 8),
      to: toUserId.substring(0, 8),
      timestamp: new Date(entry.timestamp).toISOString(),
    });
  } catch (error) {
    logger.error('[AccountSwitchAudit] Error logging switch:', error);
  }
}

/**
 * Get full account switch history
 * Sorted by timestamp (newest first)
 */
export function getAccountSwitchHistory(): AccountSwitchAuditEntry[] {
  try {
    const stored = auditStorage.getString(AUDIT_LOG_KEY);
    if (!stored) {
      return [];
    }

    const history: AccountSwitchAuditEntry[] = JSON.parse(stored);
    return history;
  } catch (error) {
    logger.error('[AccountSwitchAudit] Error reading history:', error);
    return [];
  }
}

/**
 * Get recent account switches (last N entries)
 */
export function getRecentAccountSwitches(limit: number = 10): AccountSwitchAuditEntry[] {
  const history = getAccountSwitchHistory();
  return history.slice(0, limit);
}

/**
 * Get account switches for a specific user
 */
export function getAccountSwitchesForUser(userId: string): AccountSwitchAuditEntry[] {
  const history = getAccountSwitchHistory();
  return history.filter(entry => entry.toUserId === userId || entry.fromUserId === userId);
}

/**
 * Get account switches within a time range
 */
export function getAccountSwitchesByDateRange(
  startTimestamp: number,
  endTimestamp: number
): AccountSwitchAuditEntry[] {
  const history = getAccountSwitchHistory();
  return history.filter(
    entry => entry.timestamp >= startTimestamp && entry.timestamp <= endTimestamp
  );
}

/**
 * Clear all audit history (for privacy/GDPR)
 */
export function clearAccountSwitchHistory(): void {
  try {
    auditStorage.delete(AUDIT_LOG_KEY);
    logger.info('[AccountSwitchAudit] History cleared');
  } catch (error) {
    logger.error('[AccountSwitchAudit] Error clearing history:', error);
  }
}

/**
 * Get audit statistics
 */
export function getAccountSwitchStats(): {
  totalSwitches: number;
  uniqueAccounts: Set<string>;
  lastSwitchTimestamp: number | null;
  failedSwitches: number;
} {
  const history = getAccountSwitchHistory();

  const uniqueAccounts = new Set<string>();
  let failedSwitches = 0;

  history.forEach(entry => {
    uniqueAccounts.add(entry.fromUserId);
    uniqueAccounts.add(entry.toUserId);
    if (!entry.success) {
      failedSwitches++;
    }
  });

  return {
    totalSwitches: history.length,
    uniqueAccounts,
    lastSwitchTimestamp: history.length > 0 ? history[0].timestamp : null,
    failedSwitches,
  };
}

export default {
  logAccountSwitch,
  getAccountSwitchHistory,
  getRecentAccountSwitches,
  getAccountSwitchesForUser,
  getAccountSwitchesByDateRange,
  clearAccountSwitchHistory,
  getAccountSwitchStats,
};
