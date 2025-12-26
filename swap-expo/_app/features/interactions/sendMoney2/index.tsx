import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SendMoneyScreen from './SendMoneyScreen';
import ReviewTransferScreen from './ReviewTransferScreen';
import TransferCompletedScreen from './TransferCompletedScreen';

export { SendMoneyScreen, ReviewTransferScreen, TransferCompletedScreen };

// Define the parameter types for the navigator
export type SendMoneyStackParamList = {
  SendMoney: {
    toEntityId?: string;
    recipientName?: string;
    recipientInitial?: string;
    recipientColor?: string;
  } | undefined;
  ReviewTransfer: {
    amount: number;
    recipientName: string;
    recipientInitial: string;
    recipientColor: string;
    message: string;
  };
  TransferCompleted: {
    amount: number;
    recipientName: string;
    recipientInitial: string;
    recipientColor: string;
    message: string;
    transactionId: string;
  };
};

const Stack = createStackNavigator<SendMoneyStackParamList>();

/**
 * Navigator component for the send money flow
 */
export const SendMoneyNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="SendMoney" 
        component={SendMoneyScreen as React.ComponentType<any>} 
      />
      <Stack.Screen 
        name="ReviewTransfer" 
        component={ReviewTransferScreen as React.ComponentType<any>} 
      />
      <Stack.Screen 
        name="TransferCompleted" 
        component={TransferCompletedScreen as React.ComponentType<any>} 
      />
    </Stack.Navigator>
  );
};

export default SendMoneyNavigator; 