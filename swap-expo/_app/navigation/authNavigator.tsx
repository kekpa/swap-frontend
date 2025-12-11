// app/navigation/AuthNavigator.tsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// LaunchScreen removed - Revolut-style direct flow to SignIn

// Import new signup flow screens
import SignUpScreen from "../features/auth/signup/SignUpScreen";
import PhoneEntryScreen from "../features/auth/signup/PhoneEntryScreen";
import VerificationCodeScreen from "../components2/VerificationCodeScreen";
import CompleteProfileScreen from "../features/auth/signup/CompleteProfileScreen";

// Import new login flow screens
import SignInScreen from "../features/auth/login/SignInScreen";
import ForgotPasswordScreen from "../features/auth/login/ForgotPasswordScreen";
import ResetPasswordScreen from "../features/auth/login/ResetPasswordScreen";

// Import Profile Setup Navigator
import { ProfileSetupNavigator } from "../features/auth/profileSetup";

// LoadingScreen moved to RootNavigator for better flow control

const Stack = createNativeStackNavigator();

// Define Auth stack param list
export type AuthStackParamList = {
  SignIn: {
    mode?: 'profileSwitch';
    targetProfileId?: string;
    targetDisplayName?: string;
    targetProfileType?: 'personal' | 'business';
    sourceUsername?: string;
    sourceIdentifier?: string;
  } | undefined;
  SignUpScreen: undefined;
  PhoneEntry: {
    returnToTimeline?: boolean;
    sourceRoute?: string;
  };
  VerificationCode: {
    type: "phone" | "email";
    contact: string;
    channel?: "sms" | "whatsapp";
    returnToTimeline?: boolean;
    sourceRoute?: string;
  };
  CompleteProfile: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Revolut-style: Direct to SignIn (no LaunchScreen) */}
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

      {/* New signup flow screens */}
      <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      
      {/* Single adaptive verification screen for both phone and email */}
      <Stack.Screen name="VerificationCode" component={VerificationCodeScreen} />
      
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      
      {/* Profile Setup flow */}
      <Stack.Screen name="ProfileSetup" component={ProfileSetupNavigator} />
      
      {/* Password reset flow */}
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
