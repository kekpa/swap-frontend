/**
 * Biometric Availability Hook
 *
 * Detects device biometric capabilities for both iOS and Android
 * Used by AppLockSetupScreen for local biometric setup
 */

import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import logger from '../utils/logger';

interface BiometricAvailability {
  isAvailable: boolean;
  isLoading: boolean;
  hasHardware: boolean;
  hasEnrolledBiometrics: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

export const useBiometricAvailability = (): BiometricAvailability => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasHardware, setHasHardware] = useState(false);
  const [hasEnrolledBiometrics, setHasEnrolledBiometrics] = useState(false);
  const [supportedTypes, setSupportedTypes] = useState<LocalAuthentication.AuthenticationType[]>([]);

  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        setIsLoading(true);

        // Step 1: Check if device has biometric hardware
        const compatible = await LocalAuthentication.hasHardwareAsync();
        setHasHardware(compatible);

        if (!compatible) {
          logger.debug("Device does not have biometric hardware", "auth");
          setIsLoading(false);
          return;
        }

        // Step 2: Check if biometrics are enrolled
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setHasEnrolledBiometrics(enrolled);

        if (!enrolled) {
          logger.debug("No biometrics enrolled on device", "auth");
          setIsLoading(false);
          return;
        }

        // Step 3: Get supported authentication types
        const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setSupportedTypes(supported);

        logger.debug("Biometric supported types", "auth", {
          types: supported.map(type => LocalAuthentication.AuthenticationType[type]).join(', ')
        });

      } catch (error) {
        logger.error("Error checking biometric availability", error, "auth");
        setHasHardware(false);
        setHasEnrolledBiometrics(false);
        setSupportedTypes([]);
      } finally {
        setIsLoading(false);
      }
    };

    checkBiometricAvailability();
  }, []);

  // Biometric is available if device has hardware AND has enrolled biometrics
  const isAvailable = hasHardware && hasEnrolledBiometrics && supportedTypes.length > 0;

  return {
    isAvailable,
    isLoading,
    hasHardware,
    hasEnrolledBiometrics,
    supportedTypes,
  };
};