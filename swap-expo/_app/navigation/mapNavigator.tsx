// Created: Added MapNavigator for map feature integration - 2025-01-30

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Import MapScreen (mobile version only for now)
import MapScreen from "../features/map/MapScreen";

// Define the types for the map stack navigator
export type MapStackParamList = {
  MapHome: undefined;
  // Add other map-related screens here as needed
};

const Stack = createNativeStackNavigator<MapStackParamList>();

export default function MapNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MapHome"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="MapHome" component={MapScreen} />
      {/* Add other map-related screens here */}
    </Stack.Navigator>
  );
} 