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
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { InteractionsStackParamList } from "../navigation/interactions/interactionsNavigator";
import { Ionicons } from "@expo/vector-icons";

type NavigationProp = StackNavigationProp<any>;

// Export the contact data so it can be reused
export const recentContactsData = [
  {
    id: '1',
    name: 'John Doe',
    initial: 'JD',
    info: '@johnd',
    color: '#4169e1',
    isVerified: true, // Indicates if the contact is verified
  },
  { id: "2", initial: "J", name: "John", color: "#cd9575" },
  { id: "3", initial: "S", name: "Sarah", color: "#77dd77" },
  { id: "4", initial: "M", name: "Mike", color: "#ff7f50" },
  { id: "5", initial: "A", name: "Anna", color: "#6495ED" },
  { id: "6", initial: "T", name: "Tom", color: "#ffa500" },
  { 
    id: "7", 
    initial: "S", 
    name: "SWAP", 
    isVerified: true,
    color: "#6a11cb" // Purple to match SWAP's brand color
  },
  { id: "8", initial: "D", name: "David", color: "#8470ff" },
];

interface ContactAvatarProps {
  id: string;
  initial: string;
  name: string;
  isVerified?: boolean;
  color?: string;
  onPress: (id: string, name: string, initial: string, color: string) => void;
}

const ContactAvatar: React.FC<ContactAvatarProps> = ({
  id,
  initial,
  name,
  isVerified = false,
  color = "#333",
  onPress,
}) => (
  <TouchableOpacity
    style={styles.avatarContainer}
    onPress={() => onPress(id, name, initial, color)}
  >
    <View style={[styles.avatar, { backgroundColor: color }]}>
      <Text style={styles.avatarText}>{initial}</Text>
      {isVerified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
        </View>
      )}
    </View>
    <Text style={styles.avatarName}>{name}</Text>
  </TouchableOpacity>
);

interface RecentContactsProps {
  onContactPress?: (id: string) => void; // Make this optional for backward compatibility
}

const RecentContacts: React.FC<RecentContactsProps> = ({ onContactPress }) => {
  const navigation = useNavigation<NavigationProp>();

  const handleContactPress = (
    id: string,
    name: string,
    initial: string,
    color: string
  ) => {
    // Call the provided onContactPress function if it exists (for backward compatibility)
    if (onContactPress) {
      onContactPress(id);
      return;
    }

    try {
      // Try direct navigation first (works when inside the main TransfersNavigator)
      navigation.navigate("ContactTransactionHistory", {
        contactId: id,
        contactName: name,
        contactInitials: initial,
        contactAvatarColor: color,
      });
    } catch (error) {
      // If direct navigation fails, we're likely in a nested navigator (NewTransfer modal)
      // Close the current modal and then navigate to ContactTransactionHistory
      navigation.dispatch((state) => {
        // First, close the current modal
        navigation.goBack();

        // Then navigate to ContactTransactionHistory in the main navigator
        setTimeout(() => {
          navigation.dispatch(
            CommonActions.navigate({
              name: "ContactTransactionHistory",
              params: {
                contactId: id,
                contactName: name,
                contactInitials: initial,
                contactAvatarColor: color,
              },
            })
          );
        }, 300); // Small delay to ensure modal is closed first

        return state;
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recentContactsData.map((contact) => (
          <ContactAvatar
            key={contact.id}
            id={contact.id}
            initial={contact.initial}
            name={contact.name}
            isVerified={contact.isVerified}
            color={contact.color}
            onPress={handleContactPress}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  avatarContainer: {
    alignItems: "center",
    marginHorizontal: 8,
    width: 70,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarText: {
    color: "white",
    fontSize: 24,
    fontWeight: "500",
  },
  avatarName: {
    color: "#999",
    fontSize: 12,
    textAlign: "center",
  },
  verifiedBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#121212",
    borderRadius: 10,
    padding: 2,
  },
});

export default RecentContacts;
