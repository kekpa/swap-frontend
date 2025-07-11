// Copyright 2025 frantzopf
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// app/navigation/AuthNavigator.tsx

import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import Profile from "../features/profile/profile";
import ReferralScreen from "../features/profile/Referrals/Referral";
import ReferralCounterScreen from "../features/profile/Referrals/ReferralCounter";
import AddCardScreen from "../features/wallet/AddMoney/Instant/AddCard";
import AddMoneyOptionsScreen from "../features/wallet/AddMoney/AddMoneyOptions";
import FeesScreen from "../features/profile/fees";
import VerifyYourIdentityScreen from "../features/profile/kyc/VerifyYourIdentity";
import VerificationCompleteScreen from "../features/profile/kyc/VerificationComplete";
import TakeSelfieScreen from "../features/profile/kyc/TakeSelfie";
import UploadIdScreen from "../features/profile/kyc/UploadId";
import PersonalInfoFlow from "../features/profile/kyc/personal-info/PersonalInfoFlow";
import AccountScreen from "../features/profile/Account";
import PersonalInfoScreen from "../features/profile/PersonalInfo";
import SecurityPrivacyScreen from "../features/profile/security/SecurityPrivacy";
import PasscodeScreen from "../components2/Passcode";
import PhoneEntryScreen from "../features/auth/signup/PhoneEntryScreen";
import KycEmailEntryScreen from "../features/profile/kyc/KycEmailEntryScreen";
import BiometricSetupScreen from "../features/profile/kyc/BiometricSetup";
import VerificationCodeScreen from "../components2/VerificationCodeScreen";
// Business KYC Components
import { 
  BusinessInfoFlow,
  BusinessOwnerInfo,
  BusinessAddress,
  BusinessDocuments,
  BusinessVerification,
} from "../features/profile/kyc/business-flow";
// import Support from "../features/profile/support";

// Define the types for the profile stack navigator
export type ProfileStackParamList = {
  Profile: { sourceRoute?: string } | undefined;
  Account: undefined;
  PersonalInfo: undefined;
  Documents: undefined;
  Fees: undefined;
  SecurityPrivacy: undefined;
  Passcode: { 
    isKycFlow?: boolean; 
    sourceRoute?: string;
    returnToTimeline?: boolean;
  } | undefined;
  VerifyYourIdentity: { sourceRoute?: string } | undefined;
  VerificationComplete: undefined;
  PhoneEntry: { 
    sourceRoute?: string;
    returnToTimeline?: boolean;
    openCountryPicker?: boolean;
    currentPhone?: string | null;
  } | undefined;
  TakeSelfie: { 
    sourceRoute?: string;
    returnToTimeline?: boolean;
  } | undefined;
  UploadId: { 
    sourceRoute?: string;
    returnToTimeline?: boolean;
  } | undefined;
  PersonalInfoFlow: { 
    sourceRoute?: string;
    returnToTimeline?: boolean;
  } | undefined;
  BiometricSetup: {
    returnToTimeline?: boolean;
    sourceRoute?: string;
  } | undefined;
  OnboardingStatus: undefined;
  OnboardingStep: {
    stepId: number;
    stepTitle: string;
    isCompleted: boolean;
  };
  Referral: {
    earnedAmount?: string;
    pendingAmount?: string;
  };
  ReferralCounter: {
    earnedAmount?: string;
    pendingAmount?: string;
    initialView?: "faq" | "invites";
    pendingInvites?: any[];
    completedInvites?: any[];
  };
  AddCard: undefined;
  AddMoneyOptions: undefined;
  KycEmailEntry: {
    returnToTimeline?: boolean;
    sourceRoute?: string;
    currentEmail?: string | null;
  };
  VerificationCode: {
    type: "phone" | "email";
    contact: string;
    channel?: "sms" | "whatsapp";
    returnToTimeline?: boolean;
    sourceRoute?: string;
  };
  // Business KYC Screens
  BusinessInfoFlow: {
    returnToTimeline?: boolean;
    sourceRoute?: string;
  };
  BusinessOwnerInfo: {
    returnToTimeline?: boolean;
    sourceRoute?: string;
  };
  BusinessAddress: {
    returnToTimeline?: boolean;
    sourceRoute?: string;
  };
  BusinessDocuments: {
    returnToTimeline?: boolean;
    sourceRoute?: string;
  };
  BusinessVerification: {
    returnToTimeline?: boolean;
    sourceRoute?: string;
  };
};

const Stack = createStackNavigator<ProfileStackParamList>();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Profile"
        component={Profile}
        options={{
          animation: "slide_from_left",
        }}
      />
      <Stack.Screen
        name="Referral"
        component={ReferralScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="ReferralCounter"
        component={ReferralCounterScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="AddCard"
        component={AddCardScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="AddMoneyOptions"
        component={AddMoneyOptionsScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="Fees"
        component={FeesScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="VerifyYourIdentity"
        component={VerifyYourIdentityScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      <Stack.Screen
        name="VerificationComplete"
        component={VerificationCompleteScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      <Stack.Screen
        name="TakeSelfie"
        component={TakeSelfieScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      <Stack.Screen
        name="UploadId"
        component={UploadIdScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      <Stack.Screen
        name="PersonalInfoFlow"
        component={PersonalInfoFlow}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      <Stack.Screen
        name="BiometricSetup"
        component={BiometricSetupScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="PersonalInfo"
        component={PersonalInfoScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="SecurityPrivacy"
        component={SecurityPrivacyScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="Passcode"
        component={PasscodeScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      <Stack.Screen
        name="PhoneEntry"
        component={PhoneEntryScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="KycEmailEntry"
        component={KycEmailEntryScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen 
        name="VerificationCode"
        component={VerificationCodeScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      {/* Business KYC Screens */}
      <Stack.Screen
        name="BusinessInfoFlow"
        component={BusinessInfoFlow}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      <Stack.Screen
        name="BusinessOwnerInfo"
        component={BusinessOwnerInfo}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      <Stack.Screen
        name="BusinessAddress"
        component={BusinessAddress}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      <Stack.Screen
        name="BusinessDocuments"
        component={BusinessDocuments}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      <Stack.Screen
        name="BusinessVerification"
        component={BusinessVerification}
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          gestureDirection: "horizontal"
        }}
      />
      {/* <Stack.Screen name="Support" component={Support} /> */}
    </Stack.Navigator>
  );
}
