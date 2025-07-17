import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ShopScreen from "../features/shop/ShopScreen";

// Define the types for the shop stack navigator
export type ShopStackParamList = {
  ShopHome: undefined;
  ProductDetails: {
    productId?: string;
    productName?: string;
  };
  StoreDetails: {
    storeId?: string;
    storeName?: string;
  };
};

const Stack = createNativeStackNavigator<ShopStackParamList>();

export default function ShopNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ShopHome"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ShopHome" component={ShopScreen} />
      {/* Future screens for product and store details */}
    </Stack.Navigator>
  );
}