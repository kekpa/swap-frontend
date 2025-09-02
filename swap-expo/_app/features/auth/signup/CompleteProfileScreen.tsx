// Updated: Added username field and removed email field - 2025-05-31
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "../context/AuthContext";
import apiClient from "../../../_api/apiClient";
import { API_PATHS } from "../../../_api/apiPaths";
import { useTheme } from "../../../theme/ThemeContext";
import defaultTheme from "../../../theme/theme";

// Define type for navigation
type AuthStackParamList = {
  PhoneEntry: undefined;
  VerificationCode: { phoneNumber: string };
  CompleteProfile: undefined;
  EmailVerification: { email: string };
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;
type RouteProps = RouteProp<AuthStackParamList, 'CompleteProfile'>;

const CompleteProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const authContext = useAuthContext();
  const themeContext = useTheme();
  
  // Use a default theme if the theme context isn't ready yet
  const theme = themeContext?.theme || defaultTheme;
  
  const isFromPhoneVerification = !!authContext.phoneVerification;
  
  useEffect(() => {
    // Log whether phone verification data is available for debugging
    console.log("CompleteProfileScreen - Phone verification data available:", !!authContext.phoneVerification);
    if (authContext.phoneVerification) {
      console.log("CompleteProfileScreen - Phone number from verification:", authContext.phoneVerification.phoneNumber);
    }
  }, [authContext.phoneVerification]);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form is complete to enable/disable button
  const isFormComplete = firstName.trim() !== "" && 
                        lastName.trim() !== "" && 
                        username.trim() !== "" &&
                        password.length >= 8 && 
                        agreeToTerms;

  const goBack = () => {
    navigation.goBack();
  };

  const handleContinue = async () => {
    // Basic form validation
    if (!firstName.trim()) {
      Alert.alert("Error", "Please enter your first name");
      return;
    }
    
    if (!lastName.trim()) {
      Alert.alert("Error", "Please enter your last name");
      return;
    }
    
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }
    
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }
    
    if (!agreeToTerms) {
      Alert.alert("Error", "You must agree to the terms and conditions");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isFromPhoneVerification && authContext.phoneVerification) {
        console.log("CompleteProfileScreen - Submitting profile with phone verification:", authContext.phoneVerification);
        // Phone-based signup flow - complete profile after phone verification
        const { phoneNumber, accessToken, profileId } = authContext.phoneVerification;
        
        // Step 1: Update the profile with name, username, and password
        const profileData = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim(),
          password: password,
        };
        
        console.log('🚀 Sending profile data:', {
          profileId,
          data: { ...profileData, password: '[REDACTED]' },
          url: `${API_PATHS.AUTH.COMPLETE_PROFILE}/${profileId}`
        });
        
        const response = await apiClient.put(`${API_PATHS.AUTH.COMPLETE_PROFILE}/${profileId}`, profileData, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        console.log("CompleteProfileScreen - Profile update response:", response.data);
        
        if (response.data) {
          console.log("CompleteProfileScreen - Password included in profile completion for login support");
          
          // Profile updated successfully, set authenticated
          authContext.setIsAuthenticated(true);
          
          // Update user data in context
          if (profileId) {
            apiClient.setProfileId(profileId);
          }
          
          // Redirect to main app (handled by AuthContext)
          await authContext.checkSession();
        } else {
          throw new Error("Failed to update profile");
        }
      } else {
        // Email-based signup flow - this path should not be hit in phone verification flow
        Alert.alert("Error", "Invalid signup flow detected");
      }
    } catch (error: any) {
      console.error("Profile completion error:", error);
      
      // More specific error handling
      let errorMessage = "Failed to complete your profile. Please try again.";
      
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        if (backendErrors.some((e: any) => e.message?.includes('username'))) {
          errorMessage = "Username is already taken. Please choose a different username.";
        } else if (backendErrors.some((e: any) => e.message?.includes('password'))) {
          errorMessage = "Password doesn't meet requirements. Please try a stronger password.";
        } else {
          errorMessage = backendErrors[0]?.message || errorMessage;
        }
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTermsAgreement = () => {
    setAgreeToTerms(!agreeToTerms);
  };

  // Wait for theme to be properly initialized before rendering
  if (!theme || !theme.colors) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#8b14fd" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidContainer}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header with Back Button */}
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Complete Profile</Text>
          </View>
          
          <View style={styles.subtitleContainer}>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {isFromPhoneVerification ? 
                "Almost there! Let's finish setting up your account" : 
                "We need a few more details to set up your account"}
            </Text>
            
            {isFromPhoneVerification && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.verifiedText}>Phone Verified</Text>
              </View>
            )}
          </View>
          
          {/* Form Fields */}
          <View style={styles.formContainer}>
            <View style={styles.formField}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>First Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.inputBackground, 
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary
                }]}
                placeholder="Enter your first name"
                placeholderTextColor={theme.colors.textSecondary}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            
            <View style={styles.formField}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Last Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.inputBackground, 
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary
                }]}
                placeholder="Enter your last name"
                placeholderTextColor={theme.colors.textSecondary}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
            
            <View style={styles.formField}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Username</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.inputBackground, 
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary
                }]}
                placeholder="Choose a username"
                placeholderTextColor={theme.colors.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.formField}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Password</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.inputBackground, 
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary
                }]}
                placeholder="Create a secure password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>
          
          {/* Terms Agreement */}
          <TouchableOpacity 
            style={styles.termsContainer}
            onPress={toggleTermsAgreement}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, { 
              borderColor: theme.colors.border,
              backgroundColor: agreeToTerms ? theme.colors.primary + '20' : 'transparent'
            }]}>
              {agreeToTerms && <Ionicons name="checkmark" size={16} color={theme.colors.primary} />}
            </View>
            <Text style={[styles.termsText, { color: theme.colors.textPrimary }]}>
              I agree to the{" "}
              <Text style={[styles.termsLink, { color: theme.colors.primary }]}>Terms of Service</Text> and{" "}
              <Text style={[styles.termsLink, { color: theme.colors.primary }]}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          
          {/* Continue Button */}
          <TouchableOpacity 
            style={[styles.continueButton, { 
              backgroundColor: isFormComplete 
                ? (isSubmitting ? theme.colors.primaryLight : theme.colors.primary)
                : theme.colors.primaryLight + '80', // 50% opacity for disabled state
              opacity: isSubmitting ? 0.8 : 1
            }]}
            onPress={handleContinue}
            disabled={isSubmitting || !isFormComplete}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>
                {isFromPhoneVerification ? "Complete Setup" : "Continue"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
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
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  verifiedText: {
    marginLeft: 5,
    color: '#4CAF50',
    fontWeight: '500',
  },
  formContainer: {
    marginBottom: 24,
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  termsText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    fontWeight: "500",
  },
  continueButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CompleteProfileScreen; 