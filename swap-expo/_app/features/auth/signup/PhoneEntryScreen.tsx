// Updated: Added support for business registration flow with accountType parameter - 2025-01-27
// Created: Added dedicated PhoneEntryScreen with OTP channel selection - 2025-05-30
// Updated: Redesigned to match HomeAddress.tsx UI pattern with proper theme integration - 2025-01-26
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../../../_api/apiClient";
import { API_PATHS } from "../../../_api/apiPaths";
import { useTheme } from "../../../theme/ThemeContext";
import { Theme } from "../../../theme/theme";
import CountryCodePicker, { CountryCodePickerRef } from "../../../components/CountryCodePicker";
import { CountryCode } from "../../../constants/countryCodes";
import { normalizePhoneNumber, parseInternationalPhoneNumber, combinePhoneNumber } from "../../../utils/phoneUtils";

// Define type for navigation
type AuthStackParamList = {
  SignUpScreen: undefined;
  PhoneEntry: { 
    openCountryPicker?: boolean;
    returnToTimeline?: boolean;
    sourceRoute?: string;
    currentPhone?: string;
    accountType?: 'personal' | 'business';
  };
  VerificationCode: { 
    type: 'phone' | 'email';
    contact: string;
    channel?: 'sms' | 'whatsapp';
    returnToTimeline?: boolean;
    sourceRoute?: string;
    accountType?: 'personal' | 'business';
  };
  CompleteProfile: undefined;
  BusinessProfile: undefined;
  EmailVerification: { email: string };
  SignIn: undefined;
  VerifyYourIdentity: { sourceRoute?: string };
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;
type PhoneEntryRouteProp = RouteProp<AuthStackParamList, 'PhoneEntry'>;

// Define OTP channel types
type OtpChannel = 'sms' | 'whatsapp';

const PhoneEntryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PhoneEntryRouteProp>();
  const { theme } = useTheme();
  
  // Extract parameters including accountType
  const { 
    returnToTimeline, 
    sourceRoute, 
    currentPhone,
    openCountryPicker,
    accountType = 'personal'
  } = route.params || {};
  const isKycFlow = returnToTimeline === true;
  const isBusinessSignup = accountType === 'business';

  // Initialize state, prioritizing passed phone number
  const [phoneNumber, setPhoneNumber] = useState(() => {
    // If currentPhone is provided, parse it to extract local number
    if (currentPhone) {
      const parsed = parseInternationalPhoneNumber(currentPhone);
      return parsed ? parsed.localNumber : currentPhone;
    }
    return '';
  });
  
  const [countryCode, setCountryCode] = useState(() => {
    // If currentPhone is provided, parse it to extract country code
    if (currentPhone) {
      const parsed = parseInternationalPhoneNumber(currentPhone);
      return parsed ? parsed.countryCode : "+509";
    }
    return "+509";
  });
  const [otpChannel, setOtpChannel] = useState<OtpChannel>("whatsapp");
  const [isLoading, setIsLoading] = useState(false);
  const [existingUser, setExistingUser] = useState<{ username?: string; first_name?: string; last_name?: string } | null>(null);
  
  // Reference to country code picker to open it programmatically
  const countryPickerRef = useRef<CountryCodePickerRef>(null);
  
  // Auto-focus the phone input field on screen mount
  // And open country code picker if requested
  useEffect(() => {
    // Use a small delay to make sure the component is fully mounted
    if (openCountryPicker && countryPickerRef.current) {
      setTimeout(() => {
        if (countryPickerRef.current) {
          countryPickerRef.current.openModal();
        }
      }, 300);
    }
  }, [route.params]);
  
  const handleCountrySelect = (country: CountryCode) => {
    setCountryCode(country.code);
  };
  
  const handleGoBack = () => {
    if (isKycFlow) {
      // Navigate back to VerifyYourIdentity timeline in KYC flow
      navigation.navigate('VerifyYourIdentity', { sourceRoute });
    } else {
      // Normal signup flow
    navigation.goBack();
    }
  };

  const checkPhoneExists = async (formattedPhone: string) => {
    try {
      const response = await apiClient.post(API_PATHS.AUTH.CHECK_PHONE, {
        phone: formattedPhone
      });
      
      console.log("Phone check response:", response.data);
      
      let result = response.data;
      
      if (result.data) {
        result = result.data;
        
        if (typeof result === 'string') {
          try {
            result = JSON.parse(result);
          } catch (parseError) {
            console.error("Error parsing stringified response:", parseError);
            return { exists: false };
          }
        }
      }
      
      if (result.profile && typeof result.profile === 'string') {
        try {
          result.profile = JSON.parse(result.profile);
        } catch (parseError) {
          console.error("Error parsing stringified profile:", parseError);
        }
      }
      
      console.log("Parsed phone check result:", result);
      return result;
    } catch (error) {
      console.error("Error checking phone:", error);
      return { exists: false };
    }
  };

  const handleRedirectToLogin = () => {
    navigation.navigate("SignIn");
  };
  
  const handleContinue = async () => {
    if (phoneNumber.trim().length === 0) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }
    
    const normalizedNumber = normalizePhoneNumber(phoneNumber, countryCode);
    const formattedPhone = combinePhoneNumber(countryCode, normalizedNumber);
    setIsLoading(true);
    
    try {
      // Skip phone existence check for KYC flow
      if (!isKycFlow) {
        // First check if phone number already exists (signup flow only)
      const phoneCheckResult = await checkPhoneExists(formattedPhone);
      
      if (phoneCheckResult.exists) {
        setExistingUser(phoneCheckResult.profile);
        setIsLoading(false);
        
        Alert.alert(
          "Phone Number Already Registered",
          "This phone number is already associated with an existing account. Would you like to sign in instead, or use a different number to create a new account?",
          [
            {
              text: "Use Different Number",
              style: "cancel",
              onPress: () => {
                setExistingUser(null);
                setPhoneNumber("");
              }
            },
            {
              text: "Sign In",
              onPress: handleRedirectToLogin
            }
          ]
        );
        return;
        }
      }
      
      // Phone doesn't exist or KYC flow, proceed with OTP
      await proceedWithOTP(formattedPhone);
      
    } catch (error) {
      console.error("Error in handleContinue:", error);
      Alert.alert(
        "Error", 
        "Something went wrong. Please try again."
      );
      setIsLoading(false);
    }
  };

  const proceedWithOTP = async (formattedPhone: string) => {
    try {
      setIsLoading(true);
      
      // In KYC flow, we call a different endpoint to associate the phone with the current user
      if (isKycFlow) {
        await apiClient.post(API_PATHS.KYC.REQUEST_PHONE_CHANGE, {
          phone: formattedPhone,
        });
        console.log("KYC phone change requested successfully");
      } else {
        // Original signup flow - same for both personal and business at this stage
        await apiClient.post(API_PATHS.AUTH.PHONE_SIGNIN, {
        phone: formattedPhone,
          channel: otpChannel
      });
        console.log(`${isBusinessSignup ? 'Business' : 'Personal'} signup OTP requested successfully`);
      }
      
      // Navigate to verification screen with account type
      navigation.navigate("VerificationCode", { 
        type: 'phone',
        contact: formattedPhone,
        channel: otpChannel,
        returnToTimeline,
        sourceRoute,
        accountType
      });
    } catch (error) {
      console.error("Error requesting OTP:", error);
      Alert.alert(
        "Error", 
        "Failed to send verification code. Please check your phone number and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = phoneNumber.trim().length >= 8;

  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardAvoidingView: {
      flex: 1,
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
    formGroup: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    phoneContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    countryCodeContainer: {
      flex: 0.3,
    },
    phoneInputContainer: {
      flex: 0.7,
    },
    input: {
      width: '100%',
      height: 56,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.inputBackground,
    },
    channelContainer: {
      marginBottom: theme.spacing.md,
    },
    channelTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    channelOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.inputBackground,
      marginBottom: theme.spacing.sm,
    },
    channelOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryUltraLight,
    },
    channelContentWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    channelIcon: {
      marginRight: theme.spacing.sm,
    },
    channelText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
    },
    radioButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioButtonSelected: {
      borderColor: theme.colors.primary,
    },
    radioButtonInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    continueButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
    },
    disabledButton: {
      backgroundColor: theme.colors.border,
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
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
    businessNote: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.md,
    },
    businessNoteText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
  }), [theme]);

  // Update the title and subtitle based on account type
  const getScreenTitle = () => {
    if (isKycFlow) return 'Verify Phone';
    return isBusinessSignup ? 'Business Registration' : 'Phone Number';
  };

  const getMainTitle = () => {
    if (isKycFlow) return 'Verify your phone number';
    return isBusinessSignup ? 'Enter your phone number' : 'Enter your number';
  };

  const getSubtitle = () => {
    if (isKycFlow) return "We'll send a code to verify your phone number";
    return isBusinessSignup
      ? "We'll send a verification code to create your business admin account"
      : "We'll send a code for verification";
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
          <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {getScreenTitle()}
          </Text>
          <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.content}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>
              {getMainTitle()}
            </Text>
            <Text style={styles.subtitle}>
              {getSubtitle()}
            </Text>
            
            {/* Business info note */}
            {isBusinessSignup && !isKycFlow && (
              <View style={[styles.businessNote, { 
                backgroundColor: theme.colors.primaryUltraLight, 
                borderColor: theme.colors.primary 
              }]}>
                <Ionicons name="business-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.businessNoteText, { color: theme.colors.primary }]}>
                  You'll use this to manage your business account
                </Text>
              </View>
            )}
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneContainer}>
                <View style={styles.countryCodeContainer}>
                  <CountryCodePicker
                    ref={countryPickerRef}
                    selectedCountryCode={countryCode}
                    onSelect={handleCountrySelect}
                  />
                </View>
                <View style={styles.phoneInputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    autoFocus={!route.params?.openCountryPicker}
                  />
                </View>
                </View>
              </View>
              
              <View style={styles.channelContainer}>
              <Text style={styles.channelTitle}>Receive code via</Text>
                
                  <TouchableOpacity 
                    style={[
                  styles.channelOption,
                  otpChannel === 'whatsapp' && styles.channelOptionSelected
                    ]} 
                    onPress={() => setOtpChannel('whatsapp')}
                  >
                    <View style={styles.channelContentWrapper}>
                      <Ionicons 
                        name="logo-whatsapp" 
                        size={22} 
                        color="#25D366" 
                        style={styles.channelIcon}
                      />
                  <Text style={styles.channelText}>WhatsApp</Text>
                    </View>
                      <View style={[
                        styles.radioButton,
                  otpChannel === 'whatsapp' && styles.radioButtonSelected
                      ]}>
                        {otpChannel === 'whatsapp' && (
                    <View style={styles.radioButtonInner} />
                        )}
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                  styles.channelOption,
                  otpChannel === 'sms' && styles.channelOptionSelected
                    ]} 
                    onPress={() => setOtpChannel('sms')}
                  >
                    <View style={styles.channelContentWrapper}>
                      <Ionicons 
                        name="chatbubble-outline" 
                        size={22} 
                        color={theme.colors.textSecondary} 
                        style={styles.channelIcon}
                      />
                  <Text style={styles.channelText}>SMS</Text>
                    </View>
                      <View style={[
                        styles.radioButton,
                  otpChannel === 'sms' && styles.radioButtonSelected
                      ]}>
                        {otpChannel === 'sms' && (
                    <View style={styles.radioButtonInner} />
                        )}
                </View>
              </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
              style={[styles.continueButton, (!isFormValid || isLoading) && styles.disabledButton]}
                onPress={handleContinue}
              disabled={!isFormValid || isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.white} />
                  <Text style={styles.loadingText}>Sending...</Text>
                  </View>
                ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PhoneEntryScreen; 