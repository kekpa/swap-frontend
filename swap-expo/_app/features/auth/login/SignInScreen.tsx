// Updated: Removed Personal/Business account type toggle - users can login with any credentials and system finds account type automatically - 2025-01-27
// Created: Added SignInScreen component for login flow - 2024-07-30
// Updated: Refactored to use global theme system - YYYY-MM-DD
// Updated: Integrated with AuthContext for real login, added Remember Me, and credential loading - 2024-07-31
// Updated: Implemented UX for remembered accounts (pre-fill, display, switch account) - 2024-07-31
// Updated: Pre-fill email/password for DEV builds for faster testing - 2024-07-31
// Updated: Added Sign Up navigation link - 2025-05-30
// Updated: Changed PIN login from 4-digit to 6-digit passcode for consistency with KYC flow - 2025-06-07
import React, { useState, useRef, useEffect, useMemo } from "react";
import logger from "../../../utils/logger";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Switch,
  Alert,
  ScrollView
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useNavigation, useFocusEffect } from "@react-navigation/native";

// Storage key for remembering the last used identifier (Instagram/Revolut pattern)
const LAST_IDENTIFIER_KEY = 'lastLoginIdentifier';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthContext } from "../context/AuthContext";
import { useTheme } from "../../../theme/ThemeContext";
import { getProfilePinData, ProfilePinData, getProfileDisplayName, getLastActiveProfileId, storePinForBiometric } from "../../../utils/pinUserStorage";
import { Theme } from "../../../theme/theme";
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from "../../../tanstack-query/queryKeys";
import apiClient from "../../../_api/apiClient";
import { AUTH_PATHS } from "../../../_api/apiPaths";
import { saveAccessToken, saveRefreshToken, tokenManager } from "../../../services/token";
import { useAvailableProfiles } from "../../../hooks-data/useAvailableProfiles";

// Define type for navigation
type AuthStackParamList = {
  Launch: undefined;
  LogIn: undefined;
  ForgotPassword: undefined;
  SignUpScreen: undefined;
  VerificationCode: { email: string };
  ResetPassword: { email: string };
  App: undefined;
  PhoneEntry: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const SignInScreen = ({ route }: any) => {
  const navigation = useNavigation<NavigationProp>();
  const authContext = useAuthContext();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { data: availableProfiles } = useAvailableProfiles(); // For optimistic profile switching

  // Profile switch mode detection
  const mode = route?.params?.mode; // 'login' (default) | 'profileSwitch'
  const targetProfileId = route?.params?.targetProfileId;
  const targetEntityId = route?.params?.targetEntityId;
  const targetDisplayName = route?.params?.targetDisplayName; // For UX: business name or username
  const targetProfileType = route?.params?.targetProfileType as 'personal' | 'business' | undefined;
  const sourceRoute = route?.params?.sourceRoute;
  const sourceUserId = route?.params?.sourceUserId; // User who initiated the profile switch
  const sourceUsername = route?.params?.sourceUsername; // For "via @username" display
  const sourceIdentifier = route?.params?.sourceIdentifier; // Phone number for PIN auth (captured while logged in)
  const isProfileSwitchMode = mode === 'profileSwitch';

  // Helper functions for biometric prompt tracking
  const shouldShowBiometricPrompt = async (): Promise<boolean> => {
    try {
      const hasShownPrompt = await AsyncStorage.getItem('biometric_prompt_shown');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const hasStoredCredentials = !!(await authContext.getBiometricCredentials());
      
      // Don't show if: already shown, no hardware, or already has biometric credentials stored
      return !hasShownPrompt && hasHardware && !hasStoredCredentials;
    } catch (error) {
      logger.error('Error checking biometric prompt status', error, 'auth');
      return false;
    }
  };

  const markBiometricPromptShown = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem('biometric_prompt_shown', 'true');
    } catch (error) {
      logger.error('Error marking biometric prompt as shown', error, 'auth');
    }
  };

  const [activeTab, setActiveTab] = useState<'pin' | 'password'>('pin'); // Start with PIN, will switch to password if no PIN user found
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [identifier, setIdentifier] = useState(__DEV__ ? "17542167992" : "");
  const [password, setPassword] = useState(__DEV__ ? "password" : "");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberedUserIdentifier, setRememberedUserIdentifier] = useState<string | null>(null); // For displaying remembered user
  const [pinUserIdentifier, setPinUserIdentifier] = useState<string | null>(null); // For PIN authentication
  const [hasPinUser, setHasPinUser] = useState<boolean>(false);
  const [pinUserData, setPinUserData] = useState<ProfilePinData | null>(null); // For Instagram-style display
  const [supportedBiometrics, setSupportedBiometrics] = useState<LocalAuthentication.AuthenticationType[]>([]);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  
  // Refs for PIN inputs to allow auto-advancing
  const pinInputRefs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);
  const identifierInputRef = useRef<TextInput | null>(null); // Ref for identifier input
  const passwordInputRef = useRef<TextInput | null>(null); // Ref for password input
  
  // Check for biometric hardware and enrolled biometrics
  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        logger.debug('Device does not have biometric hardware', 'auth');
        return;
      }

      const savedBiometrics = await LocalAuthentication.isEnrolledAsync();
      if (!savedBiometrics) {
        logger.debug('No biometrics are enrolled on this device', 'auth');
        return;
      }

      const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setSupportedBiometrics(supported);
      setIsBiometricAvailable(true);
      logger.debug('Biometric supported types', 'auth', { types: supported.map(type => LocalAuthentication.AuthenticationType[type]) });
    })();
  }, []);
  
  // Handle input change for PIN
  const handlePinChange = (text: string, index: number) => {
    let newPin: string[];

    if (text.length > 1) {
      // Handle paste of entire PIN
      const pastedPin = text.slice(0, 6).split("");
      newPin = [...pin];

      pastedPin.forEach((digit, idx) => {
        if (idx < 6) {
          newPin[idx] = digit;
        }
      });

      setPin(newPin);

      // Focus last input or submit if all filled
      if (pastedPin.length === 6) {
        pinInputRefs.current[5]?.blur();
      } else {
        const nextIndex = Math.min(index + pastedPin.length, 5);
        pinInputRefs.current[nextIndex]?.focus();
      }
    } else {
      // Handle single digit input
      newPin = [...pin];
      newPin[index] = text;
      setPin(newPin);

      // Auto-advance to next input
      if (text !== "" && index < 5) {
        pinInputRefs.current[index + 1]?.focus();
      }
    }

    // AUTO-SUBMIT: If all 6 digits entered, submit automatically
    const pinComplete = newPin.every(digit => digit !== '');
    if (pinComplete && hasPinUser && !isLoading) {
      // Small delay for visual feedback before submit
      // Pass PIN directly to avoid React state timing issues
      const pinString = newPin.join('');
      setTimeout(() => {
        handleSignIn(pinString);
      }, 100);
    }
  };
  
  // Handle backspace key press for PIN
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && pin[index] === "" && index > 0) {
      // Move to previous input when backspace is pressed on an empty input
      pinInputRefs.current[index - 1]?.focus();
      // Clear the current input if backspace is pressed and it's already empty, and move focus
      const newPin = [...pin];
      newPin[index] = ""; // Ensure it is cleared
      if (index > 0) {
        newPin[index-1] = ""; // Optionally clear previous as well, or just focus
        pinInputRefs.current[index - 1]?.focus();
      }
      setPin(newPin);
    }
  };
  
  const handleForgotPin = () => {
    // Switch to password tab - user can login with password to reset PIN
    setActiveTab('password');
  };

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword");
  };
  
  const handleBiometricAuth = async () => {
    if (!isBiometricAvailable) {
      Alert.alert('Biometric Unavailable', 'Biometric authentication is not available on this device.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Prompt for biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to your account',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        // Biometric authentication successful, now login with stored credentials
        const loginResult = await authContext.loginWithBiometric();

        if (loginResult.success) {
          logger.info('Biometric login successful', 'auth');

          // If in profile switch mode, switch profile after auth
          if (isProfileSwitchMode && targetProfileId) {
            logger.debug('Profile switch mode detected (Biometric), switching profile...', 'auth');
            await handleProfileSwitch();
            return; // Exit early
          }

          // RootNavigator automatically shows LoadingScreen when authenticated but data loading
        } else {
          Alert.alert(
            'Login Failed', 
            loginResult.message || 'Failed to sign in with biometric authentication. Please try using your password.'
          );
        }
      } else {
        // Biometric authentication failed or was cancelled
        logger.debug('Biometric authentication failed or cancelled', 'auth', { error: result.error });
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication failed. Please try again or use your password.'
        );
      }
    } catch (error) {
      logger.error('Biometric authentication error', error, 'auth');
      Alert.alert(
        'Error', 
        'An error occurred during biometric authentication. Please try using your password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (pinOverride?: string) => {
    setIsLoading(true);

    if (activeTab === 'password') {
      const identifierToLogin = rememberedUserIdentifier || identifier;
      
      if (!identifierToLogin || !password) {
        Alert.alert("Error", "Identifier and password are required.");
        setIsLoading(false);
        return;
      }
      
      // Continue with login using the identifier as is (could be email, username, or phone)
      try {
        // Use unified login that automatically detects user type
        logger.debug('Using unified login that automatically detects user type', 'auth');
        const response = await authContext.unifiedLogin(identifierToLogin, password);
        const loginType = response?.user_type || 'unknown';

        if (response && response.success) {
          logger.info(`${loginType} sign in successful`, 'auth');

          // Save identifier for next time (Instagram/Revolut pattern)
          try {
            await SecureStore.setItemAsync(LAST_IDENTIFIER_KEY, identifierToLogin);
            logger.debug('Saved identifier to SecureStore for next login', 'auth');
          } catch (saveError) {
            logger.warn('Could not save identifier', 'auth');
          }

          // If in profile switch mode, switch profile after auth
          if (isProfileSwitchMode && targetProfileId) {
            logger.debug('Profile switch mode detected, switching profile', 'auth');
            await handleProfileSwitch();
            return; // Exit early, don't do normal login flow
          }

          // RootNavigator automatically shows LoadingScreen when authenticated but data loading

          // Handle biometric setup after navigation (optional, non-blocking)
          const shouldPromptBiometric = await shouldShowBiometricPrompt();
          if (shouldPromptBiometric) {
            const hasBiometrics = await LocalAuthentication.isEnrolledAsync();
            if (hasBiometrics) {
              // Delay the prompt to not interfere with loading screen
              setTimeout(() => {
                Alert.alert(
                  "Enable Biometric Sign In?",
                  "Would you like to use biometrics to sign in faster next time?",
                  [
                    { 
                      text: "Not Now", 
                      style: "cancel",
                      onPress: () => markBiometricPromptShown()
                    },
                    { 
                      text: "Enable", 
                      onPress: async () => {
                        await authContext.setupBiometricLogin(identifierToLogin, password);
                        await markBiometricPromptShown();
                        Alert.alert("Biometrics Enabled", "You can now use biometrics to sign in.");
                      }
                    }
                  ]
                );
              }, 2000); // Show after loading screen completes
            }
          }
        } else {
          // Unified login failed
          let errorMessage = "Invalid credentials. Please check your email/phone and password.";

          // Check if it's a "no profile found" error vs actual credential error
          if (response?.message?.includes('User profile not found') ||
              response?.message?.includes('Invalid credentials')) {
            errorMessage = "No account found with these credentials. Please check your email/phone and password, or create a new account.";
          }

          Alert.alert("Login Failed", errorMessage);
        }
      } catch (error: any) {
        logger.error('Unified login error', error, 'auth');
        let errorMessage = "Failed to sign in. Please try again.";

        // Handle specific error cases
        if (error.message?.includes('User profile not found') ||
            error.message?.includes('Invalid credentials')) {
          errorMessage = "No account found with these credentials. Please check your email/phone and password, or create a new account.";
        } else if (error.message?.includes('Invalid credentials')) {
          errorMessage = "Invalid credentials. Please check your email/phone and password.";
        }

        Alert.alert("Unified Login Error", errorMessage);
      }
    } else if (activeTab === 'pin') {
      // Use override if provided (from auto-submit), otherwise read from state
      const currentPin = pinOverride || pin.join("");
      if (currentPin.length !== 6) {
        Alert.alert("Error", "Please enter your 6-digit PIN.");
        setIsLoading(false);
        return;
      }
      
      // Use stored PIN user identifier
      if (!pinUserIdentifier) {
        Alert.alert("Error", "No account set up for PIN login on this device.");
        setIsLoading(false);
        return;
      }
      
      // Call the PIN login API with stored identifier
      // For now, PIN login is only for personal accounts
      try {
        const response = await authContext.loginWithPin(pinUserIdentifier, currentPin);
        if (response && response.success) {
          logger.info('PIN sign in successful', 'auth');

          // Store PIN for future biometric access (non-blocking)
          // Get the profile ID to associate the PIN with
          const profileId = targetProfileId || await getLastActiveProfileId();
          if (profileId) {
            storePinForBiometric(profileId, currentPin).catch((err) => {
              logger.warn('Failed to store PIN for biometric (non-fatal)', 'auth');
            });
          }

          // If in profile switch mode, switch profile after auth
          if (isProfileSwitchMode && targetProfileId) {
            logger.debug('Profile switch mode detected (PIN), switching profile', 'auth');
            await handleProfileSwitch();
            return; // Exit early
          }

          // RootNavigator automatically shows LoadingScreen when authenticated but data loading
        } else {
          Alert.alert("PIN Login Failed", response?.message || "Invalid PIN or PIN not set up for this account.");
        }
      } catch (error: any) {
        Alert.alert("PIN Login Error", error.message || "Failed to sign in with PIN. Please try again.");
      }
    }
    setIsLoading(false);
  };
  
  const handleProfileSwitch = async () => {
    logger.debug('handleProfileSwitch triggered', 'auth', {
      targetProfileId,
      sourceUserId,
      currentUser: authContext?.user?.entityId
    });

    try {
      // SECURITY: Validate that the logged-in user matches the original user who initiated the switch
      const currentUserId = authContext?.user?.user_id;

      if (sourceUserId && currentUserId && currentUserId !== sourceUserId) {
        logger.warn('Profile switch aborted: Different user logged in', 'auth', {
          expected: sourceUserId,
          actual: currentUserId,
        });

        Alert.alert(
          'Different User Detected',
          'You logged in as a different user. The profile switch has been cancelled. You will continue using your current account.',
          [{ text: 'OK' }]
        );

        // Don't proceed with profile switch - user stays on their own account
        return;
      }

      logger.debug('Starting profile switch with orchestrator', 'auth', { targetProfileId });

      // PROFESSIONAL: Use ProfileSwitchOrchestrator (state machine pattern)
      const { profileSwitchOrchestrator } = await import('../../../services/ProfileSwitchOrchestrator');

      // Set progress callback for UI feedback (optional)
      profileSwitchOrchestrator.setProgressCallback((state, message) => {
        logger.debug(`ProfileSwitch state: ${state}`, 'auth', { message });
        // TODO: Show progress UI here if needed
      });

      // Execute professional profile switch with optimistic updates (Phases 3 & 4)
      const result = await profileSwitchOrchestrator.switchProfile({
        targetProfileId: targetProfileId!,
        requireBiometric: true, // Biometric required for security
        apiClient,
        authContext,
        queryClient,
        availableProfiles: availableProfiles || [], // For instant UI updates (WhatsApp-level)
      });

      if (result.success) {
        logger.info('PROFESSIONAL profile switch completed successfully', 'auth');
      } else {
        logger.error('Profile switch failed', result.error, 'auth');
        // Error already shown by orchestrator
      }
    } catch (error: any) {
      logger.error('Profile switch orchestrator error', error, 'auth');
      // Orchestrator handles its own error alerts, but catch unexpected errors
      Alert.alert('Unexpected Error', error.message || 'An unexpected error occurred. Please try again.');
    }
  };

  const handleUseOtherAccount = () => {
    setIdentifier("");
    setPassword("");
    setRememberedUserIdentifier(null);
    authContext.setRememberMe(false); // This will trigger credential clearing in AuthContext
    setActiveTab('password'); // Ensure password tab is active
    setTimeout(() => identifierInputRef.current?.focus(), 100); // Focus identifier input
  };

  const handleUseDifferentAccountForPin = async () => {
    // Clear the stored PIN user
    await authContext.clearPinUser();
    setPinUserIdentifier(null);
    setPinUserData(null); // Clear Instagram-style data too
    setHasPinUser(false);
    setActiveTab('password'); // Switch to password tab
    setTimeout(() => identifierInputRef.current?.focus(), 100); // Focus identifier input
  };

  const handleSignUp = () => {
    navigation.navigate("SignUpScreen");
  };

  // Focus logic based on state
  useEffect(() => {
    const timer = setTimeout(() => {
    if (activeTab === 'pin') {
        pinInputRefs.current[0]?.focus();
      } else if (activeTab === 'password') {
        if (rememberedUserIdentifier) {
          passwordInputRef.current?.focus();
        } else {
          identifierInputRef.current?.focus();
        }
      }
    }, 150); // Increased delay slightly for smoother focus
    return () => clearTimeout(timer);
  }, [activeTab, rememberedUserIdentifier]);

  // Load saved credentials on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      if (authContext.loadCredentials) {
        const creds = await authContext.loadCredentials();
        if (creds && creds.email && creds.password) {
          setIdentifier(creds.email); // Pre-fill identifier state from SecureStore
          setPassword(creds.password); // Pre-fill password state from SecureStore
          setRememberedUserIdentifier(creds.email); // Set the remembered identifier for display
          setActiveTab('password');
        } else {
          // If no saved creds, dev pre-fill (if __DEV__) will remain, or fields will be empty
          setRememberedUserIdentifier(null);
        }
      }
    };
    loadSavedCredentials();
  }, [authContext.loadCredentials]);

  // Load last used identifier on mount (Instagram/Revolut pattern)
  // This keeps the identifier field populated even after logout
  useEffect(() => {
    const loadLastIdentifier = async () => {
      try {
        const saved = await SecureStore.getItemAsync(LAST_IDENTIFIER_KEY);
        if (saved && !identifier) {
          logger.debug('Loaded last identifier from SecureStore', 'auth');
          setIdentifier(saved);
        }
      } catch (error) {
        logger.warn('Could not load saved identifier', 'auth');
      }
    };
    loadLastIdentifier();
  }, []);

  // Load stored PIN user on screen focus (Instagram-style multi-profile)
  // Using useFocusEffect so PIN data reloads when returning from profile switch
  useFocusEffect(
    React.useCallback(() => {
      const loadPinUser = async () => {
        try {
          const targetId = isProfileSwitchMode ? targetProfileId : undefined;

          // PROFILE SWITCH MODE: Use passed identifier (captured while still logged in)
          // Each team member uses THEIR OWN personal credentials to access business
          // Same pattern as Stripe, Revolut, Square
          if (isProfileSwitchMode && targetId) {
            // Use sourceIdentifier passed from profile.tsx (JWT is cleared during switch)
            const jwtIdentifier = sourceIdentifier || tokenManager.getAuthUserIdentifier();
            logger.debug('Profile switch mode - using identifier', 'auth', {
              hasJwtIdentifier: !!jwtIdentifier,
              fromSourceParam: !!sourceIdentifier,
              targetProfileId: targetId,
            });

            if (jwtIdentifier) {
              setPinUserIdentifier(jwtIdentifier);
              setHasPinUser(true);
              setActiveTab('pin');

              // Load profile data for display (avatar, business name)
              const profileData = await getProfilePinData(targetId);
              if (profileData) {
                setPinUserData(profileData);
              }
              return; // Exit early - JWT identifier is authoritative
            }
          }

          // NORMAL LOGIN: Use stored profile data
          const profileData = await getProfilePinData(targetId);

          logger.debug('Loading PIN data', 'auth', {
            isProfileSwitchMode,
            targetProfileId: targetId,
            foundData: !!profileData
          });

          if (profileData) {
            setPinUserData(profileData);
            setPinUserIdentifier(profileData.identifier);
            setHasPinUser(true);
            setActiveTab('pin'); // Stay on PIN tab if user found
            logger.debug('Found stored profile PIN data', 'auth', {
              profileType: profileData.profileType,
              hasUsername: !!profileData.username,
              hasBusinessName: !!profileData.businessName,
              hasIdentifier: !!profileData.identifier,
              displayName: profileData.displayName,
            });
          } else {
            // Fallback to legacy storage
            const storedPinUser = await authContext.getLastUserForPin();
            const hasStored = await authContext.hasPinUserStored();

            if (storedPinUser && hasStored) {
              setPinUserIdentifier(storedPinUser);
              setHasPinUser(true);
              setActiveTab('pin');
              logger.debug('Found legacy stored PIN user', 'auth');
            } else {
              setPinUserIdentifier(null);
              setPinUserData(null);
              setHasPinUser(false);
              setActiveTab('password');
              logger.debug('No stored PIN user found', 'auth');
            }
          }
        } catch (error) {
          logger.error('Error loading stored PIN user', error, 'auth');
          setPinUserIdentifier(null);
          setPinUserData(null);
          setHasPinUser(false);
          setActiveTab('password');
        }
      };

      loadPinUser();
    }, [isProfileSwitchMode, targetProfileId, sourceIdentifier]) // Re-run when profile switch mode/target/identifier changes
  );

  const getInitials = (nameOrEmail?: string | null) => {
    if (!nameOrEmail) return "UA"; // Unknown Account / User Account
    if (nameOrEmail.includes('@')) {
      const firstLetter = nameOrEmail.charAt(0).toUpperCase();
      return firstLetter;
    }
    const parts = nameOrEmail.split(' ');
    if (parts.length > 1) {
      return parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
    }
    return nameOrEmail.substring(0, 2).toUpperCase();
  };

  const renderBiometricIcon = () => {
    if (supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return <Ionicons name="scan-circle-outline" size={32} color={theme.colors.textSecondary} />;
    }
    if (supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return <Ionicons name="finger-print-outline" size={32} color={theme.colors.textSecondary} />;
    }
    if (supportedBiometrics.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return <Ionicons name="eye-outline" size={32} color={theme.colors.textSecondary} />;
    }
    return <Ionicons name="lock-closed-outline" size={32} color={theme.colors.textSecondary} />;
  };

  const getBiometricLabel = () => {
    if (supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID';
    }
    if (supportedBiometrics.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    return 'Biometric';
  };

  const getBiometricPromptText = () => {
    if (supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Or use Face ID authentication';
    }
    if (supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Or use Touch ID authentication';
    }
    if (supportedBiometrics.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Or use iris authentication';
    }
    return 'Or use biometric authentication';
  };

  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md },
    header: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.md, alignItems: "center" },
    title: { fontSize: theme.typography.fontSize.xxl, fontWeight: '700' as const, marginBottom: theme.spacing.xs, color: theme.colors.textPrimary },
    subtitle: { fontSize: theme.typography.fontSize.md, color: theme.colors.textSecondary },
    accountInfo: { flexDirection: "row", alignItems: "center", padding: theme.spacing.md, backgroundColor: theme.colors.primaryUltraLight, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.secondary, justifyContent: "center", alignItems: "center", marginRight: theme.spacing.md },
    avatarText: { fontSize: theme.typography.fontSize.xxl, fontWeight: '600' as const, color: theme.colors.white },
    userDetails: { flex: 1 },
    userName: { fontSize: theme.typography.fontSize.lg, fontWeight: '500' as const, color: theme.colors.textPrimary },
    userPhone: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary },
    tabContainer: { flexDirection: "row", marginBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    tab: { flex: 1, paddingVertical: theme.spacing.md, alignItems: "center" },
    activeTab: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
    tabText: { fontSize: theme.typography.fontSize.md, fontWeight: '500' as const, color: theme.colors.textSecondary },
    activeTabText: { color: theme.colors.primary },
    pinTabContent: { marginBottom: theme.spacing.lg },
    passwordTabContent: { marginBottom: theme.spacing.md },
    pinContainer: { flexDirection: "row", justifyContent: "center", marginBottom: theme.spacing.md },
    pinInput: { width: 45, height: 45, borderWidth: 1, borderColor: theme.colors.inputBorder, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.card, textAlign: "center", fontSize: theme.typography.fontSize.lg, marginHorizontal: theme.spacing.xs, color: theme.colors.inputText },
    identifierInput: { ...theme.commonStyles.input, marginBottom: theme.spacing.sm, height: 50 },
    passwordInput: { ...theme.commonStyles.input, marginBottom: theme.spacing.sm, height: 50 },
    rememberMeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md, justifyContent: 'space-between' },
    rememberMeText: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginRight: theme.spacing.sm },
    forgotText: { textAlign: "center", color: theme.colors.primary, fontSize: theme.typography.fontSize.sm, fontWeight: '500' as const, marginTop: theme.spacing.xs },
    biometricContainer: { alignItems: "center", marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
    biometricText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
    biometricButton: { width: 50, height: 50, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card, justifyContent: "center", alignItems: "center", marginBottom: theme.spacing.xs },
    biometricLabel: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary },
    signInButton: { ...theme.commonStyles.primaryButton, height: 50, marginBottom: theme.spacing.md },
    signInButtonText: { ...theme.commonStyles.primaryButtonText } as any,
    otherAccountText: { textAlign: "center", color: theme.colors.primary, fontSize: theme.typography.fontSize.sm, fontWeight: '500' as const },
    signUpContainer: { marginTop: theme.spacing.md, alignItems: 'center' },
    signUpText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
    signUpLink: { textAlign: "center", color: theme.colors.primary, fontSize: theme.typography.fontSize.md, fontWeight: '600' as const },
    inputContainer: { marginBottom: theme.spacing.md },
    label: { fontSize: theme.typography.fontSize.md, fontWeight: '500' as const, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
    input: { ...theme.commonStyles.input, height: 50 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background}/>
      <ScrollView 
        style={{flex: 1}} 
        contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isProfileSwitchMode
                ? `Switch to ${targetProfileType === 'business' ? 'Business' : 'Account'}`
                : 'Welcome back'}
            </Text>
            <Text style={styles.subtitle}>
              {isProfileSwitchMode
                ? `Enter PIN for ${pinUserData?.username ? `@${pinUserData.username}` : 'your account'}`
                : 'Sign in to your account'}
            </Text>
          </View>
          
          {/* No top account card needed for password tab */}
          
          {/* Authentication Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'pin' && styles.activeTab]}
              onPress={() => setActiveTab('pin')}
            >
              <Text style={[styles.tabText, activeTab === 'pin' && styles.activeTabText]}>
                PIN Code
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'password' && styles.activeTab]}
              onPress={() => setActiveTab('password')}
            >
              <Text style={[styles.tabText, activeTab === 'password' && styles.activeTabText]}>
                Password
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* PIN Tab Content */}
          {activeTab === 'pin' && (
            <View style={styles.pinTabContent}>
              {/* Profile Switch Mode: Show TARGET profile (business) */}
              {isProfileSwitchMode && targetDisplayName && (
                <View style={styles.accountInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(targetDisplayName)}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                      {targetDisplayName}
                    </Text>
                    <Text style={styles.userPhone}>
                      {targetProfileType === 'business' ? 'Business Account' : 'Personal Account'}
                    </Text>
                    {/* "via @username" indicator for profile switch - always show context */}
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, opacity: 0.8 }}>
                      {sourceUsername ? `via @${sourceUsername}` : 'via your personal account'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Normal Login Mode: Show stored PIN user (Instagram-style display) */}
              {!isProfileSwitchMode && hasPinUser && pinUserIdentifier && (
                <View style={styles.accountInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(
                        pinUserData
                          ? (pinUserData.profileType === 'personal'
                              ? pinUserData.username || pinUserData.displayName
                              : pinUserData.businessName || pinUserData.displayName)
                          : pinUserIdentifier
                      )}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    {/* Display @username for personal, businessName for business */}
                    <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                      {pinUserData
                        ? getProfileDisplayName(pinUserData)
                        : pinUserIdentifier}
                    </Text>
                    <Text style={styles.userPhone}>
                      {pinUserData?.profileType === 'business'
                        ? 'Business Account'
                        : 'Personal Account'}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Show subtle message if no PIN user is stored */}
              {!hasPinUser && (
                <View style={{ 
                  alignItems: 'center', 
                  marginBottom: theme.spacing.lg, 
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  backgroundColor: theme.colors.primaryUltraLight,
                  borderRadius: theme.borderRadius.sm,
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary
                }}>
                  <Text style={{ 
                    fontSize: theme.typography.fontSize.sm, 
                    color: theme.colors.textSecondary,
                    textAlign: 'center',
                    marginBottom: 4
                  }}>
                    No PIN set up yet
                  </Text>
                  <Text style={{ 
                    fontSize: theme.typography.fontSize.xs, 
                    color: theme.colors.textSecondary,
                    textAlign: 'center',
                    opacity: 0.8
                  }}>
                    Use the Password tab to sign in first
                  </Text>
                </View>
              )}
              
              <View style={styles.pinContainer}>
                {pin.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(input) => (pinInputRefs.current[index] = input)}
                    style={[
                      styles.pinInput,
                      !hasPinUser && { opacity: 0.5 } // Dim PIN inputs if no user
                    ]}
                    value={digit}
                    onChangeText={(text) => handlePinChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    secureTextEntry
                    selectTextOnFocus
                    editable={hasPinUser} // Disable if no PIN user
                  />
                ))}
              </View>
              
              <TouchableOpacity onPress={handleForgotPin}>
                <Text style={styles.forgotText}>Forgot PIN?</Text>
              </TouchableOpacity>
              
              {/* Use Different Account button for PIN */}
              {hasPinUser && (
                <TouchableOpacity onPress={handleUseDifferentAccountForPin} style={{ marginTop: theme.spacing.md }}>
                  <Text style={styles.otherAccountText}>Use Different Account</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Password Tab Content */}
          {activeTab === 'password' && (
            <View style={styles.passwordTabContent}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone, Username or Email</Text>
                <TextInput
                  ref={identifierInputRef} // Assign ref
                  style={styles.input}
                  placeholder="Enter email, username or phone number"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={rememberedUserIdentifier || identifier}
                  onChangeText={(text) => setIdentifier(text)}
                  testID="email-input"
                />
              </View>
              <TextInput
                ref={passwordInputRef} // Assign ref
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Biometric Option - Only show if biometrics are available */}
          {isBiometricAvailable && (
          <View style={styles.biometricContainer}>
              <Text style={styles.biometricText}>{getBiometricPromptText()}</Text>
            <TouchableOpacity 
              style={styles.biometricButton}
              onPress={handleBiometricAuth}
            >
                {renderBiometricIcon()}
            </TouchableOpacity>
              <Text style={styles.biometricLabel}>{getBiometricLabel()}</Text>
          </View>
          )}
          
          {/* Sign In Button */}
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.signInButtonText}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={rememberedUserIdentifier ? handleUseOtherAccount : handleSignUp}>
            <Text style={styles.otherAccountText}>
              {rememberedUserIdentifier ? "Sign in with a different account" : "Create a new account"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignInScreen; 