// Updated: Removed Personal/Business account type toggle - users can login with any credentials and system finds account type automatically - 2025-01-27
// Created: Added SignInScreen component for login flow - 2024-07-30
// Updated: Refactored to use global theme system - YYYY-MM-DD
// Updated: Integrated with AuthContext for real login, added Remember Me, and credential loading - 2024-07-31
// Updated: Implemented UX for remembered accounts (pre-fill, display, switch account) - 2024-07-31
// Updated: Pre-fill email/password for DEV builds for faster testing - 2024-07-31
// Updated: Added Sign Up navigation link - 2025-05-30
// Updated: Changed PIN login from 4-digit to 6-digit passcode for consistency with KYC flow - 2025-06-07
import React, { useState, useRef, useEffect, useMemo } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthContext } from "../context/AuthContext";
import { useTheme } from "../../../theme/ThemeContext";
import { Theme } from "../../../theme/theme";

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

const SignInScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const authContext = useAuthContext();
  const { theme } = useTheme();

  // Helper functions for biometric prompt tracking
  const shouldShowBiometricPrompt = async (): Promise<boolean> => {
    try {
      const hasShownPrompt = await AsyncStorage.getItem('biometric_prompt_shown');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const hasStoredCredentials = !!(await authContext.getBiometricCredentials());
      
      // Don't show if: already shown, no hardware, or already has biometric credentials stored
      return !hasShownPrompt && hasHardware && !hasStoredCredentials;
    } catch (error) {
      console.error('Error checking biometric prompt status:', error);
      return false;
    }
  };

  const markBiometricPromptShown = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem('biometric_prompt_shown', 'true');
    } catch (error) {
      console.error('Error marking biometric prompt as shown:', error);
    }
  };

  const [activeTab, setActiveTab] = useState<'pin' | 'password'>('pin'); // Start with PIN, will switch to password if no PIN user found
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [identifier, setIdentifier] = useState(__DEV__ ? "50935852381" : "");
  const [password, setPassword] = useState(__DEV__ ? "password" : "");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberedUserIdentifier, setRememberedUserIdentifier] = useState<string | null>(null); // For displaying remembered user
  const [pinUserIdentifier, setPinUserIdentifier] = useState<string | null>(null); // For PIN authentication
  const [hasPinUser, setHasPinUser] = useState<boolean>(false);
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
        console.log('[Biometrics] Device does not have biometric hardware.');
        return;
      }
      
      const savedBiometrics = await LocalAuthentication.isEnrolledAsync();
      if (!savedBiometrics) {
        console.log('[Biometrics] No biometrics are enrolled on this device.');
        return;
      }
      
      const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setSupportedBiometrics(supported);
      setIsBiometricAvailable(true);
      console.log('[Biometrics] Supported types:', supported.map(type => LocalAuthentication.AuthenticationType[type]).join(', '));
    })();
  }, []);
  
  // Handle input change for PIN
  const handlePinChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste of entire PIN
      const pastedPin = text.slice(0, 6).split("");
      const newPin = [...pin];
      
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
      const newPin = [...pin];
      newPin[index] = text;
      setPin(newPin);
      
      // Auto-advance to next input
      if (text !== "" && index < 5) {
        pinInputRefs.current[index + 1]?.focus();
      }
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
    navigation.navigate("ForgotPassword");
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
          console.log('Biometric login successful, RootNavigator will handle LoadingScreen');
          // RootNavigator automatically shows LoadingScreen when authenticated but data loading
        } else {
          Alert.alert(
            'Login Failed', 
            loginResult.message || 'Failed to sign in with biometric authentication. Please try using your password.'
          );
        }
      } else {
        // Biometric authentication failed or was cancelled
        console.log('Biometric authentication failed or cancelled:', result.error);
        Alert.alert(
          'Authentication Failed', 
          'Biometric authentication failed. Please try again or use your password.'
        );
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert(
        'Error', 
        'An error occurred during biometric authentication. Please try using your password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
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
        // Try personal login first, then business as fallback
        console.log('Trying personal login first...');
        let response = await authContext.login(identifierToLogin, password);
        let loginType = 'personal';
        
        // If personal login fails, try business as fallback
        if (!response?.success) {
          console.log('Personal login failed, trying business login as fallback...');
          response = await authContext.loginBusiness(identifierToLogin, password);
          loginType = 'business';
        }
          
        if (response && response.success) {
          console.log(`🚀 [SignInScreen] ${loginType} sign in successful, RootNavigator will handle LoadingScreen`);
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
          // Both personal and business login failed
          let errorMessage = "Invalid credentials. Please check your email/phone and password.";
          
          // Check if it's a "no profile found" error vs actual credential error
          if (response?.message?.includes('No personal profile found') || 
              response?.message?.includes('No business profile found')) {
            errorMessage = "No account found with these credentials. Please check your email/phone and password, or create a new account.";
          }
          
          Alert.alert("Login Failed", errorMessage);
        }
      } catch (error: any) {
        console.error('Login error:', error);
        let errorMessage = "Failed to sign in. Please try again.";
        
        // Handle specific error cases
        if (error.message?.includes('No personal profile found') || 
            error.message?.includes('No business profile found')) {
          errorMessage = "No account found with these credentials. Please check your email/phone and password, or create a new account.";
        } else if (error.message?.includes('Invalid credentials')) {
          errorMessage = "Invalid credentials. Please check your email/phone and password.";
        }
        
        Alert.alert("Login Error", errorMessage);
      }
    } else if (activeTab === 'pin') {
      const currentPin = pin.join("");
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
          console.log("PIN sign in successful, RootNavigator will handle LoadingScreen");
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

  // Load stored PIN user on mount
  useEffect(() => {
    const loadPinUser = async () => {
      try {
        const storedPinUser = await authContext.getLastUserForPin();
        const hasStored = await authContext.hasPinUserStored();
        
        if (storedPinUser && hasStored) {
          setPinUserIdentifier(storedPinUser);
          setHasPinUser(true);
          setActiveTab('pin'); // Stay on PIN tab if user found
          console.log('[PIN Auth] Found stored PIN user:', storedPinUser);
        } else {
          setPinUserIdentifier(null);
          setHasPinUser(false);
          setActiveTab('password'); // Switch to password tab if no PIN user
          console.log('[PIN Auth] No stored PIN user found');
        }
      } catch (error) {
        console.error('[PIN Auth] Error loading stored PIN user:', error);
        setPinUserIdentifier(null);
        setHasPinUser(false);
        setActiveTab('password'); // Switch to password tab on error
      }
    };
    
    loadPinUser();
  }, []); // Remove dependencies to prevent recursion

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
    pinInput: { width: 45, height: 45, borderWidth: 1, borderColor: theme.colors.inputBorder, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.inputBackground, textAlign: "center", fontSize: theme.typography.fontSize.lg, marginHorizontal: theme.spacing.xs, color: theme.colors.inputText },
    identifierInput: { ...theme.commonStyles.input, marginBottom: theme.spacing.sm, height: 50 },
    passwordInput: { ...theme.commonStyles.input, marginBottom: theme.spacing.sm, height: 50 },
    rememberMeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md, justifyContent: 'space-between' },
    rememberMeText: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginRight: theme.spacing.sm },
    forgotText: { textAlign: "center", color: theme.colors.primary, fontSize: theme.typography.fontSize.sm, fontWeight: '500' as const, marginTop: theme.spacing.xs },
    biometricContainer: { alignItems: "center", marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
    biometricText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
    biometricButton: { width: 50, height: 50, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground, justifyContent: "center", alignItems: "center", marginBottom: theme.spacing.xs },
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
      <StatusBar barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"} backgroundColor={theme.colors.background}/>
      <ScrollView 
        style={{flex: 1}} 
        contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to your account
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
              {/* Show stored PIN user if available */}
              {hasPinUser && pinUserIdentifier && (
                <View style={styles.accountInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(pinUserIdentifier)}</Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">{pinUserIdentifier}</Text>
                    <Text style={styles.userPhone}>Enter your 6-digit PIN</Text>
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