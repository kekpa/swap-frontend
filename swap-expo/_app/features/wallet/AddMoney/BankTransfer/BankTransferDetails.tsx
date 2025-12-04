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
  ScrollView,
  Share,
  Alert,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { WalletStackParamList } from "../../../../navigation/walletNavigator";

type NavigationProp = StackNavigationProp<WalletStackParamList>;

interface BankTransferDetailsScreenProps {
  onBack?: () => void;
  accountDetails?: {
    beneficiary: string;
    iban: string;
    bic: string;
    bankName: string;
    bankAddress: string;
    currency: string;
  };
}

const BankTransferDetailsScreen: React.FC<BankTransferDetailsScreenProps> = ({
  onBack,
  accountDetails = {
    beneficiary: "Frantz Olivier Paillant Fortunat",
    iban: "FR76 2823 3000 0184 4221 4581 973",
    bic: "REVOFRP2",
    bankName: "Revolut Bank UAB",
    bankAddress: "10 avenue Kléber, 75116, Paris, France",
    currency: "Euro",
  },
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<"local" | "international">(
    "local"
  );

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert(`${label} copied to clipboard`);
  };

  const handleShareDetails = async () => {
    try {
      const message = `
Bank Transfer Details:
Beneficiary: ${accountDetails.beneficiary}
IBAN: ${accountDetails.iban}
BIC/SWIFT: ${accountDetails.bic}
Bank: ${accountDetails.bankName}
Address: ${accountDetails.bankAddress}
      `;

      await Share.share({
        message,
        title: "Bank Transfer Details",
      });
    } catch (error) {
      console.error("Error sharing details:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Account details</Text>

        <View style={styles.currencyContainer}>
          <View style={styles.flagContainer}>
            <Text style={styles.flagEmoji}>🇪🇺</Text>
          </View>
          <Text style={styles.currencyText}>{accountDetails.currency}</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "local" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("local")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "local" && styles.activeTabButtonText,
              ]}
            >
              Local
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "international" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("international")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "international" && styles.activeTabButtonText,
              ]}
            >
              International
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.transferTypeText}>
            For domestic transfers only
          </Text>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Beneficiary</Text>
            <View style={styles.detailValueContainer}>
              <Text style={styles.detailValue}>
                {accountDetails.beneficiary}
              </Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() =>
                  handleCopyToClipboard(
                    accountDetails.beneficiary,
                    "Beneficiary"
                  )
                }
              >
                <Ionicons name="copy-outline" size={20} color="#4a89dc" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>IBAN</Text>
            <View style={styles.detailValueContainer}>
              <Text style={styles.detailValue}>{accountDetails.iban}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() =>
                  handleCopyToClipboard(accountDetails.iban, "IBAN")
                }
              >
                <Ionicons name="copy-outline" size={20} color="#4a89dc" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>BIC/SWIFT code</Text>
            <View style={styles.detailValueContainer}>
              <Text style={styles.detailValue}>{accountDetails.bic}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() =>
                  handleCopyToClipboard(accountDetails.bic, "BIC/SWIFT")
                }
              >
                <Ionicons name="copy-outline" size={20} color="#4a89dc" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Bank name and address</Text>
            <View style={styles.detailValueContainer}>
              <View style={styles.bankDetailsContainer}>
                <Text style={styles.detailValue}>
                  {accountDetails.bankName}
                </Text>
                <Text style={styles.detailValue}>
                  {accountDetails.bankAddress}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() =>
                  handleCopyToClipboard(
                    `${accountDetails.bankName}, ${accountDetails.bankAddress}`,
                    "Bank details"
                  )
                }
              >
                <Ionicons name="copy-outline" size={20} color="#4a89dc" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareDetails}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share details</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="shield-checkmark" size={24} color="#fff" />
            </View>
            <Text style={styles.infoText}>
              Eligible deposits are protected up to a value of €100,000, or more
              in exceptions. <Text style={styles.infoLink}>Learn more</Text>
            </Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="time-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.infoText}>
              If the sending bank supports rapid payments, the payment will
              arrive in a few seconds. Otherwise, it will take up to 2 business
              days
            </Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="globe-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.infoText}>
              Only local transfers are accepted. For international transfers,
              please use the SWIFT network
            </Text>
          </View>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  currencyContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  flagContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    overflow: "hidden",
  },
  flagEmoji: {
    fontSize: 20,
  },
  currencyText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#fff",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#333",
    borderRadius: 28,
    marginBottom: 24,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 24,
  },
  activeTabButton: {
    backgroundColor: "#555",
  },
  tabButtonText: {
    fontSize: 16,
    color: "#ccc",
  },
  activeTabButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  detailsContainer: {
    backgroundColor: "#222",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  transferTypeText: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    color: "#999",
    marginBottom: 8,
  },
  detailValueContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailValue: {
    fontSize: 16,
    color: "#4a89dc",
    flex: 1,
  },
  bankDetailsContainer: {
    flex: 1,
  },
  copyButton: {
    padding: 4,
  },
  shareButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: 28,
    paddingVertical: 16,
    marginTop: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
    marginLeft: 8,
  },
  infoContainer: {
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
  infoLink: {
    color: "#4a89dc",
  },
});

export default BankTransferDetailsScreen;
