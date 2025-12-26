/**
 * Device Info Utility
 *
 * Provides device information for session tracking and security.
 * Used to populate user_sessions table for device management in Settings.
 *
 * @see SecurityPrivacy.tsx - Device Management section
 */

import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export interface DeviceInfo {
  device_name: string;
  device_type: 'phone' | 'tablet' | 'desktop' | 'unknown';
  os_name: string;
  os_version: string;
}

/**
 * Get device information for session tracking
 *
 * @returns Device info object with name, type, OS
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  // Device name: "iPhone 15 Pro" or "Pixel 8"
  const deviceName = Device.deviceName
    || `${Device.brand || ''} ${Device.modelName || ''}`.trim()
    || 'Unknown Device';

  // Device type mapping
  let deviceType: DeviceInfo['device_type'] = 'unknown';
  if (Device.deviceType === Device.DeviceType.PHONE) {
    deviceType = 'phone';
  } else if (Device.deviceType === Device.DeviceType.TABLET) {
    deviceType = 'tablet';
  } else if (Device.deviceType === Device.DeviceType.DESKTOP) {
    deviceType = 'desktop';
  }

  // OS info
  const osName = Device.osName || Platform.OS || 'Unknown';
  const osVersion = Device.osVersion || Platform.Version?.toString() || 'Unknown';

  return {
    device_name: deviceName,
    device_type: deviceType,
    os_name: osName,
    os_version: osVersion,
  };
}

/**
 * Generate a fingerprint hash for device identification
 *
 * Used to identify the same device across sessions.
 * NOT for security - just for UX (showing "This device" in settings).
 *
 * @returns SHA256 hash of device characteristics
 */
export async function getDeviceFingerprint(): Promise<string> {
  // Combine device characteristics for fingerprinting
  const parts = [
    Device.brand,
    Device.modelName,
    Device.osName,
    Device.osVersion,
    Device.deviceYearClass?.toString(),
    Device.totalMemory?.toString(),
  ].filter(Boolean).join('-');

  // Hash for consistent length and privacy
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    parts
  );

  return hash;
}

/**
 * Get all device info including fingerprint
 *
 * Convenience function for login/session creation
 */
export async function getFullDeviceInfo(): Promise<DeviceInfo & { fingerprint: string }> {
  const [info, fingerprint] = await Promise.all([
    getDeviceInfo(),
    getDeviceFingerprint(),
  ]);

  return {
    ...info,
    fingerprint,
  };
}
