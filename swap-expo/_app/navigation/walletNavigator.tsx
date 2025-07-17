import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WalletScreen from "../features/wallet/wallet2";
import AddMoneyScreen from "../features/wallet/add-money-moncash";
import AddMoneyOptionsScreen from "../features/wallet/AddMoney/AddMoneyOptions";
import TempAddMoneyScreen from "../features/wallet/AddMoney/AddMoney2/TempAddMoney";
import AddCardScreen from "../features/wallet/AddMoney/Instant/AddCard";
import BankTransferDetailsScreen from "../features/wallet/AddMoney/BankTransfer/BankTransferDetails";
import RequestMoneyScreen from "../features/wallet/AddMoney/Request/RequestMoney";
import ReferralProgramScreen from "../features/interactions/referralsTransfers/ReferralProgram";
import CurrencySelectionModal from "../components/CurrencySelectionModal";
import TransactionListScreen from "../features/wallet/TransactionListScreen";

// Use a placeholder component until a replacement is implemented
const PlaceholderScreen = () => <React.Fragment />;

// Define the types for the wallet stack navigator
export type WalletStackParamList = {
  WalletHome: undefined;
  AddMoney: undefined;
  AddMoneyOptions: undefined;
  TempAddMoney: undefined;
  AddCard: undefined;
  BankTransferDetails: undefined;
  AccountSelector: undefined;
  RequestMoney: {
    selectedContact?: {
      id: string;
      name: string;
      initial: string;
    };
  };
  ReferralProgram: undefined;
  OnboardingStatus: undefined;
  TransactionList: undefined;
  CurrencyExchange: {
    selectedCurrency?: {
      code: string;
      name: string;
      flag: string;
      balance?: string;
      symbol?: string;
    };
    currencyType?: "from" | "to";
  };
  CurrencySelect: {
    currencyType: "from" | "to";
    selectedCurrencyCode?: string;
  };
  CurrencyExchangeReview: {
    fromCurrency: {
      code: string;
      symbol: string;
      flag: string;
    };
    toCurrency: {
      code: string;
      symbol: string;
      flag: string;
    };
    amount: string;
    exchangeRate: number;
    exchangedAmount: string;
  };
  AddWidget: undefined;
  // Add other wallet-related screens here
};

const Stack = createNativeStackNavigator<WalletStackParamList>();

export default function WalletNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="WalletHome"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="WalletHome" component={WalletScreen} />
      <Stack.Screen name="AddMoney" component={AddMoneyScreen} />
      <Stack.Screen name="AddMoneyOptions" component={AddMoneyOptionsScreen} />
      <Stack.Screen 
        name="TempAddMoney" 
        component={TempAddMoneyScreen}
        options={{
          animation: "slide_from_bottom",
          presentation: "modal",
        }}
      />
      <Stack.Screen name="AddCard" component={AddCardScreen} />
      <Stack.Screen
        name="BankTransferDetails"
        component={BankTransferDetailsScreen}
      />
      <Stack.Screen name="AccountSelector" component={PlaceholderScreen} />
      <Stack.Screen name="RequestMoney" component={RequestMoneyScreen} />
      <Stack.Screen name="ReferralProgram" component={ReferralProgramScreen} />
      <Stack.Screen
        name="CurrencySelect"
        component={CurrencySelectionModal}
        options={{
          animation: "slide_from_bottom",
          presentation: "modal",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="TransactionList"
        component={TransactionListScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      {/* Add other wallet-related screens here */}
    </Stack.Navigator>
  );
}
