// Updated: Added Map tab to bottom navigation - 2025-01-30

import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { AuthGuard } from "../features/auth/components/AuthGuard";
import WalletNavigator from "./walletNavigator";
import InteractionsNavigator from "./interactions/interactionsNavigator";
import ShopNavigator from "./shopNavigator";
import MapNavigator from "./mapNavigator";
import { getFocusedRouteNameFromRoute, RouteProp } from '@react-navigation/native';
import { ViewStyle, Platform } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import OffersNavigator from "./offersNavigator";

const Tab = createBottomTabNavigator();

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
    <AuthGuard>
      <Tab.Navigator
        screenOptions={({ route }) => {
          
          return {
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Wallet") {
              iconName = focused ? "wallet" : "wallet-outline";
            } else if (route.name === "Contacts") {
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
          component={WalletNavigator}
        />
        <Tab.Screen 
          name="Contacts" 
          component={InteractionsNavigator}
        />
        <Tab.Screen 
          name="Map" 
          component={MapNavigator}
        />
        <Tab.Screen 
          name="Shop" 
          component={ShopNavigator}
        />
        {/* <Tab.Screen 
          name="Offers" 
          component={OffersNavigator}
        /> */}
      </Tab.Navigator>
    </AuthGuard>
  );
}
