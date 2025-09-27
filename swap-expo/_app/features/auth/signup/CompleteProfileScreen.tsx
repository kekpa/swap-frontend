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
import { useUsernameAvailability } from "../../../hooks/useUsernameAvailability";
import { usePasswordStrength } from "../../../hooks/usePasswordStrength";
import { PasswordStrengthMeter } from "../../../components/PasswordStrengthMeter";
import { sanitizeName, sanitizeUsername, sanitizeBusinessName, sanitizeRegistrationNumber } from "../../../utils/inputSanitization";

// Define type for navigation
type AuthStackParamList = {
  PhoneEntry: undefined;
  VerificationCode: { phoneNumber: string };
  CompleteProfile: { accountType?: 'personal' | 'business' };
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
  
  // Get account type from route params or default to personal
  const { accountType = 'personal' } = route.params || {};
  const isBusinessAccount = accountType === 'business';
  const isFromPhoneVerification = !!authContext.phoneVerification;

  useEffect(() => {
    // Log whether phone verification data is available for debugging
    console.log("CompleteProfileScreen - Phone verification data available:", !!authContext.phoneVerification);
    console.log("CompleteProfileScreen - Account type:", accountType);
    if (authContext.phoneVerification) {
      console.log("CompleteProfileScreen - Phone number from verification:", authContext.phoneVerification.phoneNumber);
    }
  }, [authContext.phoneVerification, accountType]);

  // Personal form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Business form state
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<string>("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [employeeCount, setEmployeeCount] = useState<string>("");

  // Common form state
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stage tracking for business flow
  // Stage 1: Personal admin info (first, last, username, password)
  // Stage 2: Business details (business name, type, registration, employees)
  const [businessStage, setBusinessStage] = useState<1 | 2>(1);

  // Dropdown states
  const [businessTypeDropdownVisible, setBusinessTypeDropdownVisible] = useState(false);
  const [employeeCountDropdownVisible, setEmployeeCountDropdownVisible] = useState(false);

  // Username availability checking
  const usernameAvailability = useUsernameAvailability(username, 500);

  // Debug logging for username availability
  useEffect(() => {
    console.log('🔍 CompleteProfileScreen - Username availability state:', {
      username,
      isChecking: usernameAvailability.isChecking,
      result: usernameAvailability.result,
      error: usernameAvailability.error
    });
  }, [username, usernameAvailability]);

  // Password strength validation
  const passwordStrength = usePasswordStrength(password);

  // Options for dropdowns
  const businessTypeOptions = [
    { value: 'societe_anonyme', label: 'Société Anonyme' },
    { value: 'entreprise_individuelle', label: 'Entreprise Individuelle' },
    { value: 'association', label: 'Association' },
    { value: 'autres', label: 'Autres' },
  ];

  const employeeCountOptions = [
    { value: '0-1', label: '0-1 employees' },
    { value: '2-5', label: '2-5 employees (Small team)' },
    { value: '6-20', label: '6-20 employees (Medium team)' },
    { value: '21-50', label: '21-50 employees (Large team)' },
    { value: '51-200', label: '51-200 employees (Enterprise)' },
    { value: '200+', label: '200+ employees (Large enterprise)' },
  ];

  // Check if form is complete to enable/disable button
  const isUsernameValid = username.trim() !== "" &&
    !usernameAvailability.isChecking &&
    usernameAvailability.result?.available === true;

  const isPasswordValid = passwordStrength.isValid;

  const isFormComplete = isBusinessAccount
    ? (businessStage === 1
        // Stage 1: Personal admin fields
        ? firstName.trim() !== "" &&
          lastName.trim() !== "" &&
          isUsernameValid &&
          isPasswordValid &&
          agreeToTerms
        // Stage 2: Business fields
        : businessName.trim() !== "" &&
          businessType !== "" &&
          employeeCount !== "" &&
          agreeToTerms
      )
    : firstName.trim() !== "" &&
      lastName.trim() !== "" &&
      isUsernameValid &&
      isPasswordValid &&
      agreeToTerms;

  const goBack = () => {
    // If in business Stage 2, go back to Stage 1
    if (isBusinessAccount && businessStage === 2) {
      setBusinessStage(1);
    } else {
      navigation.goBack();
    }
  };

  const handleContinue = async () => {
    // Conditional form validation
    if (isBusinessAccount && businessStage === 1) {
      // Stage 1: Validate personal admin fields
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

      if (!passwordStrength.isValid) {
        Alert.alert("Error", "Please create a stronger password");
        return;
      }

      if (!agreeToTerms) {
        Alert.alert("Error", "You must agree to the terms and conditions");
        return;
      }

      // Move to Stage 2 for business details
      setBusinessStage(2);
      return;
    } else if (isBusinessAccount && businessStage === 2) {
      // Business form validation
      if (!businessName.trim()) {
        Alert.alert("Error", "Please enter your business name");
        return;
      }

      if (!businessType) {
        Alert.alert("Error", "Please select a business type");
        return;
      }

      // Registration number is optional, no validation needed

      if (!employeeCount) {
        Alert.alert("Error", "Please select employee count");
        return;
      }
    } else {
      // Personal form validation
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

      if (!passwordStrength.isValid) {
        Alert.alert("Error", "Please create a stronger password");
        return;
      }
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
        const { accessToken, profileId } = authContext.phoneVerification;

        let response;
        if (isBusinessAccount && businessStage === 2) {
          // Two-stage business creation
          // Business accounts don't create personal profiles
          // They create auth.users -> business_admin_team -> business_profiles

          // Combine admin user data and business data
          const completeBusinessData = {
            // Admin user data (for auth.users metadata)
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            username: username.trim(),
            password: password,
            // Business profile data
            business_name: businessName.trim(),
            business_type: businessType,
            legal_name: registrationNumber.trim() || businessName.trim(),
            registration_number: registrationNumber.trim() || undefined,
            employee_count: employeeCount,
          };

          console.log('🚀 Creating business profile with admin:', {
            profileId,
            data: { ...completeBusinessData, password: '[REDACTED]' },
            url: `${API_PATHS.AUTH.COMPLETE_BUSINESS_PROFILE}/${profileId}`
          });

          // Single API call to complete business registration
          // This will: update auth.users, create business_profiles, create business_admin_team
          response = await apiClient.put(`${API_PATHS.AUTH.COMPLETE_BUSINESS_PROFILE}/${profileId}`, completeBusinessData, {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });
        } else {
          // Personal profile completion
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

          response = await apiClient.put(`${API_PATHS.AUTH.COMPLETE_PROFILE}/${profileId}`, profileData, {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });
        }
        
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
            
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {isBusinessAccount && businessStage === 1
                ? "Admin Details"
                : isBusinessAccount && businessStage === 2
                ? "Business Info"
                : "Complete Profile"}
            </Text>
          </View>
          
          <View style={styles.subtitleContainer}>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {isBusinessAccount && businessStage === 1
                ? "Create your admin account to manage the business"
                : isBusinessAccount && businessStage === 2
                ? "Now let's add your business information"
                : isFromPhoneVerification
                ? "Almost there! Let's finish setting up your account"
                : "We need a few more details to set up your account"}
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
            {isBusinessAccount ? (
              // Business Account Fields
              businessStage === 1 ? (
                // Stage 1: Personal admin fields for business accounts (same as personal fields)
                <>
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
                      onChangeText={(text) => setFirstName(sanitizeName(text))}
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
                      onChangeText={(text) => setLastName(sanitizeName(text))}
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Username</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.input, styles.inputWithIcon, {
                          backgroundColor: theme.colors.inputBackground,
                          borderColor: usernameAvailability.result?.available === true
                            ? '#4CAF50'
                            : usernameAvailability.result?.available === false
                            ? '#F44336'
                            : theme.colors.border,
                          color: theme.colors.textPrimary
                        }]}
                        placeholder="Choose a username"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                      />
                      <View style={styles.inputIcon}>
                        {usernameAvailability.isChecking ? (
                          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                        ) : usernameAvailability.result?.available === true ? (
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        ) : usernameAvailability.result?.available === false ? (
                          <Ionicons name="close-circle" size={20} color="#F44336" />
                        ) : null}
                      </View>
                    </View>
                    {usernameAvailability.result && (
                      <Text style={[styles.validationMessage, {
                        color: usernameAvailability.result.available ? '#4CAF50' : '#F44336'
                      }]}>
                        {usernameAvailability.result.message}
                      </Text>
                    )}
                    {usernameAvailability.error && (
                      <Text style={[styles.validationMessage, { color: '#F44336' }]}>
                        {usernameAvailability.error}
                      </Text>
                    )}
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
                    <PasswordStrengthMeter password={password} />
                  </View>
                </>
              ) : (
                // Stage 2: Business details fields
                <>
                  <View style={styles.formField}>
                    <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Business Name</Text>
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: theme.colors.inputBackground,
                        borderColor: theme.colors.border,
                        color: theme.colors.textPrimary
                      }]}
                      placeholder="Enter your business name"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={businessName}
                      onChangeText={(text) => setBusinessName(sanitizeBusinessName(text))}
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Business Type</Text>
                    <TouchableOpacity
                      style={[styles.input, styles.dropdownButton, {
                        backgroundColor: theme.colors.inputBackground,
                        borderColor: theme.colors.border
                      }]}
                      onPress={() => setBusinessTypeDropdownVisible(!businessTypeDropdownVisible)}
                    >
                      <Text style={[styles.dropdownText, {
                        color: businessType ? theme.colors.textPrimary : theme.colors.textSecondary
                      }]}>
                        {businessType ? businessTypeOptions.find(opt => opt.value === businessType)?.label : "Select business type"}
                      </Text>
                      <Ionicons
                        name={businessTypeDropdownVisible ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {businessTypeDropdownVisible && (
                      <View style={[styles.dropdownOptions, {
                        backgroundColor: theme.colors.inputBackground,
                        borderColor: theme.colors.border
                      }]}>
                        <ScrollView
                          style={styles.dropdownScrollView}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled={true}
                        >
                          {businessTypeOptions.map((option) => (
                            <TouchableOpacity
                              key={option.value}
                              style={styles.dropdownOption}
                              onPress={() => {
                                setBusinessType(option.value);
                                setBusinessTypeDropdownVisible(false);
                              }}
                            >
                              <Text style={[styles.dropdownOptionText, { color: theme.colors.textPrimary }]}>
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <View style={styles.formField}>
                    <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Registration Number (Optional)</Text>
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: theme.colors.inputBackground,
                        borderColor: theme.colors.border,
                        color: theme.colors.textPrimary
                      }]}
                      placeholder="Enter registration number (if available)"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={registrationNumber}
                      onChangeText={(text) => setRegistrationNumber(sanitizeRegistrationNumber(text))}
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Employee Count</Text>
                    <TouchableOpacity
                      style={[styles.input, styles.dropdownButton, {
                        backgroundColor: theme.colors.inputBackground,
                        borderColor: theme.colors.border
                      }]}
                      onPress={() => setEmployeeCountDropdownVisible(!employeeCountDropdownVisible)}
                    >
                      <Text style={[styles.dropdownText, {
                        color: employeeCount ? theme.colors.textPrimary : theme.colors.textSecondary
                      }]}>
                        {employeeCount ? employeeCountOptions.find(opt => opt.value === employeeCount)?.label : "Select employee count"}
                      </Text>
                      <Ionicons
                        name={employeeCountDropdownVisible ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {employeeCountDropdownVisible && (
                      <View style={[styles.dropdownOptions, {
                        backgroundColor: theme.colors.inputBackground,
                        borderColor: theme.colors.border
                      }]}>
                        <ScrollView
                          style={styles.dropdownScrollView}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled={true}
                        >
                          {employeeCountOptions.map((option) => (
                            <TouchableOpacity
                              key={option.value}
                              style={styles.dropdownOption}
                              onPress={() => {
                                setEmployeeCount(option.value);
                                setEmployeeCountDropdownVisible(false);
                              }}
                            >
                              <Text style={[styles.dropdownOptionText, { color: theme.colors.textPrimary }]}>
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </>
              )
            ) : (
              // Personal Account Fields
              <>
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
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, styles.inputWithIcon, {
                        backgroundColor: theme.colors.inputBackground,
                        borderColor: usernameAvailability.result?.available === true
                          ? '#4CAF50'
                          : usernameAvailability.result?.available === false
                          ? '#F44336'
                          : theme.colors.border,
                        color: theme.colors.textPrimary
                      }]}
                      placeholder="Choose a username"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={username}
                      onChangeText={(text) => setUsername(sanitizeUsername(text))}
                      autoCapitalize="none"
                    />
                    <View style={styles.inputIcon}>
                      {usernameAvailability.isChecking ? (
                        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                      ) : usernameAvailability.result?.available === true ? (
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      ) : usernameAvailability.result?.available === false ? (
                        <Ionicons name="close-circle" size={20} color="#F44336" />
                      ) : null}
                    </View>
                  </View>
                  {usernameAvailability.result && (
                    <Text style={[styles.validationMessage, {
                      color: usernameAvailability.result.available ? '#4CAF50' : '#F44336'
                    }]}>
                      {usernameAvailability.result.message}
                    </Text>
                  )}
                  {usernameAvailability.error && (
                    <Text style={[styles.validationMessage, { color: '#F44336' }]}>
                      {usernameAvailability.error}
                    </Text>
                  )}
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
                  <PasswordStrengthMeter password={password} />
                </View>
              </>
            )}
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
                {isBusinessAccount && businessStage === 1
                  ? "Continue to Business Details"
                  : isBusinessAccount && businessStage === 2
                  ? "Complete Business Setup"
                  : isFromPhoneVerification
                  ? "Complete Setup"
                  : "Continue"}
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
  inputContainer: {
    position: 'relative',
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
    zIndex: 1,
  },
  validationMessage: {
    fontSize: 12,
    marginTop: 4,
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
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownOptions: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    zIndex: 1000,
    maxHeight: 180,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  dropdownOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionText: {
    fontSize: 16,
  },
  dropdownScrollView: {
    maxHeight: 180,
  },
});

export default CompleteProfileScreen; 