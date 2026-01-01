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
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { ProfileStackParamList } from "../../../navigation/profileNavigator";
import logger from "../../../utils/logger";

type NavigationProp = StackNavigationProp<ProfileStackParamList>;
type ReferralRouteProp = RouteProp<ProfileStackParamList, "Referral">;

interface ReferralScreenProps {
  onBack?: () => void;
  onShareLink?: () => void;
  onSeeInvites?: () => void;
  earnedAmount?: string;
  pendingAmount?: string;
}

const ReferralScreen: React.FC<ReferralScreenProps> = (props) => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReferralRouteProp>();

  // Use props or route params
  const earnedAmount = props.earnedAmount || route.params?.earnedAmount || "€0";
  const pendingAmount =
    props.pendingAmount || route.params?.pendingAmount || "€0";

  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
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
        logger.debug("Error sharing", 'profile', { error });
      }
    }
  };

  const handleSeeInvites = () => {
    if (props.onSeeInvites) {
      props.onSeeInvites();
    } else {
      // Navigate to ReferralCounter screen
      navigation.navigate("ReferralCounter", {
        earnedAmount: earnedAmount,
        pendingAmount: pendingAmount,
        initialView: "invites",
        pendingInvites: [
          { name: "Alex S.", status: "Signed up" },
          { name: "Sarah J.", status: "Waiting for first payment" },
        ],
        completedInvites: [{ name: "Mike T." }, { name: "Emma R." }],
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.smallTitle}>INVITE YOUR FRIENDS</Text>

        <Text style={styles.title}>Give €10, Get €10</Text>

        <Text style={styles.description}>
          Share your invite code and after your friend spends €10 you'll get €10
          credit and they'll get €10.
        </Text>

        <View style={styles.illustrationContainer}>
          <Image
            source={{
              uri: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-03-18%20at%2013.27.25-Tu2QpXHbegTqoJdxAAyqKHup8U3KVg.png",
            }}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShareLink}>
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

        <TouchableOpacity onPress={handleSeeInvites}>
          <Text style={styles.seeInvitesLink}>See your invites</Text>
        </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  smallTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#333",
    marginBottom: 24,
    lineHeight: 24,
  },
  illustrationContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  illustration: {
    width: "100%",
    height: 200,
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
});

export default ReferralScreen;
