// Created: Added PasswordVerificationModal component for secure password verification - 2025-06-27
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import apiClient from '../_api/apiClient';

interface PasswordVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (password: string) => void;
  title?: string;
  subtitle?: string;
  userEmail: string;
}

const PasswordVerificationModal: React.FC<PasswordVerificationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  title = 'Verify Your Password',
  subtitle = 'For security, please enter your password to continue.',
  userEmail,
}) => {
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setPassword('');
    setPasswordError('');
    setIsLoading(false);
    onClose();
  };

  const handleVerify = async () => {
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }

    setIsLoading(true);
    setPasswordError('');

    try {
      console.log('[PasswordVerificationModal] Verifying password for user:', userEmail);

      // Create a temporary API client without auth headers for credential verification
      const tempApiClient = { ...apiClient };
      const currentAuth = tempApiClient.defaults.headers.common['Authorization'];
      const currentProfileId = tempApiClient.defaults.headers.common['X-Profile-ID'];

      try {
        // Temporarily remove auth headers for credential verification
        delete tempApiClient.defaults.headers.common['Authorization'];
        delete tempApiClient.defaults.headers.common['X-Profile-ID'];

        // Verify credentials with backend
        const verifyResponse = await tempApiClient.post('/auth/verify-credentials', {
          identifier: userEmail,
          password: password
        });

        console.log('[PasswordVerificationModal] Verification response status:', verifyResponse.status);
        console.log('[PasswordVerificationModal] Verification response data:', verifyResponse.data);

        // Check for success - either by status code or response data
        const isSuccess = verifyResponse.status === 201 || 
                         verifyResponse.data?.success || 
                         verifyResponse.data?.data?.success;

        if (!isSuccess) {
          setPasswordError('Incorrect password. Please try again.');
          return;
        }

        // Password verified successfully
        onSuccess(password);
        handleClose();

      } catch (credentialError: any) {
        console.error('[PasswordVerificationModal] Credential verification failed:', credentialError);
        if (credentialError.response?.status === 401) {
          setPasswordError('Incorrect password. Please try again.');
        } else {
          setPasswordError('Unable to verify password. Please try again.');
        }
        return;
      } finally {
        // Restore auth headers
        if (currentAuth) {
          tempApiClient.defaults.headers.common['Authorization'] = currentAuth;
        }
        if (currentProfileId) {
          tempApiClient.defaults.headers.common['X-Profile-ID'] = currentProfileId;
        }
      }

    } catch (error) {
      console.error('[PasswordVerificationModal] Error during password verification:', error);
      setPasswordError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    inputContainer: {
      marginBottom: theme.spacing.lg,
    },
    label: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    input: {
      ...theme.commonStyles.input,
      height: 50,
    },
    inputError: {
      borderColor: theme.colors.error,
      borderWidth: 2,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    cancelButton: {
      ...theme.commonStyles.secondaryButton,
      flex: 1,
      height: 50,
    },
    verifyButton: {
      ...theme.commonStyles.primaryButton,
      flex: 1,
      height: 50,
    },
    cancelButtonText: {
      ...theme.commonStyles.secondaryButtonText as any,
    },
    verifyButtonText: {
      ...theme.commonStyles.primaryButtonText as any,
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
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name="lock-closed" 
                size={28} 
                color={theme.colors.primary} 
              />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[
                styles.input,
                passwordError ? styles.inputError : {}
              ]}
              placeholder="Enter your password"
              placeholderTextColor={theme.colors.inputPlaceholder}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={handleVerify}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.white} />
                  <Text style={styles.loadingText}>Verifying...</Text>
                </View>
              ) : (
                <Text style={styles.verifyButtonText}>Verify</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PasswordVerificationModal; 