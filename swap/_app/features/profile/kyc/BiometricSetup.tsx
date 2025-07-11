// Updated: Refactored BiometricSetup to use PasswordVerificationModal for better UX - 2025-06-27
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../../theme/ThemeContext';
import { Theme } from '../../../theme/theme';
import { ProfileStackParamList } from '../../../navigation/profileNavigator';
import apiClient from '../../../_api/apiClient';
import { API_PATHS } from '../../../_api/apiPaths';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useKycStatus } from './hooks/useKycStatus';
import PasswordVerificationModal from '../../../components/PasswordVerificationModal';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;
type BiometricSetupRouteProp = RouteProp<ProfileStackParamList, 'BiometricSetup'>;

interface BiometricOption {
  type: LocalAuthentication.AuthenticationType;
  title: string;
  description: string;
  icon: string;
  available: boolean;
}

const BiometricSetup: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BiometricSetupRouteProp>();
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const { kycStatus } = useKycStatus();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [availableBiometrics, setAvailableBiometrics] = useState<LocalAuthentication.AuthenticationType[]>([]);
  const [selectedBiometric, setSelectedBiometric] = useState<LocalAuthentication.AuthenticationType | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [hasHardware, setHasHardware] = useState(false);
  const [hasEnrolledBiometrics, setHasEnrolledBiometrics] = useState(false);

  const { returnToTimeline, sourceRoute } = route.params || {};

  const handleBack = () => {
    if (returnToTimeline) {
      navigation.navigate('VerifyYourIdentity', { sourceRoute });
    } else {
      navigation.goBack();
    }
  };

  const handleContinue = () => {
    if (returnToTimeline) {
      navigation.navigate('VerifyYourIdentity', { sourceRoute });
    } else {
      navigation.goBack();
    }
  };

  const handleSkip = () => {
    if (returnToTimeline) {
      navigation.navigate('VerifyYourIdentity', { sourceRoute });
    } else {
      navigation.goBack();
    }
  };

  // Check for biometric hardware and enrolled biometrics on mount
  useEffect(() => {
    (async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        setHasHardware(compatible);
        
        if (!compatible) {
          console.log('[BiometricSetup] Device does not have biometric hardware.');
          setIsBiometricAvailable(false);
          return;
        }
        
        const savedBiometrics = await LocalAuthentication.isEnrolledAsync();
        setHasEnrolledBiometrics(savedBiometrics);
        
        if (!savedBiometrics) {
          console.log('[BiometricSetup] No biometrics are enrolled on this device.');
          setIsBiometricAvailable(false);
          return;
        }
        
        const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setAvailableBiometrics(supported);
        setIsBiometricAvailable(true);
        
        // Auto-select the first available biometric
        if (supported.length > 0) {
          setSelectedBiometric(supported[0]);
        }
        
        console.log('[BiometricSetup] Supported types:', supported.map(type => LocalAuthentication.AuthenticationType[type]).join(', '));
      } catch (error) {
        console.error('[BiometricSetup] Error checking biometric availability:', error);
        setIsBiometricAvailable(false);
        setHasHardware(false);
        setHasEnrolledBiometrics(false);
      }
    })();
  }, []);

  // Define biometric options (remove iris scanner, it's not mainstream)
  const biometricOptions: BiometricOption[] = useMemo(() => [
    {
      type: LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      title: 'Face ID',
      description: 'Use your face to unlock the app',
      icon: 'scan-circle-outline',
      available: availableBiometrics.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
    },
    {
      type: LocalAuthentication.AuthenticationType.FINGERPRINT,
      title: 'Touch ID / Fingerprint',
      description: 'Use your fingerprint to unlock the app',
      icon: 'finger-print-outline',
      available: availableBiometrics.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
    },
  ], [availableBiometrics]);

  const handleEnableBiometric = () => {
    if (!selectedBiometric) {
      Alert.alert('No Selection', 'Please select a biometric method to enable.');
      return;
    }
    
    // Show password verification modal
    setShowPasswordModal(true);
  };

  const handlePasswordVerified = async (password: string) => {
    setIsLoading(true);
    
    try {
      await setupBiometricAuthentication(password);
    } catch (error) {
      console.error('[BiometricSetup] Error setting up biometric after password verification:', error);
      Alert.alert(
        'Setup Error', 
        'Failed to set up biometric login. You can set this up later in your account settings.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const setupBiometricAuthentication = async (password: string) => {
    try {
      // Test biometric authentication first
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Set up biometric authentication',
        fallbackLabel: 'Use Passcode',
      });
      
      if (!result.success) {
        Alert.alert(
          'Setup Failed', 
          'Biometric authentication setup failed. Please try again or select a different method.'
        );
        return;
      }

      // Determine biometric type string
      let biometricType = 'unknown';
      if (selectedBiometric === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
        biometricType = 'face_id';
      } else if (selectedBiometric === LocalAuthentication.AuthenticationType.FINGERPRINT) {
        biometricType = 'fingerprint';
      }
      
      // Store credentials for biometric login using verified password
      const userEmail = kycStatus?.email;
      if (!userEmail) {
        Alert.alert('Error', 'Unable to get user email. Please try again.');
        return;
      }
      await authContext.setupBiometricLogin(userEmail, password);
      
      // Call backend API to mark biometric setup as completed
      await apiClient.post(API_PATHS.KYC.BIOMETRIC_SETUP, {
        biometricType,
      });
      
      Alert.alert(
        'Biometric Setup Complete!', 
        'You can now use biometric authentication to sign in to your account.',
        [{ text: 'Continue', onPress: handleContinue }]
      );
    } catch (error) {
      console.error('[BiometricSetup] Error setting up biometric:', error);
      Alert.alert(
        'Setup Error', 
        'Failed to set up biometric login. You can set this up later in your account settings.'
      );
    }
  };

  const getSelectedBiometricTitle = () => {
    const selected = biometricOptions.find(option => option.type === selectedBiometric);
    return selected?.title || 'Biometric';
  };

  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    content: {
      flex: 1,
    },
    formContainer: {
      padding: theme.spacing.lg,
      flex: 1,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
    },
    biometricOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    selectedOption: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryUltraLight,
    },
    disabledOption: {
      opacity: 0.5,
      backgroundColor: theme.colors.background,
    },
    biometricIcon: {
      marginRight: theme.spacing.md,
    },
    biometricContent: {
      flex: 1,
    },
    biometricTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    biometricDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    selectionIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedIndicator: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    setupButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    setupButtonDisabled: {
      backgroundColor: theme.colors.border,
    },
    setupButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
    },
    skipButton: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    skipButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
    },
    unavailableContainer: {
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    unavailableIcon: {
      marginBottom: theme.spacing.md,
    },
    unavailableTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
      textAlign: 'center',
    },
    unavailableText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      marginLeft: theme.spacing.xs,
    },
  }), [theme]);

  // Render unavailable state - no hardware
  if (!hasHardware) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Biometric Setup</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.content}>
            <View style={styles.formContainer}>
              <View style={styles.unavailableContainer}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={64} 
                  color={theme.colors.textSecondary} 
                  style={styles.unavailableIcon}
                />
                <Text style={styles.unavailableTitle}>
                  Biometric Authentication Unavailable
                </Text>
                <Text style={styles.unavailableText}>
                  Your device doesn't support biometric authentication or no biometrics are enrolled. 
                  You can set up biometric login later in your device settings.
                </Text>
                
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                  <Text style={styles.skipButtonText}>Continue Without Biometrics</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Render hardware available but biometrics not enrolled state
  if (hasHardware && !hasEnrolledBiometrics) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Biometric Setup</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.content}>
            <View style={styles.formContainer}>
              <View style={styles.unavailableContainer}>
                <Ionicons 
                  name="finger-print-outline" 
                  size={64} 
                  color={theme.colors.textSecondary} 
                  style={styles.unavailableIcon}
                />
                <Text style={styles.unavailableTitle}>
                  Set Up Device Biometrics First
                </Text>
                <Text style={styles.unavailableText}>
                  Your device supports biometric authentication, but you haven't set up Face ID, Touch ID, or fingerprint yet. 
                  Please set up biometrics in your device settings first, then return here to enable biometric login for Swap.
                </Text>
                
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                  <Text style={styles.skipButtonText}>Skip for now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Biometric Setup</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Set up biometric authentication</Text>
            <Text style={styles.subtitle}>
              Choose your preferred biometric method for quick and secure access to your account.
            </Text>
            
            {/* Biometric Options */}
            {biometricOptions.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.biometricOption,
                  selectedBiometric === option.type && styles.selectedOption,
                  !option.available && styles.disabledOption,
                ]}
                onPress={() => option.available && setSelectedBiometric(option.type)}
                disabled={!option.available}
              >
                <Ionicons
                  name={option.icon as any}
                  size={32}
                  color={
                    !option.available 
                      ? theme.colors.textTertiary 
                      : selectedBiometric === option.type 
                        ? theme.colors.primary 
                        : theme.colors.textSecondary
                  }
                  style={styles.biometricIcon}
                />
                
                <View style={styles.biometricContent}>
                  <Text style={styles.biometricTitle}>{option.title}</Text>
                  <Text style={styles.biometricDescription}>
                    {option.available ? option.description : 'Not available on this device'}
                  </Text>
                </View>
                
                <View style={[
                  styles.selectionIndicator,
                  selectedBiometric === option.type && option.available && styles.selectedIndicator
                ]}>
                  {selectedBiometric === option.type && option.available && (
                    <Ionicons name="checkmark" size={12} color={theme.colors.white} />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {/* Setup Button */}
            <TouchableOpacity
              style={[styles.setupButton, (!selectedBiometric || isLoading) && styles.setupButtonDisabled]}
              onPress={handleEnableBiometric}
              disabled={!selectedBiometric || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.white} />
                  <Text style={styles.loadingText}>Setting up...</Text>
                </View>
              ) : (
                <Text style={styles.setupButtonText}>
                  Enable {getSelectedBiometricTitle()}
                </Text>
              )}
            </TouchableOpacity>

            {/* Skip Button */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={isLoading}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Verification Modal */}
        <PasswordVerificationModal
          visible={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={handlePasswordVerified}
          title="Verify Your Password"
          subtitle="For security, please enter your password to enable biometric authentication."
          userEmail={kycStatus?.email || ''}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BiometricSetup; 