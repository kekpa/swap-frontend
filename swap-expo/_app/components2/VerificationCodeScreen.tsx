// Updated: Refactored to single adaptive VerificationCodeScreen for phone and email verification - 2025-01-26
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./../theme/ThemeContext";
import apiClient from "./../_api/apiClient";
import { API_PATHS } from "./../_api/apiPaths";
import { useAuthContext } from "./../features/auth/context/AuthContext";
import defaultTheme from "./../theme/theme";
import { saveAccessToken, saveRefreshToken } from "./../utils/tokenStorage";

// Define type for route and navigation - now supports both phone and email
type AuthStackParamList = {
  PhoneEntry: undefined;
  VerificationCode: {
    type: 'phone' | 'email';
    contact: string; // phone number or email
    channel?: 'sms' | 'whatsapp'; // only for phone verification
    returnToTimeline?: boolean; // for KYC flows
    sourceRoute?: string; // for KYC flows
    accountType?: 'personal' | 'business'; // for business registration support
  };
  CompleteProfile: { accountType?: 'personal' | 'business' };
  EmailVerification: { email: string };
  ResetPassword: { email: string }; // for forgot password flow
  VerifyYourIdentity: { sourceRoute?: string }; // for KYC flows
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;
type RouteProps = RouteProp<AuthStackParamList, 'VerificationCode'>;

const VerificationCodeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const {
    type,
    contact,
    channel,
    returnToTimeline,
    sourceRoute,
    accountType
  } = route.params;
  
  const themeContext = useTheme();
  const theme = themeContext?.theme || defaultTheme;
  const authContext = useAuthContext();
  
  // State for verification code digits - always 6 digits
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendTime, setResendTime] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpStatus, setOtpStatus] = useState<'sending' | 'sent' | 'error' | null>(null);
  
  // Check if code is complete - always 6 digits
  const isCodeComplete = code.every(digit => digit !== "");
  
  // Determine if this is a KYC flow
  const isKycFlow = returnToTimeline === true;
  
  // Wait for theme to be properly initialized before rendering
  if (!theme || !theme.colors) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#8b14fd" />
      </SafeAreaView>
    );
  }
  
  // Refs for TextInputs to allow auto-advancing
  const inputRefs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  // Set initial OTP status to 'sending' on first render
  useEffect(() => {
    setOtpStatus('sending');
    // After 3 seconds, change to 'sent' to simulate actual message delivery
    const timer = setTimeout(() => {
      setOtpStatus('sent');
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Timer for resend code countdown
  useEffect(() => {
    if (resendTime > 0) {
      const timer = setTimeout(() => {
        setResendTime(resendTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTime]);

  // Handle input change for verification code
  const handleCodeChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste of entire code
      const pastedCode = text.slice(0, 6).split("");
      const newCode = [...code];
      
      pastedCode.forEach((digit, idx) => {
        if (idx < 6) {
          newCode[idx] = digit;
        }
      });
      
      setCode(newCode);
      
      // Focus last input or submit if all filled
      if (pastedCode.length === 6) {
        inputRefs.current[5]?.blur();
        // Auto-submit if full code is pasted
        if (!newCode.includes("")) {
          setTimeout(() => handleVerify(newCode.join("")), 300);
        }
      } else {
        const nextIndex = Math.min(index + pastedCode.length, 5);
        inputRefs.current[nextIndex]?.focus();
      }
    } else {
      // Handle single digit input
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);
      
      // Auto-advance to next input
      if (text !== "" && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
      
      // Auto-submit if last digit entered
      if (text !== "" && index === 5) {
        const fullCode = [...newCode].join("");
        if (fullCode.length === 6) {
          setTimeout(() => handleVerify(fullCode), 300);
        }
      }
    }
  };

  // Handle backspace key press
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && code[index] === "" && index > 0) {
      // Move to previous input when backspace is pressed on an empty input
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendCode = async () => {
    if (canResend && !isResending) {
      setIsResending(true);
      setOtpStatus('sending');
      
      try {
        if (type === 'phone') {
          // Resend phone verification code
        const response = await apiClient.post(API_PATHS.AUTH.PHONE_SIGNIN, {
            phone: contact,
            channel: channel?.toLowerCase() === 'whatsapp' ? 'whatsapp' : 'sms'
          });
          console.log("Phone OTP resent successfully:", response.data);
        } else {
          // Resend email verification code
          const response = await apiClient.post(API_PATHS.AUTH.RESEND_EMAIL_CODE, {
            email: contact
        });
          console.log("Email OTP resent successfully:", response.data);
        }
        
        setOtpStatus('sent');
        setResendTime(45);
        setCanResend(false);
        
        const contactType = type === 'phone' ? 'phone number' : 'email';
        const channelText = type === 'phone' ? ` via ${channel || 'SMS'}` : '';
        
        Alert.alert(
          "Code Resent", 
          `A new verification code has been sent to your ${contactType}${channelText}.`
        );
        
      } catch (error) {
        console.error(`Error resending ${type} OTP:`, error);
        setOtpStatus('error');
        Alert.alert(
          "Error", 
          "Failed to resend verification code. Please try again."
        );
      } finally {
        setIsResending(false);
      }
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const verificationCode = fullCode || code.join("");
    
    if (verificationCode.length !== 6) {
      Alert.alert("Error", "Please enter the complete 6-digit verification code");
      return;
    }
    
    setIsVerifying(true);
    
    try {
      if (type === 'phone') {
        await handlePhoneVerification(verificationCode);
      } else {
        await handleEmailVerification(verificationCode);
      }
    } catch (error) {
      console.error(`${type} verification error:`, error);
      Alert.alert(
        "Verification Failed", 
        "The code you entered is incorrect or has expired. Please try again or request a new code."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePhoneVerification = async (verificationCode: string) => {
    if (isKycFlow) {
      // KYC phone verification - call the new dedicated endpoint
      await apiClient.post(API_PATHS.KYC.VERIFY_PHONE, {
        phone: contact,
        code: verificationCode,
        channel: channel?.toLowerCase() || 'sms',
      });
      console.log("KYC Phone verification successful");
      // Navigate back to the timeline, which will refetch the status
      navigation.navigate('VerifyYourIdentity', { sourceRoute });
    } else {
      // Phone registration - create new user account with phone + OTP + password
      // TODO: Add password input field to collect user password during registration
      const tempPassword = "TempPass123!"; // TEMPORARY - should be collected from user

      // Choose registration endpoint based on account type
      let response;
      if (accountType === 'business') {
        console.log("Creating business profile via phone registration");
        // TODO: Backend needs to support phone-based business registration
        // For now, pass accountType to help backend identify business registration intent
        response = await apiClient.post(API_PATHS.AUTH.REGISTER_PHONE, {
          phone: contact,
          code: verificationCode,
          password: tempPassword,
          accountType: 'business'
        });
        console.log("Business phone registration successful:", response.data);
      } else {
        // Personal registration (existing flow)
        response = await apiClient.post(API_PATHS.AUTH.REGISTER_PHONE, {
          phone: contact,
          code: verificationCode,
          password: tempPassword
        });
        console.log("Personal phone registration successful:", response.data);
      }
      
      const authData = response.data.data || response.data;
      
      if (authData.access_token && authContext) {
        await saveAccessToken(authData.access_token);
        await saveRefreshToken(authData.refresh_token);
        
        authContext.setPhoneVerified({
          phoneNumber: contact,
          accessToken: authData.access_token,
          profileId: authData.profile_id || null
        });
        
        if (authData.profile_id) {
          apiClient.setProfileId(authData.profile_id);
        }
        
        if (authData.is_new_user) {
          navigation.navigate("CompleteProfile", { accountType });
        } else {
          const hasRequiredFields = authData.has_required_fields || false;

          if (hasRequiredFields) {
            authContext.setIsAuthenticated(true);
            await authContext.checkSession();
          } else {
            navigation.navigate("CompleteProfile", { accountType });
          }
        }
      }
    }
  };

  const handleEmailVerification = async (verificationCode: string) => {
    // For email verification, check if it's KYC or forgot password flow
    if (isKycFlow) {
      // KYC email verification
      const response = await apiClient.post(API_PATHS.AUTH.VERIFY_EMAIL, {
        email: contact,
        code: verificationCode
      });
      console.log("Email verification successful for KYC:", response.data);
      navigation.navigate('VerifyYourIdentity', { sourceRoute });
    } else {
      // Forgot password email verification
      const response = await apiClient.post(API_PATHS.AUTH.VERIFY_RESET_CODE, {
        email: contact,
        code: verificationCode
      });
      console.log("Password reset code verified:", response.data);
      navigation.navigate("ResetPassword", { email: contact });
    }
  };

  const goBack = () => {
    if (isKycFlow) {
      navigation.navigate('VerifyYourIdentity', { sourceRoute });
    } else {
    navigation.goBack();
    }
  };

  // Get appropriate title and subtitle based on verification type
  const getTitle = () => {
    return type === 'phone' ? 'Verify Phone Number' : 'Verify Email Address';
  };

  const getSubtitle = () => {
    if (type === 'phone') {
      return `We've sent a verification code to ${contact} via ${channel || 'SMS'}`;
    } else {
      return `We've sent a 6-digit verification code to ${contact}`;
    }
  };

  // Render OTP status message
  const renderOtpStatusMessage = () => {
    if (otpStatus === 'sending') {
      return (
        <View style={styles.otpStatusContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.otpStatusIcon} />
          <Text style={[styles.otpStatusText, { color: theme.colors.textSecondary }]}>
            Sending verification code...
          </Text>
        </View>
      );
    } else if (otpStatus === 'sent') {
      return (
        <View style={styles.otpStatusContainer}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.otpStatusIcon} />
          <Text style={[styles.otpStatusText, { color: theme.colors.textSecondary }]}>
            Verification code sent
          </Text>
        </View>
      );
    } else if (otpStatus === 'error') {
      return (
        <View style={styles.otpStatusContainer}>
          <Ionicons name="alert-circle" size={16} color="#F44336" style={styles.otpStatusIcon} />
          <Text style={[styles.otpStatusText, { color: "#F44336" }]}>
            Failed to send code. Try resending.
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Header with back button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{getTitle()}</Text>
        </View>
        
        <View style={styles.subtitleContainer}>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {getSubtitle()}
          </Text>
          
          {/* OTP Status Message */}
          {renderOtpStatusMessage()}
          
          {/* Delayed OTP Message */}
          {otpStatus === 'sent' && (
            <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
              It may take a moment for the code to arrive. If you don't receive it, you can try resending.
            </Text>
          )}
        </View>
        
        {/* Code Input Section - Always 6 digits */}
        <View style={styles.codeInputContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(input) => (inputRefs.current[index] = input)}
              style={[
                styles.codeInput, 
                { 
                  backgroundColor: theme.colors.inputBackground, 
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary
                }
              ]}
              keyboardType="number-pad"
              maxLength={6} // Allow paste of full code
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              autoFocus={index === 0}
            />
          ))}
        </View>
        
        {/* Verification Button */}
        <TouchableOpacity 
          style={[
            styles.verifyButton, 
            { 
              backgroundColor: isCodeComplete 
                ? (isVerifying ? theme.colors.primaryLight : theme.colors.primary)
                : theme.colors.primaryLight + '80', // 50% opacity for disabled state
              opacity: isVerifying ? 0.8 : 1
            }
          ]} 
          onPress={() => handleVerify()}
          disabled={isVerifying || !isCodeComplete}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
        
        {/* Resend Code Section */}
        <View style={styles.resendContainer}>
          <Text style={[styles.resendText, { color: theme.colors.textSecondary }]}>
            Didn't receive the code?
          </Text>
          
          {canResend ? (
            <TouchableOpacity 
              onPress={handleResendCode}
              disabled={isResending}
              style={styles.resendButton}
            >
              {isResending ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={[styles.resendButtonText, { color: theme.colors.primary }]}>
                  Resend Code
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={[styles.timerText, { color: theme.colors.textSecondary }]}>
              Resend in {resendTime}s
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// Add styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
    marginRight: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitleContainer: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  helpText: {
    fontSize: 14,
    marginTop: 12,
    fontStyle: 'italic',
  },
  codeInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  codeInput: {
    width: 45,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
  },
  verifyButton: {
    height: 54,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    marginRight: 8,
  },
  resendButton: {
    padding: 8,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  otpStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  otpStatusIcon: {
    marginRight: 8,
  },
  otpStatusText: {
    fontSize: 14,
  },
});

export default VerificationCodeScreen; 