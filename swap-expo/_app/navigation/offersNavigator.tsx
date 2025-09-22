import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DashboardScreen from "../features/offers/Dashboard";
import OffersDiscoveryScreen from "../features/offers/OffersDiscovery";
import OffersDiscoveryRedesignedScreen from "../features/offers/OffersDiscoveryRedesigned";
import OfferDetailsScreen from "../features/offers/OfferDetails";
import ChallengesScreen from "../features/offers/Challenges";

// Define the types for the offers stack navigator
export type OffersStackParamList = {
  OffersHome: undefined;
  OffersDiscovery: undefined;
  OffersDiscoveryRedesigned: undefined;
  OfferDetails: {
    merchantId?: string;
    merchantName?: string;
    offerId?: string;
    offerTitle?: string;
  };
  Challenges: undefined;
};

const Stack = createNativeStackNavigator<OffersStackParamList>();

export default function OffersNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="OffersDiscoveryRedesigned"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="OffersHome" component={DashboardScreen} />
      <Stack.Screen name="OffersDiscovery" component={OffersDiscoveryScreen} />
      <Stack.Screen name="OffersDiscoveryRedesigned" component={OffersDiscoveryRedesignedScreen} />
      <Stack.Screen name="OfferDetails" component={OfferDetailsScreen} />
      <Stack.Screen name="Challenges" component={ChallengesScreen} />
    </Stack.Navigator>
  );
} 