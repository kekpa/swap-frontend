import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NewInteraction2 from "../../features/interactions/NewInteraction2";

// Use a placeholder component until replacements are implemented
const PlaceholderScreen = () => <React.Fragment />;

// Define the types for the new transfer stack navigator
export type NewInteractionStackParamList = {
  NewInteractionHome: undefined;
  AddBankRecipient: undefined;
  ScheduleTransfer: undefined;
  TransferAmount: {
    recipient: {
      id: string;
      name: string;
      initials: string;
      info: string;
      isVerified?: boolean;
    };
  };
  TransferSuccess: {
    transactionId: string;
    amount: number;
    currency: string;
    recipient: {
      id: string;
      name: string;
      initials: string;
      info: string;
      isVerified?: boolean;
    };
  };
  // Add other transfer-related screens here
};

const Stack = createNativeStackNavigator<NewInteractionStackParamList>();

const NewInteractionNavigator: React.FC = () => {
  console.log("Rendering NewInteractionNavigator");

  return (
    <Stack.Navigator
      initialRouteName="NewInteractionHome"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="NewInteractionHome" component={NewInteraction2} />
      <Stack.Screen 
        name="ScheduleTransfer" 
        component={PlaceholderScreen}
        options={{
          animation: "slide_from_bottom",
          presentation: "modal",
        }}
      />
      <Stack.Screen name="TransferSuccess" component={PlaceholderScreen} />
    </Stack.Navigator>
  );
};

export default NewInteractionNavigator;
