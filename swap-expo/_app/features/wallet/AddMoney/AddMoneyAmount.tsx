// Copyright 2025 licenser.author
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Keyboard,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AddMoneyAmountScreenProps {
  onBack: () => void;
  onInfo: () => void;
  onContinue: (amount: number) => void;
  onSelectPaymentMethod: () => void;
  selectedPaymentMethod?: "card" | "applePay";
  minAmount?: number;
  feePercentage?: number;
}

const AddMoneyAmountScreen: React.FC<AddMoneyAmountScreenProps> = ({
  onBack,
  onInfo,
  onContinue,
  onSelectPaymentMethod,
  selectedPaymentMethod = "card",
  minAmount = 20,
  feePercentage = 3,
}) => {
  const [amount, setAmount] = useState("0");
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const fee = numericAmount * (feePercentage / 100);
  const formattedFee = fee.toFixed(2);
  const isValidAmount = numericAmount >= minAmount;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setShowKeyboard(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setShowKeyboard(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleNumberPress = (num: string) => {
    if (amount === "0") {
      setAmount(num);
    } else {
      setAmount(amount + num);
    }
  };

  const handleBackspace = () => {
    if (amount.length > 1) {
      setAmount(amount.slice(0, -1));
    } else {
      setAmount("0");
    }
  };

  const handleContinue = () => {
    if (isValidAmount) {
      onContinue(numericAmount);
    }
  };

  const togglePaymentMethods = () => {
    setShowPaymentMethods(!showPaymentMethods);
  };

  const renderAmountScreen = () => {
    return (
      <>
        <View style={styles.amountContainer}>
          <Text style={styles.amountText}>{amount} €</Text>
          {!isValidAmount && numericAmount > 0 && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#e74c3c" />
              <Text style={styles.errorText}>
                Add at least €{minAmount.toFixed(2)}
              </Text>
            </View>
          )}
          {isValidAmount && (
            <Text style={styles.feeText}>
              Fee: {feePercentage}% (€{formattedFee})
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.calendarButton}>
            <Ionicons name="calendar-outline" size={24} color="#2ecc71" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !isValidAmount && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!isValidAmount}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.keypadContainer}>
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handleNumberPress("1")}
            >
              <Text style={styles.keypadButtonText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handleNumberPress("2")}
            >
              <Text style={styles.keypadButtonText}>2</Text>
              <Text style={styles.keypadSubText}>ABC</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handleNumberPress("3")}
            >
              <Text style={styles.keypadButtonText}>3</Text>
              <Text style={styles.keypadSubText}>DEF</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handleNumberPress("4")}
            >
              <Text style={styles.keypadButtonText}>4</Text>
              <Text style={styles.keypadSubText}>GHI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handleNumberPress("5")}
            >
              <Text style={styles.keypadButtonText}>5</Text>
              <Text style={styles.keypadSubText}>JKL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handleNumberPress("6")}
            >
              <Text style={styles.keypadButtonText}>6</Text>
              <Text style={styles.keypadSubText}>MNO</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handleNumberPress("7")}
            >
              <Text style={styles.keypadButtonText}>7</Text>
              <Text style={styles.keypadSubText}>PQRS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handleNumberPress("8")}
            >
              <Text style={styles.keypadButtonText}>8</Text>
              <Text style={styles.keypadSubText}>TUV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handleNumberPress("9")}
            >
              <Text style={styles.keypadButtonText}>9</Text>
              <Text style={styles.keypadSubText}>WXYZ</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.keypadRow}>
            <TouchableOpacity style={styles.keypadButton}>
              <Text style={styles.keypadButtonText}>,</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handleNumberPress("0")}
            >
              <Text style={styles.keypadButtonText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={handleBackspace}
            >
              <Ionicons name="backspace-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };

  const renderPaymentMethodsScreen = () => {
    return (
      <View style={styles.paymentMethodsContainer}>
        <Text style={styles.paymentMethodsTitle}>Select payment method</Text>

        <TouchableOpacity
          style={styles.paymentMethodItem}
          onPress={() => {
            onSelectPaymentMethod();
            setShowPaymentMethods(false);
          }}
        >
          <View style={styles.paymentMethodLeft}>
            <Ionicons name="card-outline" size={24} color="#000" />
            <View style={styles.paymentMethodTextContainer}>
              <Text style={styles.paymentMethodText}>Credit or Debit card</Text>
              <Text style={styles.paymentMethodSubtext}>Top up instantly</Text>
            </View>
          </View>
          <View
            style={[
              styles.paymentMethodRadio,
              selectedPaymentMethod === "card" &&
                styles.paymentMethodRadioSelected,
            ]}
          >
            {selectedPaymentMethod === "card" && (
              <View style={styles.paymentMethodRadioInner} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.paymentMethodItem}
          onPress={() => {
            onSelectPaymentMethod();
            setShowPaymentMethods(false);
          }}
        >
          <View style={styles.paymentMethodLeft}>
            <Image
              source={{ uri: "/placeholder.svg?height=24&width=40" }}
              style={styles.applePayIcon}
            />
            <View style={styles.paymentMethodTextContainer}>
              <Text style={styles.paymentMethodText}>Apple Pay</Text>
              <Text style={styles.paymentMethodSubtext}>Top up instantly</Text>
            </View>
          </View>
          <View
            style={[
              styles.paymentMethodRadio,
              selectedPaymentMethod === "applePay" &&
                styles.paymentMethodRadioSelected,
            ]}
          >
            {selectedPaymentMethod === "applePay" && (
              <View style={styles.paymentMethodRadioInner} />
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add money instantly</Text>
        <TouchableOpacity onPress={onInfo} style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.transferDetails}>
        <View style={styles.sourceContainer}>
          <Ionicons name="card-outline" size={24} color="#fff" />
          <View style={styles.sourceTextContainer}>
            <Text style={styles.sourceText}>Credit or</Text>
            <Text style={styles.sourceText}>Debit card</Text>
          </View>
        </View>

        <View style={styles.arrowContainer}>
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </View>
        </View>

        <View style={styles.destinationContainer}>
          <View style={styles.accountIconContainer}>
            <View style={styles.accountIcon} />
          </View>
          <View style={styles.destinationTextContainer}>
            <Text style={styles.destinationText}>Main Account</Text>
            <Text style={styles.destinationBalance}>€1,00</Text>
          </View>
        </View>
      </View>

      {showPaymentMethods ? renderPaymentMethodsScreen() : renderAmountScreen()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  transferDetails: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  sourceContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sourceTextContainer: {
    marginLeft: 12,
  },
  sourceText: {
    fontSize: 14,
    color: "#fff",
  },
  arrowContainer: {
    paddingHorizontal: 16,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  destinationContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  accountIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#2ecc71",
    justifyContent: "center",
    alignItems: "center",
  },
  accountIcon: {
    width: 16,
    height: 16,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  destinationTextContainer: {
    marginLeft: 12,
  },
  destinationText: {
    fontSize: 14,
    color: "#fff",
  },
  destinationBalance: {
    fontSize: 14,
    color: "#fff",
  },
  amountContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  amountText: {
    fontSize: 64,
    fontWeight: "300",
    color: "#fff",
    marginBottom: 16,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#e74c3c",
    marginLeft: 4,
  },
  feeText: {
    fontSize: 14,
    color: "#999",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  calendarButton: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  continueButton: {
    flex: 1,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#2ecc71",
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonDisabled: {
    backgroundColor: "#1e7e45",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  keypadContainer: {
    paddingBottom: 24,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  keypadButton: {
    flex: 1,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#333",
    margin: 1,
    borderRadius: 4,
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: "500",
    color: "#fff",
  },
  keypadSubText: {
    fontSize: 10,
    color: "#999",
  },
  paymentMethodsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  paymentMethodsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 24,
  },
  paymentMethodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  paymentMethodLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  paymentMethodTextContainer: {
    marginLeft: 16,
  },
  paymentMethodText: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 4,
  },
  paymentMethodSubtext: {
    fontSize: 14,
    color: "#999",
  },
  paymentMethodRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#666",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentMethodRadioSelected: {
    borderColor: "#2ecc71",
  },
  paymentMethodRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2ecc71",
  },
  applePayIcon: {
    width: 40,
    height: 24,
  },
});

export default AddMoneyAmountScreen;
