import React, { useEffect, useState } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuthContext } from "../features/auth/context/AuthContext";
import { useLoadingState } from '../hooks-data/useLoadingState';
import { loadingOrchestrator, LoadingState } from '../utils/LoadingOrchestrator';
import AuthNavigator from "./authNavigator";
import AppNavigator from "./appNavigator";
import ProfileNavigator from "./profileNavigator";
import LoadingScreen from "../features/auth/login/LoadingScreen";
import { CardStyleInterpolators, TransitionPresets } from "@react-navigation/stack";
import { useTheme } from "../theme/ThemeContext";

// Direct imports - clean, simple, no Suspense needed
import NewInteractionScreen from "../features/interactions/NewInteraction2";
import TransactionDetailsScreen from "../features/wallet/TransactionDetailsScreen";
import ContactInteractionHistoryScreen2 from "../features/interactions/ContactInteractionHistory2";
import SendMoneyScreen from "../features/interactions/sendMoney2/SendMoneyScreen";
import ReviewTransferScreen from "../features/interactions/sendMoney2/ReviewTransferScreen";
import TransferCompletedScreen from "../features/interactions/sendMoney2/TransferCompletedScreen";
import TempAddMoneyScreen from "../features/wallet/AddMoney/AddMoney2/TempAddMoney";

// Development bypass settings - rely on AuthContext now
const DEV_ALWAYS_AUTHENTICATED = false;
const isDevelopment = process.env.NODE_ENV === "development" || process.env.EXPO_PUBLIC_ENV === "development";

const Stack = createStackNavigator<RootStackParamList>();

// Define ParamList for the Root Stack
export type RootStackParamList = {
  App: { 
    screen?: string;
    params?: {
      screen?: string;
      params?: {
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
    };
  } | undefined;
  Auth: undefined;
  LoadingScreen: undefined;
  ProfileModal: { sourceRoute?: string };
  NewInteraction: undefined; // Add NewInteraction here (can add params if needed later)
  AddMoneyModal: undefined; // TempAddMoney modal accessible from anywhere
  TransactionDetails: {
    transactionId: string;
    transaction?: any;
    sourceScreen?: 'wallet' | 'transactionList' | 'chat';
    contactName?: string;
    contactInitials?: string;
    contactAvatarColor?: string;
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
    showTransferCompletedModal?: boolean;
    transferDetails?: any; // Consider creating a specific type for this
  };
  SendMoney: {
    toEntityId?: string;
    recipientName?: string;
    recipientInitial?: string;
    recipientColor?: string;
  };
  ReviewTransfer: {
    amount: string | number;
    toEntityId: string;
    recipientName: string;
    recipientInitial: string;
    recipientColor: string;
    message?: string;
    reference?: string;
  };
  TransferCompleted: {
    amount: number;
    recipientName: string;
    recipientInitial: string;
    recipientColor: string;
    message: string;
    transactionId: string;
    status?: string;
    createdAt?: string;
  };
};

export default function RootNavigator() {
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const { isInitialLoadComplete } = useLoadingState();

  // PROFESSIONAL: LoadingOrchestrator integration for proper auth-to-app coordination
  const [orchestratorState, setOrchestratorState] = useState<LoadingState>(loadingOrchestrator.getLoadingState());

  const isAuthenticated = authContext?.isAuthenticated || false;
  const isInitialized = authContext?.isInitialized || false;

  // PROFESSIONAL: Listen to LoadingOrchestrator state changes for coordinated navigation
  useEffect(() => {
    const unsubscribe = loadingOrchestrator.onStateChange((newState) => {
      console.log('🏛️ [RootNavigator] LoadingOrchestrator state update:', {
        isLoading: newState.isLoading,
        canShowUI: newState.canShowUI,
        transitionPhase: newState.transitionPhase
      });

      setOrchestratorState(newState);
    });

    return unsubscribe;
  }, []);

  // NOTE: needsLogin handling removed - AuthStateMachine is now the sole coordinator
  // The setTimeout hack was a symptom of competing coordination systems

  // PROFESSIONAL three-state navigation logic:
  // 1. Not initialized → LoadingScreen (blocks auth flash during session check)
  // 2. Initialized & not authenticated → Auth stack
  // 3. Authenticated but loading data → LoadingScreen
  // 4. Authenticated and ready → App stack
  //
  // This prevents the "Sign In flash" when user is already logged in.
  // We wait for session check to complete before showing Auth screen.
  const showAuthNavigator = isInitialized && !isAuthenticated;  // Only show auth AFTER we know session state
  const showLoadingScreen = !isInitialized || (isAuthenticated && (!orchestratorState.canShowUI || !isInitialLoadComplete));
  const showAppNavigator = isInitialized && isAuthenticated && isInitialLoadComplete && orchestratorState.canShowUI;

  // In development mode, can force app navigator
  const forceAppInDev = isDevelopment && DEV_ALWAYS_AUTHENTICATED;

  // Debug logging (detailed for logout investigation)
  console.log('🧭 [RootNavigator] Navigation decision:', {
    isInitialized,
    isAuthenticated,
    isInitialLoadComplete,
    canShowUI: orchestratorState.canShowUI,
    showAppNavigator,
    showLoadingScreen,
    showAuthNavigator,
    decision: showAppNavigator || forceAppInDev ? 'App' : showLoadingScreen ? 'Loading' : 'Auth'
  });

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      {showAppNavigator || forceAppInDev ? (
        <>
          <Stack.Screen 
            name="App" 
            component={AppNavigator}
          />
          <Stack.Screen
            name="ProfileModal"
            component={ProfileNavigator}
            options={{
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
          />
          <Stack.Screen
            name="NewInteraction"
            component={NewInteractionScreen}
            options={{
              presentation: 'modal',
              cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
              gestureEnabled: true,
              gestureDirection: 'vertical',
            }}
          />
          <Stack.Screen
            name="AddMoneyModal"
            component={TempAddMoneyScreen}
            options={{
              presentation: 'modal',
              cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
              gestureEnabled: true,
              gestureDirection: 'vertical',
            }}
          />
          <Stack.Screen
            name="TransactionDetails"
            component={TransactionDetailsScreen}
            options={{
              presentation: 'modal',
              cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
              gestureEnabled: true,
              gestureDirection: 'vertical',
            }}
          />
          <Stack.Screen
            name="ContactInteractionHistory2"
            component={ContactInteractionHistoryScreen2}
            options={{
              ...TransitionPresets.SlideFromRightIOS,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
          <Stack.Screen
            name="SendMoney"
            component={SendMoneyScreen}
            options={{
              ...TransitionPresets.SlideFromRightIOS,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
          <Stack.Screen
            name="ReviewTransfer"
            component={ReviewTransferScreen}
            options={{
              ...TransitionPresets.SlideFromRightIOS,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
          <Stack.Screen
            name="TransferCompleted"
            component={TransferCompletedScreen}
            options={{
              presentation: 'modal',
              ...TransitionPresets.ModalPresentationIOS,
              gestureEnabled: false,
            }}
          />
          {/* Auth screen available for profile switching even when authenticated */}
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{
              gestureEnabled: false,
              animationEnabled: true,
            }}
          />
        </>
      ) : showLoadingScreen ? (
        <Stack.Screen
          name="LoadingScreen"
          component={LoadingScreen}
        />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
