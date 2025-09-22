// Updated: Added Map tab to bottom navigation - 2025-01-30

import React, { useEffect, Suspense } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { AuthGuard } from "../features/auth/components/AuthGuard";
import { getFocusedRouteNameFromRoute, RouteProp } from '@react-navigation/native';
import { ViewStyle, Platform, View, ActivityIndicator, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import ErrorBoundary from '../components/ErrorBoundary';
import { crashLogger } from '../utils/crashLogger'; // Initialize global crash logging

// Lazy load heavy navigators for better app startup performance
const WalletNavigator = React.lazy(() => import("./walletNavigator"));
const InteractionsNavigator = React.lazy(() => import("./interactions/interactionsNavigator"));
const ShopNavigator = React.lazy(() => import("./shopNavigator"));
const MapNavigator = React.lazy(() => import("./mapNavigator"));
const OffersNavigator = React.lazy(() => import("./offersNavigator"));

// Initialize crash logger immediately when app starts
crashLogger; // This triggers the singleton initialization and global error handlers

const Tab = createBottomTabNavigator();

// Loading fallback component for lazy-loaded navigators
const NavigatorLoadingFallback: React.FC<{ name: string }> = ({ name }) => {
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
        marginTop: theme.spacing.md,
        fontSize: theme.typography.fontSize.sm,
      }}>
        Loading {name}...
      </Text>
    </View>
  );
};

// Function to determine if tab bar should be hidden based on the route
const getTabBarVisibility = (route: RouteProp<any, any>, theme: ReturnType<typeof useTheme>['theme']): ViewStyle | undefined => {
  const routeName = getFocusedRouteNameFromRoute(route);
  
  // This function is no longer needed with the new navigation structure.
  // We will apply the style directly.

  const bottomPadding = Platform.OS === 'ios' ? 25 : 10;
  
  return {
    backgroundColor: theme.colors.card,
    borderTopColor: theme.colors.border,
    height: 72,
    paddingBottom: bottomPadding,
    paddingTop: 2,
  };
};

export default function AppNavigator() {
  const { theme } = useTheme();

  return (
    <ErrorBoundary>
      <Tab.Navigator
        screenOptions={({ route }) => {
          
          return {
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Wallet") {
              iconName = focused ? "wallet" : "wallet-outline";
            } else if (route.name === "Offers") {
              iconName = focused ? "pricetag" : "pricetag-outline";
            }
            else if (route.name === "Contacts") {
              iconName = focused ? "people" : "people-outline";
            } else if (route.name === "Map") {
              iconName = focused ? "map" : "map-outline";
            } else if (route.name === "Shop") {
              iconName = focused ? "cart" : "cart-outline";
            }

            return (
              <Ionicons name={iconName as any} size={size} color={color} />
            );
          },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarStyle: {
              backgroundColor: theme.colors.card,
              borderTopColor: theme.colors.border,
              height: 72,
              paddingBottom: Platform.OS === 'ios' ? 25 : 10,
              paddingTop: 2,
            },
            tabBarLabelStyle: {
              fontWeight: "500",
              fontSize: theme.typography.fontSize.xs - 2, // Further reduced font size
              marginTop: 0, // Kept no margin
            },
            tabBarIconStyle: {
              marginBottom: 0, // Kept no margin
            },
            headerShown: false,
          };
        }}
        initialRouteName="Contacts"
      >
        <Tab.Screen 
          name="Wallet" 
          children={() => (
            <Suspense fallback={<NavigatorLoadingFallback name="Wallet" />}>
              <WalletNavigator />
            </Suspense>
          )}
        />
        <Tab.Screen 
          name="Contacts" 
          children={() => (
            <Suspense fallback={<NavigatorLoadingFallback name="Contacts" />}>
              <InteractionsNavigator />
            </Suspense>
          )}
        />
        <Tab.Screen 
          name="Offers" 
          children={() => (
            <Suspense fallback={<NavigatorLoadingFallback name="Offers" />}>
              <OffersNavigator />
            </Suspense>
          )}
        />
        
        {/* <Tab.Screen 
          name="Map" 
          children={() => (
            <Suspense fallback={<NavigatorLoadingFallback name="Map" />}>
              <MapNavigator />
            </Suspense>
          )}
        /> */}
        {/* <Tab.Screen 
          name="Shop" 
          children={() => (
            <Suspense fallback={<NavigatorLoadingFallback name="Shop" />}>
              <ShopNavigator />
            </Suspense>
          )}
        /> */}
      </Tab.Navigator>
    </ErrorBoundary>
  );
}
