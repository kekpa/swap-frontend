import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "../features/home/HomeScreen";
import { useTheme } from "../theme/ThemeContext";

export type HomeStackParamList = {
  HomeScreen: undefined;
};

const Stack = createStackNavigator<HomeStackParamList>();

export default function HomeNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="HomeScreen"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
      />
    </Stack.Navigator>
  );
}
