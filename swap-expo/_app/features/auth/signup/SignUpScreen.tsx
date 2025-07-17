// Updated: Added Personal/Business account type toggle for business registration support - 2025-01-27
// Updated: Removed social signup options (Google, Facebook, Email) keeping only phone-based signup - 2025-06-02
// Updated: Added integration with phone-signin API endpoint for OTP - 2025-05-30
// Updated: Integrated CountryCodePicker for international phone selection - 2025-05-30
// Updated: Modified to navigate to dedicated phone entry screen - 2025-05-30
// Updated: Added country code picker auto-open flow - 2025-05-30
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/ThemeContext";
import defaultTheme from "../../../theme/theme";

// Define type for navigation
type AuthStackParamList = {
  Launch: undefined;
  Walkthrough: undefined;
  PhoneEntry: { 
    openCountryPicker?: boolean;
    accountType?: 'personal' | 'business';
  };
  VerificationCode: { 
    phoneNumber: string; 
    channel?: string;
    accountType?: 'personal' | 'business';
  };
  CompleteProfile: undefined;
  EmailVerification: { email: string };
  SignIn: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

// Account type definition
type AccountType = 'personal' | 'business';

const SignUpScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const themeContext = useTheme();
  const theme = themeContext?.theme || defaultTheme;
  
  // State for account type selection
  const [accountType, setAccountType] = useState<AccountType>('personal');
  
  // Wait for theme to be properly initialized before rendering
  if (!theme || !theme.colors) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#8b14fd" />
      </SafeAreaView>
    );
  }

  const navigateToPhoneEntry = () => {
    navigation.navigate("PhoneEntry", { 
      openCountryPicker: false,
      accountType: accountType
    });
  };
  
  const navigateToPhoneEntryWithCountryPicker = () => {
    navigation.navigate("PhoneEntry", { 
      openCountryPicker: true,
      accountType: accountType
    });
  };
  
  const handleLoginPress = () => {
    navigation.navigate("SignIn");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Account Type Toggle */}
        <View style={styles.toggleContainer}>
          <View style={[styles.toggleWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
            <TouchableOpacity 
              style={[
                styles.toggleOption,
                accountType === 'personal' && styles.toggleOptionActive,
                {
                  backgroundColor: accountType === 'personal' 
                    ? theme.colors.primary 
                    : 'transparent'
                }
              ]}
              onPress={() => setAccountType('personal')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.toggleText,
                {
                  color: accountType === 'personal' 
                    ? theme.colors.white
                    : theme.colors.textSecondary
                }
              ]}>
                Personal
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.toggleOption,
                accountType === 'business' && styles.toggleOptionActive,
                {
                  backgroundColor: accountType === 'business' 
                    ? theme.colors.primary 
                    : 'transparent'
                }
              ]}
              onPress={() => setAccountType('business')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.toggleText,
                {
                  color: accountType === 'business' 
                    ? theme.colors.white
                    : theme.colors.textSecondary
                }
              ]}>
                Business
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {accountType === 'business' ? 'Create business account' : 'Enter your number'}
        </Text>
        
        {/* Subtitle for business accounts */}
        {accountType === 'business' && (
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Set up your business profile and start accepting payments
          </Text>
        )}
        
        {/* Phone Input Section (Non-editable, tapping navigates to PhoneEntry) */}
        <View style={styles.inputContainer}>
          <View style={styles.phoneInputContainer}>
            {/* Country Code Placeholder - Clicking this opens CountryPicker directly */}
            <TouchableOpacity 
              style={[styles.countryCodeContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
              onPress={navigateToPhoneEntryWithCountryPicker}
              activeOpacity={0.7}
            >
              <Text style={[styles.countryCodeText, { color: theme.colors.textPrimary }]}>
                🇭🇹 +509
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            {/* Phone Number Input Placeholder */}
            <TouchableOpacity 
              style={styles.phoneInputWrapper}
              onPress={navigateToPhoneEntry}
              activeOpacity={0.7}
            >
              <View style={[styles.inputPlaceholder, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
                  Phone number
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]} 
            onPress={navigateToPhoneEntry}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.secondaryButton, { 
            backgroundColor: theme.colors.inputBackground, 
            borderColor: theme.colors.border 
          }]} 
          onPress={handleLoginPress}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.textPrimary }]}>
            I already have an account
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-start",
    paddingTop: 40,
  },
  toggleContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  toggleWrapper: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 28,
    padding: 6,
    width: '100%',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  toggleOptionActive: {
    shadowColor: '#8b14fd',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 48,
  },
  phoneInputContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  countryCodeContainer: {
    width: "30%",
    marginRight: 8,
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: "500",
  },
  phoneInputWrapper: {
    flex: 1,
  },
  inputPlaceholder: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SignUpScreen; 