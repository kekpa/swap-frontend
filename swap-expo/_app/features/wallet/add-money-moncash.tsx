import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Switch,
  ScrollView,
  Modal,
} from "react-native";
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useAuthContext } from "../auth/context/AuthContext";
import { useBalances } from "../../query/hooks/useBalances";
import apiClient from "../../_api/apiClient";
import logger from "../../utils/logger";
import { MonCashWebView } from "./components";
import { Ionicons } from "@expo/vector-icons";
import { WalletStackParamList } from "../../navigation/walletNavigator";
import { useRefresh } from "../../contexts/RefreshContext";

// Define the navigation types
type NavigationProp = StackNavigationProp<WalletStackParamList, "AddMoney">;

// Currency interface
interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_fiat: boolean;
}

// Payment status interface
interface PaymentStatus {
  status: "pending" | "processing" | "completed" | "failed";
  message: string;
  transactionId?: string;
  orderId?: string;
}

export default function AddMoneyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const auth = useAuthContext();
  // TanStack Query hook for balances - replaces useData()
  const { 
    data: currencyBalances = [], 
    refetch: refreshBalances 
  } = useBalances(auth.user?.entityId || '');
  const refreshManager = useRefresh();

  if (!auth) {
    throw new Error("Auth context is undefined");
  }

  const { user, getAccessToken } = auth;

  // State management
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [useMockPayment, setUseMockPayment] = useState(true); // Default to mock payment for testing
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
    null
  );
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(
    null
  );
  const [showPaymentStatus, setShowPaymentStatus] = useState(false);

  // Fetch available currencies
  useEffect(() => {
    if (currencyBalances.length > 0) {
      try {
        setLoadingCurrencies(true);

        // Process currencies from DataContext
        const mappedCurrencies = currencyBalances.map((balance, index) => ({
          id: `currency-${index}`,
          code: balance.code,
          name: balance.code,
          symbol: balance.symbol,
          is_fiat: true,
        }));

        setCurrencies(mappedCurrencies);

        logger.debug(
          `Using ${mappedCurrencies.length} currencies from DataContext`,
          "currencies"
        );

        // Set default currency
        const defaultCurrency =
          mappedCurrencies.find((c) => c.code === "USD") ||
          (mappedCurrencies.length > 0 ? mappedCurrencies[0] : null);

        setSelectedCurrency(defaultCurrency);
        setLoadingCurrencies(false);
      } catch (error) {
        logger.error("Error setting up currencies:", error);
        setError("Failed to set up currencies. Please try again later.");
        setLoadingCurrencies(false);
      }
    }
  }, [currencyBalances]);

  // Handle the mock payment process
  const handleMockPayment = async (fiatAmount: number) => {
    try {
      setLoading(true);
      setError("");

      // Get token for authorization
      const token = await getAccessToken();

      // Call the mock payment endpoint
      const response = await apiClient.post(
        "/mock-payments/create",
        {
          amount: fiatAmount,
          currencyCode: selectedCurrency?.code,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Profile-ID": user?.profileId,
          },
        }
      );

      logger.debug(
        `Mock payment response: ${JSON.stringify(response.data)}`,
        "payments"
      );

      // Set payment status
      setPaymentStatus({
        status: "completed",
        message: "Your payment has been processed successfully",
        transactionId: response.data.transactionId,
        orderId: response.data.orderId,
      });

      setShowPaymentStatus(true);
      setLoading(false);

      // Refresh balances
      refreshBalances();
      refreshManager?.refreshAll(false);
    } catch (error: any) {
      logger.error("Error processing mock payment:", error);

      setPaymentStatus({
        status: "failed",
        message:
          error.response?.data?.message ||
          "Failed to process payment. Please try again.",
      });

      setShowPaymentStatus(true);
      setLoading(false);
    }
  };

  // Handle the real payment process
  const handleRealPayment = async (fiatAmount: number) => {
    try {
      setLoading(true);
      setError("");

      // Get token for authorization
      const token = await getAccessToken();

      // Call the real payment endpoint
      const response = await apiClient.post(
        "/payments/create",
        {
          amount: fiatAmount,
          currencyCode: selectedCurrency?.code,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Profile-ID": user?.profileId,
          },
        }
      );

      logger.debug(
        `Payment creation response: ${JSON.stringify(response.data)}`,
        "payments"
      );

      // Set payment URL from response
      setPaymentUrl(response.data.paymentUrl);
      setLoading(false);
    } catch (error: any) {
      logger.error("Error processing payment:", error);
      setError(
        error.response?.data?.message ||
          "Failed to process payment. Please try again."
      );
      setLoading(false);
    }
  };

  // Handle the add money process
  const handleAddMoney = async () => {
    try {
      if (!selectedCurrency) {
        setError("Please select a currency");
        return;
      }

      setLoading(true);
      setError("");

      // Validate amount (basic client-side validation)
      const fiatAmount = parseFloat(amount);
      if (isNaN(fiatAmount) || fiatAmount <= 0) {
        setError("Please enter a valid amount");
        setLoading(false);
        return;
      }

      // Check min/max amount
      const minAmount = getMinAmount();
      const maxAmount = getMaxAmount();

      if (fiatAmount < minAmount) {
        setError(`Minimum amount is ${minAmount} ${selectedCurrency.code}`);
        setLoading(false);
        return;
      }

      if (fiatAmount > maxAmount) {
        setError(`Maximum amount is ${maxAmount} ${selectedCurrency.code}`);
        setLoading(false);
        return;
      }

      // Process payment based on mode
      if (useMockPayment) {
        await handleMockPayment(fiatAmount);
      } else {
        await handleRealPayment(fiatAmount);
      }
    } catch (error: any) {
      logger.error("Error processing payment:", error);
      setError(
        error.response?.data?.message ||
          "Failed to process payment. Please try again."
      );
      setLoading(false);
    }
  };

  // Function to cancel the payment process
  const cancelPaymentProcess = () => {
    setPaymentUrl(null);
    setLoading(false);
    setError("");
  };

  // Function to handle successful payment
  const handlePaymentSuccess = () => {
    setPaymentUrl(null);

    // Refresh balances
    refreshBalances();
    refreshManager?.refreshAll(false);

    // Navigate back to wallet
    navigation.navigate("WalletHome");
  };

  // Function to close payment status modal
  const closePaymentStatus = () => {
    setShowPaymentStatus(false);

    if (paymentStatus?.status === "completed") {
      // Navigate back to wallet on success
      navigation.navigate("WalletHome");
    }
  };

  // Function to go back to wallet screen
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Get min/max amount based on selected currency
  const getMinAmount = () => {
    if (!selectedCurrency) return 5;
    return selectedCurrency.code === "USD" ? 1 : 5;
  };

  const getMaxAmount = () => {
    if (!selectedCurrency) return 10000;
    return selectedCurrency.code === "USD" ? 100 : 10000;
  };

  // Function to toggle currency modal
  const toggleCurrencyModal = () => {
    setShowCurrencyModal(!showCurrencyModal);
  };

  // Function to select currency from modal
  const selectCurrency = (currency: Currency) => {
    setSelectedCurrency(currency);
    setShowCurrencyModal(false);
  };

  // Render the payment form or WebView
  return (
    <View style={styles.container}>
      {paymentUrl ? (
        // Show MonCash WebView when payment URL is available
        <MonCashWebView
          paymentUrl={paymentUrl}
          onCancel={cancelPaymentProcess}
          onSuccess={handlePaymentSuccess}
        />
      ) : (
        // Show amount input form
        <ScrollView style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Add Money</Text>
            <View style={styles.placeholder} />
          </View>

          {loadingCurrencies ? (
            <ActivityIndicator
              size="large"
              color="#4CAF50"
              style={styles.loader}
            />
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Currency</Text>

                {/* Simple Currency Dropdown Button */}
                <TouchableOpacity
                  style={styles.currencyButton}
                  onPress={toggleCurrencyModal}
                  disabled={loading}
                >
                  <Text style={styles.currencyButtonText}>
                    {selectedCurrency
                      ? `${selectedCurrency.code} (${selectedCurrency.symbol})`
                      : "Select Currency"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#555" />
                </TouchableOpacity>

                {/* Simple Currency Selection Modal */}
                <Modal
                  visible={showCurrencyModal}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowCurrencyModal(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.centeredModalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Currency</Text>
                        <TouchableOpacity
                          onPress={() => setShowCurrencyModal(false)}
                        >
                          <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                      </View>

                      {currencies.length === 0 ? (
                        <View style={styles.noCurrenciesContainer}>
                          <Text style={styles.noCurrenciesText}>
                            Loading currencies...
                          </Text>
                        </View>
                      ) : (
                        <FlashList
                          data={currencies}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[
                                styles.currencyOption,
                                selectedCurrency?.id === item.id &&
                                  styles.selectedCurrencyOption,
                              ]}
                              onPress={() => selectCurrency(item)}
                            >
                              <Text style={styles.currencyOptionText}>
                                {item.code} ({item.symbol})
                              </Text>
                              {selectedCurrency?.id === item.id && (
                                <Ionicons
                                  name="checkmark"
                                  size={20}
                                  color="#4CAF50"
                                />
                              )}
                            </TouchableOpacity>
                          )}
                          estimatedItemSize={50}
                          ItemSeparatorComponent={() => (
                            <View style={styles.separator} />
                          )}
                        />
                      )}
                    </View>
                  </View>
                </Modal>

                <Text style={styles.label}>
                  Amount {selectedCurrency?.symbol}
                </Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={`Enter amount in ${
                    selectedCurrency?.code || "currency"
                  }`}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  • Minimum amount: {getMinAmount()} {selectedCurrency?.code}
                </Text>
                <Text style={styles.infoText}>
                  • Maximum amount: {getMaxAmount()} {selectedCurrency?.code}
                </Text>
                <Text style={styles.infoText}>
                  • Funds will be available immediately after payment
                  confirmation
                </Text>
              </View>

              {/* Mock payment toggle for testing */}
              <View style={styles.mockPaymentContainer}>
                <Text style={styles.mockPaymentText}>
                  Use Mock Payment (Testing)
                </Text>
                <Switch
                  value={useMockPayment}
                  onValueChange={setUseMockPayment}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={useMockPayment ? "#4CAF50" : "#f4f3f4"}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.addButton,
                  loading && styles.disabledButton,
                  useMockPayment && styles.mockButton,
                ]}
                onPress={handleAddMoney}
                disabled={loading || !selectedCurrency}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {useMockPayment
                        ? "Process Mock Payment"
                        : `Pay with ${
                            selectedCurrency?.code || "Selected Currency"
                          }`}
                    </Text>
                    <Text style={styles.moncashLogo}>
                      {useMockPayment ? "🧪" : "💰"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* Payment Status Modal */}
      <Modal
        visible={showPaymentStatus}
        transparent={true}
        animationType="fade"
        onRequestClose={closePaymentStatus}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentStatusModal}>
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  paymentStatus?.status === "completed"
                    ? styles.successTitle
                    : paymentStatus?.status === "failed"
                    ? styles.errorTitle
                    : styles.processingTitle,
                ]}
              >
                {paymentStatus?.status === "completed"
                  ? "Payment Successful"
                  : paymentStatus?.status === "failed"
                  ? "Payment Failed"
                  : "Processing Payment"}
              </Text>
            </View>

            <View style={styles.paymentStatusContent}>
              {paymentStatus?.status === "completed" && (
                <Ionicons
                  name="checkmark-circle"
                  size={60}
                  color="#4CAF50"
                  style={styles.statusIcon}
                />
              )}

              {paymentStatus?.status === "failed" && (
                <Ionicons
                  name="close-circle"
                  size={60}
                  color="#F44336"
                  style={styles.statusIcon}
                />
              )}

              {(paymentStatus?.status === "pending" ||
                paymentStatus?.status === "processing") && (
                <ActivityIndicator
                  size="large"
                  color="#4CAF50"
                  style={styles.statusIcon}
                />
              )}

              <Text style={styles.paymentStatusMessage}>
                {paymentStatus?.message}
              </Text>

              {paymentStatus?.transactionId && (
                <Text style={styles.paymentStatusDetail}>
                  Transaction ID: {paymentStatus.transactionId}
                </Text>
              )}

              {amount && selectedCurrency && (
                <Text style={styles.paymentStatusDetail}>
                  Amount: {selectedCurrency.symbol}
                  {amount}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.paymentStatusButton,
                paymentStatus?.status === "completed"
                  ? styles.successButton
                  : paymentStatus?.status === "failed"
                  ? styles.errorButton
                  : styles.processingButton,
              ]}
              onPress={closePaymentStatus}
            >
              <Text style={styles.paymentStatusButtonText}>
                {paymentStatus?.status === "completed"
                  ? "Done"
                  : paymentStatus?.status === "failed"
                  ? "Try Again"
                  : "Close"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    position: "relative",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 0,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  placeholder: {
    width: 40, // Same width as back button for balanced layout
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  inputContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#555",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  currencyButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  currencyButtonText: {
    fontSize: 16,
    color: "#333",
  },
  errorText: {
    color: "red",
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  infoContainer: {
    backgroundColor: "#e8f4fd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    marginHorizontal: 20,
  },
  infoText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
  },
  mockPaymentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginHorizontal: 20,
  },
  mockPaymentText: {
    fontSize: 14,
    color: "#555",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
    marginHorizontal: 20,
  },
  disabledButton: {
    backgroundColor: "#a5d6a7",
  },
  mockButton: {
    backgroundColor: "#5C6BC0", // Different color for mock payment
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
  },
  moncashLogo: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  loader: {
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  centeredModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "80%",
    maxHeight: "70%",
    padding: 0,
    overflow: "hidden",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  currencyOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  currencyOptionText: {
    fontSize: 16,
    color: "#333",
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
  },
  noCurrenciesContainer: {
    padding: 20,
    alignItems: "center",
  },
  noCurrenciesText: {
    fontSize: 16,
    color: "#666",
  },
  selectedCurrencyOption: {
    backgroundColor: "#f0f9f0",
  },
  // Payment Status Modal Styles
  paymentStatusModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "85%",
    padding: 0,
    overflow: "hidden",
  },
  paymentStatusContent: {
    padding: 20,
    alignItems: "center",
  },
  statusIcon: {
    marginBottom: 15,
  },
  paymentStatusMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
    color: "#333",
  },
  paymentStatusDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  paymentStatusButton: {
    padding: 15,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  paymentStatusButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  successTitle: {
    color: "#4CAF50",
  },
  errorTitle: {
    color: "#F44336",
  },
  processingTitle: {
    color: "#2196F3",
  },
  successButton: {
    backgroundColor: "#4CAF50",
  },
  errorButton: {
    backgroundColor: "#F44336",
  },
  processingButton: {
    backgroundColor: "#2196F3",
  },
});
