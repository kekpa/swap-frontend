import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { WalletStackParamList } from "../../../navigation/walletNavigator";

type NavigationProp = StackNavigationProp<WalletStackParamList>;

interface AddMoneyOptionsScreenProps {
  onClose?: () => void;
  onSelectApplePay?: () => void;
  onAddCard?: () => void;
  onAddBankAccount?: () => void;
  onBankTransfer?: () => void;
  onRequestFromFriend?: () => void;
  onSwitchSalary?: () => void;
}

const AddMoneyOptionsScreen: React.FC<AddMoneyOptionsScreenProps> = ({
  onClose,
  onSelectApplePay,
  onAddCard,
  onAddBankAccount,
  onBankTransfer,
  onRequestFromFriend,
  onSwitchSalary,
}) => {
  const navigation = useNavigation<NavigationProp>();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  const handleAddCard = () => {
    if (onAddCard) {
      onAddCard();
    } else {
      navigation.navigate("AddCard");
    }
  };

  const handleSelectApplePay = () => {
    if (onSelectApplePay) {
      onSelectApplePay();
    }
  };

  const handleAddBankAccount = () => {
    if (onAddBankAccount) {
      onAddBankAccount();
    }
  };

  const handleBankTransfer = () => {
    if (onBankTransfer) {
      onBankTransfer();
    } else {
      navigation.navigate("BankTransferDetails");
    }
  };

  const handleRequestFromFriend = () => {
    if (onRequestFromFriend) {
      onRequestFromFriend();
    } else {
      navigation.navigate("RequestMoney", {});
    }
  };

  const handleSwitchSalary = () => {
    if (onSwitchSalary) {
      onSwitchSalary();
    }
  };

  const handleAskAgent = () => {
    navigation.navigate("TempAddMoney");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add money</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Instant top-up</Text>

        <TouchableOpacity
          style={styles.optionItem}
          onPress={handleSelectApplePay}
        >
          <View style={styles.optionIconContainer}>
            <Image
              source={{ uri: "/placeholder.svg?height=24&width=40" }}
              style={styles.applePayIcon}
            />
          </View>
          <Text style={styles.optionText}>Apple Pay</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionItem} onPress={handleAddCard}>
          <View style={styles.optionIconContainer}>
            <Ionicons name="add" size={24} color="#7047EB" />
          </View>
          <Text style={styles.optionText}>Add Card</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, styles.marginTop]}>
          Other options
        </Text>

        <TouchableOpacity
          style={styles.optionItem}
          onPress={handleBankTransfer}
        >
          <View style={[styles.optionIconContainer, styles.ibanIconContainer]}>
            <Text style={styles.ibanText}>IBAN</Text>
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionText}>Bank transfer</Text>
            <Text style={styles.optionSubtext}>
              Free • Instant. In some cases it can take up to 2 business days
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionItem}
          onPress={handleRequestFromFriend}
        >
          <View
            style={[styles.optionIconContainer, styles.requestIconContainer]}
          >
            <Ionicons name="arrow-down" size={20} color="#7047EB" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionText}>Request from friend</Text>
            <Text style={styles.optionSubtext}>
              Free • Instant once approved
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionItem}
          onPress={handleAskAgent}
        >
          <View
            style={[styles.optionIconContainer, styles.agentIconContainer]}
          >
            <Ionicons name="people" size={20} color="#7047EB" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionText}>Ask an Agent</Text>
            <Text style={styles.optionSubtext}>
              Visit a physical agent location near you
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.salaryBanner}>
          <View style={styles.salaryTextContainer}>
            <Text style={styles.salaryTitle}>
              Get your salary paid into Vivid
            </Text>
            <Text style={styles.salarySubtext}>Make your money go further</Text>
          </View>
          <View style={styles.salaryImageContainer}>
            <Image
              source={{ uri: "/placeholder.svg?height=60&width=80" }}
              style={styles.salaryImage}
            />
          </View>
          <TouchableOpacity
            style={styles.switchButton}
            onPress={handleSwitchSalary}
          >
            <Text style={styles.switchButtonText}>SWITCH</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  closeButton: {
    paddingVertical: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#7047EB",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  marginTop: {
    marginTop: 32,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  applePayIcon: {
    width: 40,
    height: 24,
  },
  bankIconContainer: {
    backgroundColor: "#f0e6ff",
    borderRadius: 20,
  },
  ibanIconContainer: {
    backgroundColor: "#e6e6ff",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  ibanText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#7047EB",
  },
  requestIconContainer: {
    backgroundColor: "#f0e6ff",
    borderRadius: 20,
  },
  agentIconContainer: {
    backgroundColor: "#f0e6ff",
    borderRadius: 20,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  optionSubtext: {
    fontSize: 14,
    color: "#999",
  },
  salaryBanner: {
    marginTop: 32,
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  salaryTextContainer: {
    flex: 1,
    paddingRight: 80,
  },
  salaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  salarySubtext: {
    fontSize: 14,
    color: "#666",
  },
  salaryImageContainer: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  salaryImage: {
    width: 80,
    height: 60,
  },
  switchButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#7047EB",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  switchButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
});

export default AddMoneyOptionsScreen;
