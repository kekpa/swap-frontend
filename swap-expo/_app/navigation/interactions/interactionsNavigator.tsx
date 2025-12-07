import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import InteractionsHistoryScreen from "../../features/interactions/InteractionsHistory2";
import ArchivedInteractionsScreen from "../../features/interactions/ArchivedInteractions";
import { AccountProvider } from "../../features/interactions/context/AccountContext";
import ReferralProgramScreen from "../../features/interactions/referralsTransfers/ReferralProgram";
import { CardStyleInterpolators, TransitionPresets } from "@react-navigation/stack";
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
  ReferralProgram: {
    onBack?: () => void;
    onInviteFriends?: () => void;
  };
  ArchivedInteractions: undefined;
  // Add other transfer-related screens here
};

const Stack = createStackNavigator<InteractionsStackParamList>();

export default function InteractionsNavigator() {
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
          name="ReferralProgram"
          component={ReferralProgramScreen}
          options={{
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        />
        <Stack.Screen
          name="ArchivedInteractions"
          component={ArchivedInteractionsScreen}
          options={{
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        />
      </Stack.Navigator>
    </AccountProvider>
  );
}
