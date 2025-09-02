import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
} from "react-native";
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { WalletStackParamList } from "../navigation/walletNavigator";

type NavigationProp = StackNavigationProp<WalletStackParamList>;
type CurrencySelectRouteProp = RouteProp<
  WalletStackParamList,
  "CurrencySelect"
>;

interface Currency {
  code: string;
  name: string;
  flag: string;
  balance?: string;
  symbol?: string;
}

const CurrencySelectionModal: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CurrencySelectRouteProp>();
  const [searchQuery, setSearchQuery] = useState("");

  const currencyType = route.params?.currencyType || "from";
  const selectedCurrencyCode = route.params?.selectedCurrencyCode;

  // Sample currency data
  const currencies: Currency[] = [
    { code: "EUR", name: "Euro", flag: "🇪🇺", balance: "434,74", symbol: "€" },
    { code: "USD", name: "US Dollar", flag: "🇺🇸", balance: "0", symbol: "$" },
    {
      code: "AED",
      name: "United Arab Emirates Dirham",
      flag: "🇦🇪",
      balance: "0",
      symbol: "د.إ",
    },
    {
      code: "AUD",
      name: "Australian Dollar",
      flag: "🇦🇺",
      balance: "0",
      symbol: "A$",
    },
    {
      code: "BGN",
      name: "Bulgarian Lev",
      flag: "🇧🇬",
      balance: "0",
      symbol: "лв",
    },
    {
      code: "CAD",
      name: "Canadian Dollar",
      flag: "🇨🇦",
      balance: "0",
      symbol: "C$",
    },
    {
      code: "CHF",
      name: "Swiss Franc",
      flag: "🇨🇭",
      balance: "0",
      symbol: "Fr",
    },
    {
      code: "CZK",
      name: "Czech Koruna",
      flag: "🇨🇿",
      balance: "0",
      symbol: "Kč",
    },
    {
      code: "DKK",
      name: "Danish Krone",
      flag: "🇩🇰",
      balance: "0",
      symbol: "kr",
    },
    {
      code: "GBP",
      name: "British Pound",
      flag: "🇬🇧",
      balance: "0",
      symbol: "£",
    },
  ];

  // Filter currencies based on search query
  const filteredCurrencies = currencies.filter((currency) => {
    const query = searchQuery.toLowerCase();
    return (
      currency.code.toLowerCase().includes(query) ||
      currency.name.toLowerCase().includes(query)
    );
  });

  const handleSelectCurrency = (currency: Currency) => {
    // Navigate back with the selected currency
    navigation.navigate({
      name: "CurrencyExchange",
      params: {
        selectedCurrency: currency,
        currencyType: currencyType,
      },
      merge: true,
    });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const renderCurrencyItem = ({ item }: { item: Currency }) => {
    const isSelected = item.code === selectedCurrencyCode;

    return (
      <TouchableOpacity
        style={styles.currencyItem}
        onPress={() => handleSelectCurrency(item)}
      >
        <View style={styles.currencyInfo}>
          <Text style={styles.currencyFlag}>{item.flag}</Text>
          <View style={styles.currencyNameContainer}>
            <Text style={styles.currencyCode}>{item.code}</Text>
            <Text style={styles.currencyName}>{item.name}</Text>
          </View>
        </View>

        <View style={styles.rightContainer}>
          {item.balance && (
            <Text style={styles.balanceText}>
              {item.balance} {item.symbol}
            </Text>
          )}
          {isSelected && (
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark" size={18} color="white" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose currency</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <FlashList
        data={filteredCurrencies}
        renderItem={renderCurrencyItem}
        keyExtractor={(item) => item.code}
        estimatedItemSize={70}
        style={styles.currencyList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
    height: 40,
  },
  cancelButton: {
    marginLeft: 12,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: "#4a90e2",
    fontSize: 16,
  },
  currencyList: {
    flex: 1,
  },
  currencyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#1e1e1e",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  currencyInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencyFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  currencyNameContainer: {
    flexDirection: "column",
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  currencyName: {
    fontSize: 14,
    color: "#999",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceText: {
    fontSize: 14,
    color: "white",
    marginRight: 8,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4a90e2",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CurrencySelectionModal;
