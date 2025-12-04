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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { ProfileStackParamList } from "../../../navigation/profileNavigator";

type NavigationProp = StackNavigationProp<ProfileStackParamList>;
type ReferralCounterRouteProp = RouteProp<
  ProfileStackParamList,
  "ReferralCounter"
>;

interface FaqItem {
  question: string;
  answer: string;
  isOpen: boolean;
}

interface ReferralCounterScreenProps {
  onBack?: () => void;
  onShareLink?: () => void;
  earnedAmount?: string;
  pendingAmount?: string;
  pendingInvites?: any[];
  completedInvites?: any[];
  initialView?: "faq" | "invites";
}

const ReferralCounterScreen: React.FC<ReferralCounterScreenProps> = (props) => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReferralCounterRouteProp>();

  // Use props or route params
  const earnedAmount = props.earnedAmount || route.params?.earnedAmount || "€0";
  const pendingAmount =
    props.pendingAmount || route.params?.pendingAmount || "€0";
  const pendingInvites =
    props.pendingInvites || route.params?.pendingInvites || [];
  const completedInvites =
    props.completedInvites || route.params?.completedInvites || [];
  const initialViewParam =
    props.initialView || route.params?.initialView || "faq";

  const [currentView, setCurrentView] = useState<"faq" | "invites">(
    initialViewParam
  );
  const [activeTab, setActiveTab] = useState<"pending" | "completed">(
    "pending"
  );
  const [faqItems, setFaqItems] = useState<FaqItem[]>([
    {
      question: "How do I receive my referral bonus?",
      answer:
        "Once your friend signs up using your referral link and spends €10, both of you will receive a €10 credit to your accounts automatically.",
      isOpen: false,
    },
    {
      question: "How long is my link or code valid for?",
      answer:
        "Your referral link is valid indefinitely, but your friend must complete the required actions within 30 days of signing up.",
      isOpen: false,
    },
    {
      question: "Why didn't I receive my friend referral bonus?",
      answer:
        "Your friend may not have completed all the required steps yet. They need to sign up using your link and spend at least €10 within 30 days.",
      isOpen: false,
    },
    {
      question: "Why can't I see who signed up in my scoreboard?",
      answer:
        "For privacy reasons, we only show when someone has signed up, not their personal Counter. Once they complete the requirements, you'll see the bonus in your account.",
      isOpen: false,
    },
  ]);

  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else if (currentView === "invites") {
      setCurrentView("faq");
    } else {
      navigation.goBack();
    }
  };

  const handleShareLink = async () => {
    if (props.onShareLink) {
      props.onShareLink();
    } else {
      try {
        await Share.share({
          message:
            "Join me on SWAP and get €10 when you sign up using my invite code: SWAP123",
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    }
  };

  const toggleFaqItem = (index: number) => {
    const updatedFaqItems = [...faqItems];
    updatedFaqItems[index].isOpen = !updatedFaqItems[index].isOpen;
    setFaqItems(updatedFaqItems);
  };

  const renderFaqView = () => {
    return (
      <>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite your friends</Text>
        </View>

        <ScrollView style={styles.content}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareLink}
          >
            <Text style={styles.shareButtonText}>Share invite link</Text>
          </TouchableOpacity>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statAmount}>{earnedAmount}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statAmount}>{pendingAmount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => setCurrentView("invites")}>
            <Text style={styles.seeInvitesLink}>See your invites</Text>
          </TouchableOpacity>

          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqContainer}>
            {faqItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.faqItem}
                onPress={() => toggleFaqItem(index)}
              >
                <View style={styles.faqQuestion}>
                  <Text style={styles.faqQuestionText}>{item.question}</Text>
                  <Ionicons
                    name={item.isOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#666"
                  />
                </View>

                {item.isOpen && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}

                <View style={styles.faqDivider} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </>
    );
  };

  const renderInvitesView = () => {
    return (
      <>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setCurrentView("faq")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your invites</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "pending" && styles.activeTab]}
            onPress={() => setActiveTab("pending")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "pending" && styles.activeTabText,
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "completed" && styles.activeTab]}
            onPress={() => setActiveTab("completed")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "completed" && styles.activeTabText,
              ]}
            >
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {activeTab === "pending" && pendingInvites.length === 0 && (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateTitle}>No pending invites</Text>
              <Text style={styles.emptyStateDescription}>
                Once your friends have used your referral code, you'll find them
                here
              </Text>
            </View>
          )}

          {activeTab === "pending" && pendingInvites.length > 0 && (
            <View style={styles.invitesList}>
              {pendingInvites.map((invite, index) => (
                <View key={index} style={styles.inviteItem}>
                  <Text style={styles.inviteName}>{invite.name}</Text>
                  <Text style={styles.inviteStatus}>{invite.status}</Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === "completed" && completedInvites.length === 0 && (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateTitle}>No completed invites</Text>
              <Text style={styles.emptyStateDescription}>
                When your friends complete all requirements, they'll appear here
              </Text>
            </View>
          )}

          {activeTab === "completed" && completedInvites.length > 0 && (
            <View style={styles.invitesList}>
              {completedInvites.map((invite, index) => (
                <View key={index} style={styles.inviteItem}>
                  <Text style={styles.inviteName}>{invite.name}</Text>
                  <Text style={styles.inviteReward}>€10 earned</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {currentView === "faq" ? renderFaqView() : renderInvitesView()}
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
    paddingVertical: 16,
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  shareButton: {
    backgroundColor: "#8bc4a7",
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  shareButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e0e0e0",
  },
  statAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  seeInvitesLink: {
    fontSize: 16,
    color: "#8bc4a7",
    textAlign: "center",
    marginBottom: 40,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 24,
  },
  faqContainer: {
    marginBottom: 40,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  faqQuestionText: {
    fontSize: 16,
    color: "#000",
    flex: 1,
    paddingRight: 16,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    paddingVertical: 8,
  },
  faqDivider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginTop: 8,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "#fff",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#8bc4a7",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 24,
  },
  invitesList: {
    marginBottom: 24,
  },
  inviteItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  inviteName: {
    fontSize: 16,
    color: "#000",
  },
  inviteStatus: {
    fontSize: 14,
    color: "#8bc4a7",
  },
  inviteReward: {
    fontSize: 14,
    color: "#8bc4a7",
    fontWeight: "600",
  },
});

export default ReferralCounterScreen;
