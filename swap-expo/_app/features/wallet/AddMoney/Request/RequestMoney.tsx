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
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { WalletStackParamList } from "../../../../navigation/walletNavigator";
import logger from "../../../../utils/logger";

type NavigationProp = StackNavigationProp<WalletStackParamList>;
type RequestMoneyRouteProp = RouteProp<WalletStackParamList, "RequestMoney">;

interface RequestMoneyScreenProps {
  onBack?: () => void;
  onInfo?: () => void;
  onContinue?: (amount: number, message: string) => void;
  onSelectContact?: () => void;
  selectedContact?: {
    name: string;
    initial: string;
  };
  sourceAccount?: {
    name: string;
    balance: string;
    initial: string;
    initials?: string;
  };
}

const RequestMoneyScreen: React.FC<RequestMoneyScreenProps> = (props) => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RequestMoneyRouteProp>();

  // Use route params if available, otherwise use props
  const selectedContact = route.params?.selectedContact ||
    props.selectedContact || {
      name: "Mardoche",
      initial: "M",
    };

  const sourceAccount = props.sourceAccount || {
    name: "Main Account",
    balance: "1,00 €",
    initials: "AM",
  };

  const [amount, setAmount] = useState("0");
  const [message, setMessage] = useState("");

  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else {
      navigation.goBack();
    }
  };

  const handleInfo = () => {
    if (props.onInfo) {
      props.onInfo();
    } else {
      // Show info about MoneyBeam
      logger.debug("Show info about MoneyBeam", "navigation");
    }
  };

  const handleSelectContact = () => {
    if (props.onSelectContact) {
      props.onSelectContact();
    } else {
      navigation.navigate("SelectContact");
    }
  };

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
    if (props.onContinue) {
      props.onContinue(parseFloat(amount), message);
    } else {
      // Handle request submission
      logger.debug("Request submitted", "data", {
        amount,
        contact: selectedContact.name,
        message
      });
      navigation.goBack();
    }
  };

  const handleGifPress = () => {
    logger.debug("Opening GIF selector", "navigation");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request a MoneyBeam</Text>
        <TouchableOpacity onPress={handleInfo} style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.transferDetails}>
        <TouchableOpacity
          style={styles.contactContainer}
          onPress={handleSelectContact}
        >
          <View style={styles.contactAvatar}>
            <Text style={styles.contactInitial}>{selectedContact.initial}</Text>
          </View>
          <Text style={styles.contactName}>{selectedContact.name}</Text>
        </TouchableOpacity>

        <View style={styles.arrowContainer}>
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
            <Ionicons
              name="arrow-back"
              size={20}
              color="#fff"
              style={styles.reverseArrow}
            />
          </View>
        </View>

        <View style={styles.accountContainer}>
          <View style={styles.accountAvatar}>
            <Text style={styles.accountInitials}>{sourceAccount.initials}</Text>
          </View>
          <View style={styles.accountTextContainer}>
            <Text style={styles.accountName}>{sourceAccount.name}</Text>
            <Text style={styles.accountBalance}>{sourceAccount.balance}</Text>
          </View>
        </View>
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.amountText}>{amount} €</Text>
      </View>

      <View style={styles.messageContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Write a message 💸 (optional)"
          placeholderTextColor="#999"
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.gifButton} onPress={handleGifPress}>
          <Text style={styles.gifButtonText}>GIF</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
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
  contactContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
  },
  contactInitial: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  contactName: {
    fontSize: 16,
    color: "#fff",
    marginLeft: 12,
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
    position: "relative",
  },
  reverseArrow: {
    position: "absolute",
    top: 8,
    left: 8,
  },
  accountContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  accountAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
  },
  accountInitials: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  accountTextContainer: {
    marginLeft: 12,
  },
  accountName: {
    fontSize: 16,
    color: "#fff",
  },
  accountBalance: {
    fontSize: 14,
    color: "#ccc",
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
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#333",
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
  },
  gifButton: {
    paddingHorizontal: 8,
  },
  gifButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2ecc71",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  continueButton: {
    height: 56,
    borderRadius: 8,
    backgroundColor: "#2ecc71",
    justifyContent: "center",
    alignItems: "center",
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
});

export default RequestMoneyScreen;
