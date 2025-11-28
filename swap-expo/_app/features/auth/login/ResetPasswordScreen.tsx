// Created: Added ResetPasswordScreen component for login flow - 2024-07-30
// Updated: Refactored to use global theme system - YYYY-MM-DD
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "../context/AuthContext";
import { useTheme } from "../../../theme/ThemeContext";
import { Theme } from "../../../theme/theme";

// Define type for route and navigation
type AuthStackParamList = {
  VerificationCode: { email: string };
  ResetPassword: { email: string };
  SignIn: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;
type RouteProps = RouteProp<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { email } = route.params;
  const authContext = useAuthContext();
  const { theme } = useTheme();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Password validation checks
  const [validations, setValidations] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasSpecialChar: false,
  });
  
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Check password strength as user types
  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasSpecialChar = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
    
    setValidations({
      hasMinLength,
      hasUppercase,
      hasSpecialChar,
    });
    
    return hasMinLength && hasUppercase && hasSpecialChar;
  };
  
  // Handle input change for new password
  const handlePasswordChange = (text: string) => {
    setNewPassword(text);
    validatePassword(text);
    
    // Clear errors when typing again
    if (errors.password) {
      setErrors({
        ...errors,
        password: '',
      });
    }
    
    // Check if passwords match when both fields have values
    if (confirmPassword && text !== confirmPassword) {
      setErrors({
        ...errors,
        confirmPassword: 'Passwords do not match',
      });
    } else if (confirmPassword) {
      setErrors({
        ...errors,
        confirmPassword: '',
      });
    }
  };
  
  // Handle input change for confirm password
  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    
    // Check if passwords match
    if (newPassword !== text) {
      setErrors({
        ...errors,
        confirmPassword: 'Passwords do not match',
      });
    } else {
      setErrors({
        ...errors,
        confirmPassword: '',
      });
    }
  };
  
  // Handle reset password form submission
  const handleResetPassword = () => {
    // Validate form
    const newErrors: { [key: string]: string } = {};
    
    if (!newPassword) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(newPassword)) {
      newErrors.password = 'Password does not meet requirements';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Proceed with password reset
    setIsLoading(true);
    
    // Simulate API call to reset password
    setTimeout(() => {
      setIsLoading(false);
      
      // Show success message and navigate back to login
      Alert.alert(
        "Password Reset",
        "Your password has been reset successfully. Please sign in with your new password.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("SignIn"),
          }
        ]
      );
    }, 1500);
  };

  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, padding: theme.spacing.lg },
    backButton: { width: 40, height: 40, justifyContent: "center", marginBottom: theme.spacing.lg, alignSelf: 'flex-start' },
    header: { marginBottom: theme.spacing.xl, alignItems: "center" },
    title: { fontSize: theme.typography.fontSize.xxl, fontWeight: "700", marginBottom: theme.spacing.sm, textAlign: "center", color: theme.colors.textPrimary },
    subtitle: { fontSize: theme.typography.fontSize.md, color: theme.colors.textSecondary, textAlign: "center" },
    formContainer: { marginBottom: theme.spacing.lg },
    inputGroup: { marginBottom: theme.spacing.md },
    label: { fontSize: theme.typography.fontSize.md, fontWeight: "500", marginBottom: theme.spacing.sm, color: theme.colors.textPrimary },
    input: { ...theme.commonStyles.input, height: 56 },
    inputError: { borderColor: theme.colors.error },
    errorText: { color: theme.colors.error, marginTop: theme.spacing.xs, fontSize: theme.typography.fontSize.sm },
    requirementsContainer: { marginTop: theme.spacing.md },
    requirementsTitle: { fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing.sm, color: theme.colors.textSecondary },
    requirement: { flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.sm },
    requirementText: { marginLeft: theme.spacing.sm, fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary },
    requirementIconValid: { color: theme.colors.success },
    requirementIconInvalid: { color: theme.colors.border },
    buttonContainer: { marginTop: "auto" },
    resetButton: { ...theme.commonStyles.primaryButton, height: 56 },
    resetButtonText: { ...theme.commonStyles.primaryButtonText },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background}/>
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.header}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Create a new password for your account
          </Text>
        </View>
        
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder="Enter new password"
              placeholderTextColor={theme.colors.textTertiary}
              value={newPassword}
              onChangeText={handlePasswordChange}
              secureTextEntry
            />
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.textTertiary}
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry
            />
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>
          
          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password must contain:</Text>
            <View style={styles.requirement}>
              <Ionicons
                name={validations.hasMinLength ? "checkmark-circle" : "checkmark-circle-outline"}
                size={16}
                style={validations.hasMinLength ? styles.requirementIconValid : styles.requirementIconInvalid}
              />
              <Text style={styles.requirementText}>At least 8 characters</Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons
                name={validations.hasUppercase ? "checkmark-circle" : "checkmark-circle-outline"}
                size={16}
                style={validations.hasUppercase ? styles.requirementIconValid : styles.requirementIconInvalid}
              />
              <Text style={styles.requirementText}>One uppercase letter</Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons
                name={validations.hasSpecialChar ? "checkmark-circle" : "checkmark-circle-outline"}
                size={16}
                style={validations.hasSpecialChar ? styles.requirementIconValid : styles.requirementIconInvalid}
              />
              <Text style={styles.requirementText}>One number or special character</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.resetButton, isLoading && {backgroundColor: theme.colors.grayMedium}]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.resetButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen; 