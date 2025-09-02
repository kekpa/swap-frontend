import React, { useEffect, useRef, Suspense } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuthContext } from "../features/auth/context/AuthContext";
import { useLoadingState } from "../query/hooks/useLoadingState";
import AuthNavigator from "./authNavigator";
import AppNavigator from "./appNavigator";
import ProfileNavigator from "./profileNavigator";
import LoadingScreen from "../features/auth/login/LoadingScreen";
import logger from "../utils/logger";
import { CardStyleInterpolators, TransitionPresets } from "@react-navigation/stack";
import { View, ActivityIndicator, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";

// Lazy load heavy modal screens for better performance
const NewInteractionScreen = React.lazy(() => import("../features/interactions/NewInteraction2"));
const TransactionDetailsScreen = React.lazy(() => import("../features/wallet/TransactionDetailsScreen"));
const ContactInteractionHistoryScreen2 = React.lazy(() => import("../features/interactions/ContactInteractionHistory2"));
const SendMoneyScreen = React.lazy(() => import("../features/interactions/sendMoney2/SendMoneyScreen"));
const ReviewTransferScreen = React.lazy(() => import("../features/interactions/sendMoney2/ReviewTransferScreen"));
const TransferCompletedScreen = React.lazy(() => import("../features/interactions/sendMoney2/TransferCompletedScreen"));

// Development bypass settings - rely on AuthContext now
const DEV_ALWAYS_AUTHENTICATED = false;
const isDevelopment = process.env.NODE_ENV === "development" || process.env.EXPO_PUBLIC_ENV === "development";

const Stack = createStackNavigator<RootStackParamList>();

// Loading fallback component for lazy-loaded screens
const ScreenLoadingFallback: React.FC<{ name: string }> = ({ name }) => {
  const { theme } = useTheme();
  
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{
        color: theme.colors.textSecondary,
        marginTop: 16,
        fontSize: 16,
      }}>
        Loading {name}...
      </Text>
    </View>
  );
};

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
    recipientId?: string;
    recipientName?: string;
    recipientInitial?: string;
    recipientColor?: string;
  };
  ReviewTransfer: {
    amount: string | number;
    recipientId: string;
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
  const authContext = useAuthContext();
  const { isInitialLoadComplete } = useLoadingState();
  const isAuthenticated = authContext?.isAuthenticated || false;
  const isLoading = authContext?.isLoading || false;
  const needsLogin = authContext?.needsLogin || false;

  // Add refs to prevent rapid loops and state oscillations
  const lastNeedsLoginState = useRef(needsLogin);
  const isHandlingNeedsLogin = useRef(false);
  const needsLoginTimer = useRef<NodeJS.Timeout | null>(null);

  // Prevent rapid needsLogin state changes that cause navigation loops
  useEffect(() => {
    // Only handle if needsLogin actually changed and we're not already handling it
    if (needsLogin && needsLogin !== lastNeedsLoginState.current && !isHandlingNeedsLogin.current) {
      console.log('🚨 [RootNavigator] 🔄 needsLogin detected, preventing rapid state changes');
      isHandlingNeedsLogin.current = true;
      lastNeedsLoginState.current = needsLogin;
      
      logger.debug("needsLogin flag is true, forcing logout", "navigation");
      
      // Clear any existing timer to prevent multiple timeouts
      if (needsLoginTimer.current) {
        clearTimeout(needsLoginTimer.current);
      }
      
      // This will trigger a re-render with isAuthenticated = false
      authContext?.setIsAuthenticated(false);
      
      // Reset flags after a longer delay to prevent loops
      needsLoginTimer.current = setTimeout(() => {
        if (authContext?.needsLogin) {
          logger.debug("Resetting needsLogin flag after controlled delay", "navigation");
          authContext.setNeedsLogin?.(false);
        }
        isHandlingNeedsLogin.current = false;
        console.log('🚨 [RootNavigator] ✅ needsLogin handling completed');
      }, 1000); // Increased to 1 second to prevent rapid loops
    } else if (!needsLogin) {
      // Reset tracking when needsLogin becomes false
      lastNeedsLoginState.current = needsLogin;
      isHandlingNeedsLogin.current = false;
    }
    
    return () => {
      if (needsLoginTimer.current) {
        clearTimeout(needsLoginTimer.current);
      }
    };
  }, [needsLogin, authContext]);

  // Three-state navigation logic:
  // 1. Not authenticated → Auth stack
  // 2. Authenticated but data still loading → LoadingScreen
  // 3. Authenticated and data loaded → App stack
  const showAppNavigator = isAuthenticated && isInitialLoadComplete;
  const showLoadingScreen = isAuthenticated && !isInitialLoadComplete;
  const showAuthNavigator = !isAuthenticated;

  // In development mode, can force app navigator
  const forceAppInDev = isDevelopment && DEV_ALWAYS_AUTHENTICATED;

  console.log('🔄 [RootNavigator] Navigation state:', {
    isAuthenticated,
    isInitialLoadComplete,
    showAppNavigator: showAppNavigator || forceAppInDev,
    showLoadingScreen,
    showAuthNavigator,
    forceAppInDev
  });

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
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
              cardStyle: { backgroundColor: "#FFFFFF" },
            }}
          />
          <Stack.Screen
            name="NewInteraction"
            children={() => (
              <Suspense fallback={<ScreenLoadingFallback name="New Interaction" />}>
                <NewInteractionScreen />
              </Suspense>
            )}
            options={{
              presentation: 'modal',
              cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
              gestureEnabled: true,
              gestureDirection: 'vertical',
            }}
          />
          <Stack.Screen
            name="TransactionDetails"
            children={() => (
              <Suspense fallback={<ScreenLoadingFallback name="Transaction Details" />}>
                <TransactionDetailsScreen />
              </Suspense>
            )}
            options={{
              presentation: 'modal',
              cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
              gestureEnabled: true,
              gestureDirection: 'vertical',
            }}
          />
          <Stack.Screen
            name="ContactInteractionHistory2"
            children={() => (
              <Suspense fallback={<ScreenLoadingFallback name="Chat History" />}>
                <ContactInteractionHistoryScreen2 />
              </Suspense>
            )}
            options={{
              ...TransitionPresets.SlideFromRightIOS,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
          <Stack.Screen
            name="SendMoney"
            children={() => (
              <Suspense fallback={<ScreenLoadingFallback name="Send Money" />}>
                <SendMoneyScreen />
              </Suspense>
            )}
            options={{
              ...TransitionPresets.SlideFromRightIOS,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
          <Stack.Screen
            name="ReviewTransfer"
            children={() => (
              <Suspense fallback={<ScreenLoadingFallback name="Review Transfer" />}>
                <ReviewTransferScreen />
              </Suspense>
            )}
            options={{
              ...TransitionPresets.SlideFromRightIOS,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
          <Stack.Screen
            name="TransferCompleted"
            children={() => (
              <Suspense fallback={<ScreenLoadingFallback name="Transfer Complete" />}>
                <TransferCompletedScreen />
              </Suspense>
            )}
            options={{
              presentation: 'modal',
              ...TransitionPresets.ModalPresentationIOS,
              gestureEnabled: false, // Typically don't want to dismiss a completion screen
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
