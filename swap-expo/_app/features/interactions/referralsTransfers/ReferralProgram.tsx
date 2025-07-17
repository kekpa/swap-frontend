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
  ScrollView,
  Image,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import InviteContactsModal from "./InviteContactsModal";

interface ReferralProgramScreenProps {
  onBack?: () => void;
  onInviteFriends?: () => void;
  daysRemaining?: number;
  expiryDate?: string;
  rewardAmount?: string;
  currency?: string;
}

const ReferralProgramScreen: React.FC<ReferralProgramScreenProps> = ({
  onBack,
  onInviteFriends,
  daysRemaining = 16,
  expiryDate = "Nov 15",
  rewardAmount = "45",
  currency = "SGD",
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "details">(
    "overview"
  );
  const [showInviteModal, setShowInviteModal] = useState(false);
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const handleInviteFriends = () => {
    if (onInviteFriends) {
      onInviteFriends();
    } else {
      setShowInviteModal(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        {activeTab === "details" && (
          <Text style={styles.headerTitle}>
            Earn {rewardAmount} {currency} for each friend you invite!
          </Text>
        )}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === "overview" && (
          <>
            <Text style={styles.title}>
              Earn {rewardAmount} {currency} for each friend you invite!
            </Text>

            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={styles.timerText}>Ends in {daysRemaining} days</Text>
            </View>

            <View style={styles.imageContainer}>
              <Image
                source={{ uri: "https://placeholder.svg?height=150&width=300" }}
                style={styles.referralImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.deadlineText}>
              Your friends have until {expiryDate} to
            </Text>

            <View style={styles.stepItem}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="link-outline" size={24} color="#6200ee" />
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepTitle}>Sign up with your link</Text>
                <Text style={styles.stepDescription}>
                  And verify their identity
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="cash-outline" size={24} color="#6200ee" />
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepTitle}>Add money to their account</Text>
                <Text style={styles.stepDescription}>
                  Via debit card or bank transfer
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="card-outline" size={24} color="#6200ee" />
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepTitle}>Order a physical card</Text>
                <Text style={styles.stepDescription}>
                  And start using it for purchases
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => setActiveTab("details")}
            >
              <Text style={styles.detailsButtonText}>See full details</Text>
            </TouchableOpacity>
          </>
        )}

        {activeTab === "details" && (
          <>
            <View style={styles.stepItem}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="cash-outline" size={24} color="#6200ee" />
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepTitle}>Add money to their account</Text>
                <Text style={styles.stepDescription}>
                  Via debit card or bank transfer
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="card-outline" size={24} color="#6200ee" />
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepTitle}>Order a physical card</Text>
                <Text style={styles.stepDescription}>
                  Add it to Apple Pay or Google Pay, and start using
                  contactless!
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepIconContainer}>
                <Ionicons name="cart-outline" size={24} color="#6200ee" />
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepTitle}>
                  Make 3 purchases of 10 {currency} minimum each
                </Text>
                <Text style={styles.stepDescription}>
                  Some 'cash' transactions, like gambling, gift cards, or
                  transfers don't count
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => console.log("More info pressed")}
            >
              <Text style={styles.infoButtonText}>More info</Text>
            </TouchableOpacity>

            <View style={styles.rewardSection}>
              <Text style={styles.sectionTitle}>Your reward</Text>

              <View style={styles.rewardItem}>
                <View style={styles.rewardIconContainer}>
                  <Ionicons name="gift-outline" size={24} color="#6200ee" />
                </View>
                <View style={styles.rewardTextContainer}>
                  <Text style={styles.rewardTitle}>
                    {rewardAmount} {currency} for each friend
                  </Text>
                  <Text style={styles.rewardDescription}>
                    You'll get your reward a few days after your friends
                    complete all the steps. 5 rewards max per period
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.termsText}>
              By applying to this program, you confirm that you have read and
              agree to the above disclaimers and our{" "}
              <Text
                style={styles.termsLink}
                onPress={() => console.log("Terms & Conditions pressed")}
              >
                Terms & Conditions
              </Text>
            </Text>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={handleInviteFriends}
        >
          <Text style={styles.inviteButtonText}>Invite friends</Text>
        </TouchableOpacity>
      </View>

      {showInviteModal && (
        <InviteContactsModal
          onClose={() => setShowInviteModal(false)}
          referralLink="https://example.com/ref/user123"
        />
      )}
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  timerText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  imageContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  referralImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
  },
  deadlineText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0e6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: "#666",
  },
  detailsButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  detailsButtonText: {
    fontSize: 16,
    color: "#6200ee",
    fontWeight: "500",
  },
  infoButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  infoButtonText: {
    fontSize: 16,
    color: "#6200ee",
    fontWeight: "500",
  },
  rewardSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 16,
  },
  rewardItem: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
  },
  rewardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0e6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  rewardTextContainer: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  termsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  termsLink: {
    color: "#6200ee",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  inviteButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6200ee",
    justifyContent: "center",
    alignItems: "center",
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default ReferralProgramScreen;
