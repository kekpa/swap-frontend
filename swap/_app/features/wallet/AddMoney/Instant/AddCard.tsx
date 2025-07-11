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
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { ProfileStackParamList } from "../../../../navigation/profileNavigator";

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

interface AddCardScreenProps {
  onBack?: () => void;
  onClose?: () => void;
  onContinue?: (cardDetails: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
  }) => void;
}

const AddCardScreen: React.FC<AddCardScreenProps> = (props) => {
  const navigation = useNavigation<NavigationProp>();

  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [activeField, setActiveField] = useState<string | null>(null);

  const formatCardNumber = (text: string) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, "");
    // Limit to 16 digits
    const trimmed = cleaned.substring(0, 16);
    return trimmed;
  };

  const formatExpiryDate = (text: string) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, "");
    // Limit to 4 digits
    const trimmed = cleaned.substring(0, 4);

    // Format as MM/YY
    if (trimmed.length > 2) {
      return `${trimmed.substring(0, 2)}/${trimmed.substring(2)}`;
    }
    return trimmed;
  };

  const handleNumberPress = (num: string) => {
    if (activeField === "cardNumber") {
      setCardNumber(formatCardNumber(cardNumber + num));
    } else if (activeField === "expiryDate") {
      setExpiryDate(formatExpiryDate(expiryDate.replace("/", "") + num));
    } else if (activeField === "cvv") {
      if (cvv.length < 3) {
        setCvv(cvv + num);
      }
    }
  };

  const handleBackspace = () => {
    if (activeField === "cardNumber" && cardNumber.length > 0) {
      setCardNumber(cardNumber.slice(0, -1));
    } else if (activeField === "expiryDate" && expiryDate.length > 0) {
      const cleaned = expiryDate.replace("/", "");
      setExpiryDate(formatExpiryDate(cleaned.slice(0, -1)));
    } else if (activeField === "cvv" && cvv.length > 0) {
      setCvv(cvv.slice(0, -1));
    }
  };

  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else {
      navigation.goBack();
    }
  };

  const handleClose = () => {
    if (props.onClose) {
      props.onClose();
    } else {
      navigation.goBack();
    }
  };

  const handleContinue = () => {
    const cardDetails = {
      cardNumber,
      expiryDate,
      cvv,
      cardholderName,
    };

    if (props.onContinue) {
      props.onContinue(cardDetails);
    } else {
      // Show success message and return to previous screen
      Alert.alert(
        "Card Added",
        "Your card has been successfully added to your account.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    }
  };

  const isFormValid = () => {
    return (
      cardNumber.length === 16 &&
      expiryDate.length === 5 &&
      cvv.length === 3 &&
      cardholderName.trim().length > 0
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#6200ee" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add card</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.formContainer}>
          <TouchableOpacity
            style={[
              styles.inputContainer,
              activeField === "cardNumber" && styles.activeInput,
            ]}
            onPress={() => setActiveField("cardNumber")}
          >
            <TextInput
              style={styles.input}
              placeholder="Card number"
              placeholderTextColor="#999"
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              keyboardType="number-pad"
              maxLength={16}
              editable={false}
            />
          </TouchableOpacity>

          <View style={styles.rowContainer}>
            <TouchableOpacity
              style={[
                styles.inputContainer,
                styles.halfInput,
                activeField === "expiryDate" && styles.activeInput,
              ]}
              onPress={() => setActiveField("expiryDate")}
            >
              <TextInput
                style={styles.input}
                placeholder="MM/YY"
                placeholderTextColor="#999"
                value={expiryDate}
                onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                keyboardType="number-pad"
                maxLength={5}
                editable={false}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.inputContainer,
                styles.halfInput,
                activeField === "cvv" && styles.activeInput,
              ]}
              onPress={() => setActiveField("cvv")}
            >
              <TextInput
                style={styles.input}
                placeholder="CVV"
                placeholderTextColor="#999"
                value={cvv}
                onChangeText={(text) =>
                  setCvv(text.replace(/\D/g, "").substring(0, 3))
                }
                keyboardType="number-pad"
                maxLength={3}
                editable={false}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.inputContainer,
              activeField === "cardholderName" && styles.activeInput,
            ]}
            onPress={() => setActiveField("cardholderName")}
          >
            <TextInput
              style={styles.input}
              placeholder="Cardholder name"
              placeholderTextColor="#999"
              value={cardholderName}
              onChangeText={setCardholderName}
              autoCapitalize="words"
            />
          </TouchableOpacity>

          <View style={styles.cardBrandsContainer}>
            <Image
              source={{
                uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png",
              }}
              style={styles.cardBrandLogo}
              resizeMode="contain"
            />
            <Image
              source={{
                uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png",
              }}
              style={styles.cardBrandLogo}
              resizeMode="contain"
            />
            <Image
              source={{
                uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Maestro_logo.svg/1280px-Maestro_logo.svg.png",
              }}
              style={styles.cardBrandLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.securityContainer}>
            <Ionicons name="lock-closed" size={16} color="#4CAF50" />
            <Text style={styles.securityText}>
              Protected with PCI Data Security Standard
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            !isFormValid() && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!isFormValid()}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

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
          <View style={styles.keypadButton} />
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
            <Ionicons name="backspace-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  closeButton: {
    paddingHorizontal: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#6200ee",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  activeInput: {
    borderColor: "#6200ee",
    borderWidth: 2,
  },
  input: {
    fontSize: 16,
    color: "#000",
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
  cardBrandsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  cardBrandLogo: {
    width: 50,
    height: 30,
    marginRight: 16,
  },
  securityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  securityText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  continueButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6200ee",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  continueButtonDisabled: {
    backgroundColor: "#b39ddb",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  keypadContainer: {
    backgroundColor: "#e0e0e0",
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
    backgroundColor: "#fff",
    margin: 1,
    borderRadius: 4,
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: "500",
    color: "#000",
  },
  keypadSubText: {
    fontSize: 10,
    color: "#666",
  },
});

export default AddCardScreen;
