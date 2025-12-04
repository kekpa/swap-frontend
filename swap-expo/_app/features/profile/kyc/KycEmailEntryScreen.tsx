// Created: Screen for entering email during KYC flow - 2025-01-26
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../navigation/profileNavigator';
import { useTheme } from '../../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../_api/apiClient';
import { API_PATHS } from '../../../_api/apiPaths';
import { useAuthContext } from '../../../features/auth/context/AuthContext';

type KycEmailEntryRouteProp = RouteProp<ProfileStackParamList, 'KycEmailEntry'>;
type KycEmailEntryNavigationProp = StackNavigationProp<ProfileStackParamList, 'KycEmailEntry'>;

const KycEmailEntryScreen = () => {
  const navigation = useNavigation<KycEmailEntryNavigationProp>();
  const route = useRoute<KycEmailEntryRouteProp>();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { returnToTimeline, sourceRoute, currentEmail } = route.params || {};

  // Pre-populate email from navigation params
  useEffect(() => {
    if (currentEmail) {
      setEmail(currentEmail);
    }
  }, [currentEmail]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleContinue = async () => {
    setError(null);
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    setIsLoading(true);
    try {
      // Here you might call an endpoint to check if the email is already in use
      // or to pre-register it in the KYC flow. For now, we'll just navigate.
      console.log(`[KycEmailEntryScreen] Email entered: ${email}. Navigating to verification.`);

      // We don't need to explicitly update the email here. 
      // The verification process itself should handle updating the user's email on the backend.

      navigation.navigate('VerificationCode', {
        type: 'email',
        contact: email.trim().toLowerCase(),
        returnToTimeline,
        sourceRoute,
      });

    } catch (err: any) {
      console.error("[KycEmailEntryScreen] Error:", err);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.card
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
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
    formGroup: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    input: {
      width: '100%',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
      height: 56,
    },
    continueButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginTop: 'auto',
    },
    disabledButton: {
      backgroundColor: theme.colors.border,
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
    },
    errorText: { color: theme.colors.error, marginTop: theme.spacing.sm, fontSize: theme.typography.fontSize.sm },
    helpContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primaryUltraLight,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    helpTextContainer: {
      marginLeft: theme.spacing.md,
      flex: 1,
    },
    helpTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    helpText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Adjust if necessary
      >
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Your Email</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>What's your email?</Text>
            <Text style={styles.subtitle}>
              We'll send a 6-digit code to verify your email address.
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                placeholderTextColor={theme.colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.helpContainer}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.success} />
              <View style={styles.helpTextContainer}>
                <Text style={styles.helpTitle}>Why is this required?</Text>
                <Text style={styles.helpText}>
                  Your email address is the only way to recover your account if you forget your password. For your security, it is a mandatory step to protect your account.
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.continueButton, (isLoading || !email) && styles.disabledButton]}
              onPress={handleContinue}
              disabled={isLoading || !email}
            >
              {isLoading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.continueButtonText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default KycEmailEntryScreen; 