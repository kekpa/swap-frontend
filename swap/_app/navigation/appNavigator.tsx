// Updated: Added Map tab to bottom navigation - 2025-01-30

import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { AuthGuard } from "../features/auth/components/AuthGuard";
import WalletNavigator from "./walletNavigator";
import InteractionsNavigator from "./interactions/interactionsNavigator";
import OffersNavigator from "./offersNavigator";
import MapNavigator from "./mapNavigator";
import { getFocusedRouteNameFromRoute, RouteProp } from '@react-navigation/native';
import { ViewStyle, Platform } from "react-native";
import { useTheme } from "../theme/ThemeContext";

const Tab = createBottomTabNavigator();

// List of screens where tab bar should be hidden
const hideOnScreens = [
  'ContactInteractionHistory2',
  'SendMoney',
  'ReviewTransfer',
  'TransferCompleted',
  'SendTransfer',
  'TransactionDetails',
];

// Function to determine if tab bar should be hidden based on the route
const getTabBarVisibility = (route: RouteProp<any, any>, theme: ReturnType<typeof useTheme>['theme']): ViewStyle | undefined => {
  const routeName = getFocusedRouteNameFromRoute(route);
  
  // PRIMARY CHECK: Use the original simple logic that was working
  if (routeName && hideOnScreens.includes(routeName)) {
    return { display: 'none' };
  }

  // FALLBACK: Only use nested detection if getFocusedRouteNameFromRoute failed
  if (!routeName) {
    const routeAsAny = route as any;
    if (routeAsAny.state?.routes) {
      const activeRoute = routeAsAny.state.routes[routeAsAny.state.index];
      if (activeRoute?.name && hideOnScreens.includes(activeRoute.name)) {
        return { display: 'none' };
      }
      
      // Check for deeply nested routes (3 levels deep) for cases like NewInteraction -> NewInteractionHome
      if (activeRoute?.state?.routes) {
        const deepActiveRoute = activeRoute.state.routes[activeRoute.state.index];
        if (deepActiveRoute?.name && hideOnScreens.includes(deepActiveRoute.name)) {
          return { display: 'none' };
        }
      }
    }
  }
  
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
          const tabBarStyle = getTabBarVisibility(route, theme);
          
          return {
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Wallet") {
              iconName = focused ? "wallet" : "wallet-outline";
            } else if (route.name === "Contacts") {
              iconName = focused ? "people" : "people-outline";
            // } else if (route.name === "Map") {
            //   iconName = focused ? "map" : "map-outline";
            } else if (route.name === "Offers") {
              iconName = focused ? "cash" : "cash-outline";
            }

            return (
              <Ionicons name={iconName as any} size={size} color={color} />
            );
          },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarStyle: tabBarStyle,
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
          listeners={({ navigation, route }) => ({
            tabPress: e => {
              const routeName = getFocusedRouteNameFromRoute(route);
              if (routeName && hideOnScreens.includes(routeName)) {
                navigation.reset({ index: 0, routes: [{ name: route.name }] });
              }
            },
          })}
        />
        <Tab.Screen 
          name="Contacts" 
          component={InteractionsNavigator}
          listeners={({ navigation, route }) => ({
            tabPress: e => {
              const routeName = getFocusedRouteNameFromRoute(route);
              if (routeName && hideOnScreens.includes(routeName)) {
                navigation.reset({ index: 0, routes: [{ name: route.name }] });
              }
            },
          })}
        />
        {/* <Tab.Screen 
          name="Map" 
          component={MapNavigator}
          listeners={({ navigation, route }) => ({
            tabPress: e => {
              const routeName = getFocusedRouteNameFromRoute(route);
              if (routeName && hideOnScreens.includes(routeName)) {
                navigation.reset({ index: 0, routes: [{ name: route.name }] });
              }
            },
          })}
        /> */}
        {/* <Tab.Screen 
          name="Offers" 
          component={OffersNavigator}
          listeners={({ navigation, route }) => ({
            tabPress: e => {
              const routeName = getFocusedRouteNameFromRoute(route);
              if (routeName && hideOnScreens.includes(routeName)) {
                navigation.reset({ index: 0, routes: [{ name: route.name }] });
              }
            },
          })}
        /> */}
      </Tab.Navigator>
    </AuthGuard>
  );
}
