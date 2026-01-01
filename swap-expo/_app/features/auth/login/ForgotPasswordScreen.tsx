// Created: Added ForgotPasswordScreen component for login flow - 2024-07-30
// Updated: Refactored to use global theme system - YYYY-MM-DD
// Updated: Enhanced email validation and "Contact Support" flow for unregistered emails - 2025-01-26
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/ThemeContext";
import { Theme } from "../../../theme/theme";
import apiClient from "../../../_api/apiClient";
import { API_PATHS } from "../../../_api/apiPaths";
import logger from "../../../utils/logger";

// Define type for navigation
type AuthStackParamList = {
  LogIn: undefined;
  ForgotPassword: undefined;
  // VerificationCode is no longer needed in this flow
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false); // New state to show success message
  
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendCode = async () => {
    // Reset error state
    setError(null);
    
    // Validate email
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call forgot password API
      const response = await apiClient.post(API_PATHS.AUTH.FORGOT_PASSWORD, {
        email: email.trim().toLowerCase()
      });
      
      logger.debug("Forgot password request successful", 'auth', { email: email.trim().toLowerCase() });

      // Request was successful, show the confirmation screen
      setRequestSent(true);

    } catch (error: any) {
      logger.error("Forgot password request failed", error, 'auth');
      // Even on failure, for security we can show the same message.
      // Or handle specific errors like rate limiting.
      if (error.response?.status === 429) {
        setError("Too many requests. Please wait a few minutes before trying again.");
      } else {
        // For all other errors, just proceed to the success screen to prevent info leaks.
        setRequestSent(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };

  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, padding: theme.spacing.lg },
    backButton: { width: 40, height: 40, justifyContent: "center", marginBottom: theme.spacing.lg, alignSelf: 'flex-start' },
    header: { marginBottom: theme.spacing.xl, alignItems: "center" },
    title: { fontSize: theme.typography.fontSize.xxl, fontWeight: "700" as const, marginBottom: theme.spacing.sm, textAlign: "center", color: theme.colors.textPrimary },
    subtitle: { fontSize: theme.typography.fontSize.md, color: theme.colors.textSecondary, textAlign: "center" },
    formContainer: { marginBottom: theme.spacing.lg },
    label: { fontSize: theme.typography.fontSize.md, fontWeight: "500" as const, marginBottom: theme.spacing.sm, color: theme.colors.textPrimary },
    input: { ...theme.commonStyles.input, height: 56 },
    errorText: { color: theme.colors.error, marginTop: theme.spacing.sm, fontSize: theme.typography.fontSize.sm },
    buttonContainer: { marginTop: "auto" },
    sendButton: { ...theme.commonStyles.primaryButton, height: 56 },
    sendButtonText: { ...theme.commonStyles.primaryButtonText },
    // Contact Support styles
    contactSupportContainer: { 
      backgroundColor: theme.colors.primaryUltraLight, 
      borderRadius: theme.borderRadius.md, 
      padding: theme.spacing.lg, 
      marginBottom: theme.spacing.lg,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary
    },
    contactSupportTitle: { 
      fontSize: theme.typography.fontSize.lg, 
      fontWeight: "600" as const, 
      color: theme.colors.textPrimary, 
      marginBottom: theme.spacing.sm,
      textAlign: "center" 
    },
    contactSupportText: { 
      fontSize: theme.typography.fontSize.md, 
      color: theme.colors.textSecondary, 
      textAlign: "center",
      lineHeight: 22,
      marginBottom: theme.spacing.md 
    },
    contactSupportButton: { 
      backgroundColor: theme.colors.primary, 
      paddingVertical: theme.spacing.sm, 
      paddingHorizontal: theme.spacing.md, 
      borderRadius: theme.borderRadius.sm, 
      alignSelf: "center" 
    },
    contactSupportButtonText: { 
      color: theme.colors.white, 
      fontWeight: "500" as const, 
      fontSize: theme.typography.fontSize.sm 
    },
  }), [theme]);

  if (requestSent) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background}/>
        <View style={styles.content}>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Ionicons name="checkmark-circle-outline" size={80} color={theme.colors.success} style={{marginBottom: theme.spacing.lg}} />
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              If an account exists for <Text style={{fontWeight: 'bold' as 'bold'}}>{email}</Text>, you will receive an email with instructions to reset your password.
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleDone}
            >
              <Text style={styles.sendButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background}/>
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address to receive a verification code
          </Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={theme.colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.sendButton, isLoading && {backgroundColor: theme.colors.grayMedium}]}
            onPress={handleSendCode}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.sendButtonText}>Send Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen; 