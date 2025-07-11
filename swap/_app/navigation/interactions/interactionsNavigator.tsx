import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import InteractionsHistoryScreen from "../../features/interactions/InteractionsHistory2";
import { AccountProvider } from "../../features/interactions/context/AccountContext";
import ReferralProgramScreen from "../../features/interactions/referralsTransfers/ReferralProgram";
import NewInteractionNavigator from "./newInteractionNavigator";
import ContactInteractionHistoryScreen2 from "../../features/interactions/ContactInteractionHistory2";
import { CardStyleInterpolators, TransitionPresets } from "@react-navigation/stack";
import SendMoneyScreen from "../../features/interactions/sendMoney2/SendMoneyScreen";
import ReviewTransferScreen from "../../features/interactions/sendMoney2/ReviewTransferScreen";
import TransferCompletedScreen from "../../features/interactions/sendMoney2/TransferCompletedScreen";
import TransactionDetailsScreen from "../../features/wallet/TransactionDetailsScreen";
import { Platform } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

// Use placeholder components for screens that are causing issues
const PlaceholderScreen = () => <React.Fragment />;
const ReviewTransferPlaceholder = () => <React.Fragment />;
const TransferCompletedPlaceholder = () => <React.Fragment />;

// Define the types for the interactions stack navigator
export type InteractionsStackParamList = {
  InteractionsHistory: {
    navigateToContact?: {
      contactId: string;
      contactName: string;
      contactInitials: string;
      contactAvatarColor: string;
      forceRefresh?: boolean;
      timestamp?: number;
      isGroup?: boolean;
    };
    navigateToNewChat?: boolean;
  };
  NewTransferScreen: undefined;
  AddSWAPContact: undefined;
  NewInteraction: undefined;
  ContactInteractionHistory: {
    contactId: string;
    contactName: string;
    contactInitials: string;
    contactAvatarColor: string;
    silentErrorMode?: boolean;
    interactionId?: string;
    forceRefresh?: boolean;
    timestamp?: number;
    isGroup?: boolean;
  };
  ContactInteractionHistory2: {
    contactId: string;
    contactName: string;
    contactInitials: string;
    contactAvatarColor: string;
    silentErrorMode?: boolean;
    interactionId?: string;
    forceRefresh?: boolean;
    timestamp?: number;
    isGroup?: boolean;
  };
  SendTransfer: {
    contactId?: string;
    contactName?: string;
    contactInitials?: string;
    contactAvatarColor?: string;
    recipientId?: string;
    recipientName?: string;
    recipientInitial?: string;
    recipientColor?: string;
  };
  SendMoney: {
    contactId?: string;
    contactName?: string;
    contactInitials?: string;
    contactAvatarColor?: string;
    recipientId?: string;
    recipientName?: string;
    recipientInitial?: string;
    recipientColor?: string;
  };
  AccountSelector: undefined;
  AddBankRecipient: undefined;
  ScheduleTransfer: undefined;
  ReviewTransfer: {
    contactId?: string;
    contactName?: string;
    contactInitials?: string;
    contactAvatarColor?: string;
    amount?: string | number;
    reference?: string;
    fromAccount?: string;
    recipientId?: string;
    recipientName?: string;
    recipientInitial?: string;
    recipientColor?: string;
    message?: string;
  };
  TransferCompleted: {
    amount: number;
    recipientName: string;
    recipientInitial: string;
    recipientColor: string;
    message: string;
    transactionId: string;
  };
  TransactionDetails: {
    transactionId: string;
    transaction?: any;
    sourceScreen?: 'wallet' | 'transactionList' | 'chat';
    contactName?: string;
    contactInitials?: string;
    contactAvatarColor?: string;
  };
  ReferralProgram: {
    onBack?: () => void;
    onInviteFriends?: () => void;
  };
  // Add other transfer-related screens here
};

const Stack = createStackNavigator<InteractionsStackParamList>();

export default function InteractionsNavigator() {
  console.log("Rendering InteractionsNavigator");
  const { theme } = useTheme();

  return (
    <AccountProvider>
      <Stack.Navigator
        initialRouteName="InteractionsHistory"
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardOverlayEnabled: true,
        }}
      >
        <Stack.Screen name="InteractionsHistory" component={InteractionsHistoryScreen} />
        <Stack.Screen
          name="NewInteraction"
          component={NewInteractionNavigator}
          options={{
            presentation: "modal",
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            cardStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen
          name="ContactInteractionHistory2"
          component={ContactInteractionHistoryScreen2}
          options={{
            ...TransitionPresets.SlideFromRightIOS, // Use built-in transition preset
            cardStyle: { backgroundColor: "white" },
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
        <Stack.Screen
          name="SendTransfer"
          component={SendMoneyScreen}
          options={{
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        />
        <Stack.Screen
          name="SendMoney"
          component={SendMoneyScreen}
          options={{
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        />
        <Stack.Screen
          name="AccountSelector"
          component={PlaceholderScreen}
          options={{
            presentation: "modal",
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          }}
        />
        <Stack.Screen
          name="ScheduleTransfer"
          component={PlaceholderScreen}
          options={{
            presentation: "modal",
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
          }}
        />
        <Stack.Screen
          name="ReviewTransfer"
          component={ReviewTransferScreen}
          options={{
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        />
        <Stack.Screen
          name="TransferCompleted"
          component={TransferCompletedScreen}
          options={{
            presentation: "modal",
            cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
            cardStyle: { backgroundColor: "white" },
            gestureEnabled: true,
            gestureDirection: "vertical",
          }}
        />
        <Stack.Screen
          name="TransactionDetails"
          component={TransactionDetailsScreen}
          options={{
            presentation: "modal",
            cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
            gestureEnabled: true,
            gestureDirection: "vertical",
          }}
        />
        <Stack.Screen
          name="ReferralProgram"
          component={ReferralProgramScreen}
          options={{
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        />
      </Stack.Navigator>
    </AccountProvider>
  );
}
