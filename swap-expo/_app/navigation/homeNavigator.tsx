import React from "react";
import { View, Alert, StyleSheet } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import HomeScreenV3 from "../features/home/HomeScreenV3";
import MyRoscasScreen from "../features/rosca/MyRoscasScreen";
import RoscaDetailScreen from "../features/rosca/RoscaDetailScreen";
import JoinRoscaScreen from "../features/rosca/JoinRoscaScreen";
import RoscaCalendarScreen from "../features/rosca/RoscaCalendarScreen";
import QuickActionsRowV2 from "../features/home/components/QuickActionsRowV2";
import type { RoscaEnrollment } from "../types/rosca.types";

export type HomeStackParamList = {
  HomeScreen: undefined;
  MyRoscasScreen: { tab?: 'active' | 'completed' } | undefined;
  RoscaDetailScreen: { enrollment: RoscaEnrollment };
  JoinRoscaScreen: { rosca?: any; isExpired?: boolean } | undefined;
  RoscaCalendarScreen: undefined;
};

const Stack = createStackNavigator<HomeStackParamList>();

// Create a ref to access the Stack navigator from outside
let stackNavigationRef: any = null;

export default function HomeNavigator() {
  const navigation = useNavigation();

  // Quick actions handlers
  // For root-level screens (modals), use parent navigation
  // For Home stack screens, use the stack ref
  const handleAdd = () => {
    (navigation as any).navigate('AddMoneyModal');
  };

  const handleSend = () => {
    (navigation as any).navigate('NewInteraction');
  };

  const handleQR = () => {
    Alert.alert('QR Scanner', 'Coming soon!');
  };

  const handleCalendar = () => {
    // Navigate within Home stack using the stack ref
    stackNavigationRef?.navigate('RoscaCalendarScreen');
  };

  const handleProfile = () => {
    (navigation as any).navigate('ProfileModal');
  };

  return (
    <View style={styles.container}>
      {/* Screen content - animates during transitions */}
      <View style={styles.content}>
        <Stack.Navigator
          initialRouteName="HomeScreen"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
          }}
          screenListeners={({ navigation: stackNav }) => {
            // Capture the stack navigation ref so quick actions can use it
            stackNavigationRef = stackNav;
            return {};
          }}
        >
          <Stack.Screen name="HomeScreen" component={HomeScreenV3} />
          <Stack.Screen name="MyRoscasScreen" component={MyRoscasScreen} />
          <Stack.Screen name="RoscaDetailScreen" component={RoscaDetailScreen} />
          <Stack.Screen name="JoinRoscaScreen" component={JoinRoscaScreen} />
          <Stack.Screen name="RoscaCalendarScreen" component={RoscaCalendarScreen} />
        </Stack.Navigator>
      </View>

      {/* Quick actions - fixed at bottom, never animates */}
      <QuickActionsRowV2
        onAddPress={handleAdd}
        onSendPress={handleSend}
        onQRPress={handleQR}
        onCalendarPress={handleCalendar}
        onProfilePress={handleProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
