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
  Image,
  ScrollView,
} from "react-native";
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { WalletStackParamList } from "../../../../navigation/walletNavigator";

type NavigationProp = StackNavigationProp<WalletStackParamList>;

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  initial: string;
  isN26User?: boolean;
}

interface SelectContactScreenProps {
  onBack?: () => void;
  onAddContact?: () => void;
  onSelectContact?: (contact: Contact) => void;
  onAllowAccess?: () => void;
  contacts?: Contact[];
}

const SelectContactScreen: React.FC<SelectContactScreenProps> = ({
  onBack,
  onAddContact,
  onSelectContact,
  onAllowAccess,
  contacts = [
    {
      id: "1",
      name: "Mardoche",
      email: "mardochee_fortunat@hotmail.com",
      initial: "M",
      isN26User: true,
    },
    {
      id: "2",
      name: "Jean Dupont",
      email: "jean.dupont@example.com",
      initial: "J",
      isN26User: true,
    },
    {
      id: "3",
      name: "Alice Martin",
      email: "alice.martin@example.com",
      initial: "A",
      isN26User: false,
    },
    {
      id: "4",
      name: "Robert Johnson",
      phone: "555-123-4567",
      initial: "R",
      isN26User: true,
    },
    {
      id: "5",
      name: "Sophie Williams",
      email: "sophie.w@example.com",
      phone: "555-987-6543",
      initial: "S",
      isN26User: false,
    },
  ],
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAccessPrompt, setShowAccessPrompt] = useState(true);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const handleAddContact = () => {
    if (onAddContact) {
      onAddContact();
    }
  };

  const handleSelectContact = (contact: Contact) => {
    if (onSelectContact) {
      onSelectContact(contact);
    } else {
      // Navigate to RequestMoney with the selected contact
      navigation.navigate("RequestMoney", {
        selectedContact: {
          id: contact.id,
          name: contact.name,
          initial: contact.initial,
        },
      });
    }
  };

  const handleAllowAccess = () => {
    if (onAllowAccess) {
      onAllowAccess();
    }
    setShowAccessPrompt(false);
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.email &&
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.phone && contact.phone.includes(searchQuery))
  );

  // Group contacts by first letter
  const groupedContacts = filteredContacts.reduce((groups, contact) => {
    const firstLetter = contact.name.charAt(0).toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(contact);
    return groups;
  }, {} as Record<string, Contact[]>);

  // Convert to array for FlatList
  const sections = Object.keys(groupedContacts)
    .sort()
    .map((letter) => ({
      letter,
      data: groupedContacts[letter],
    }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select contact</Text>
        <TouchableOpacity onPress={handleAddContact} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
          <Text style={styles.contactsTitle}>Contacts</Text>

          {showAccessPrompt && (
            <View style={styles.accessPromptContainer}>
              <View style={styles.accessPromptContent}>
                <View style={styles.accessPromptTextContainer}>
                  <Text style={styles.accessPromptTitle}>
                    Easily send money to your friends at N26
                  </Text>
                  <Text style={styles.accessPromptDescription}>
                    Allow N26 to access your contacts, so that sending money is
                    as easy as counting to 3.
                  </Text>
                </View>

                <View style={styles.accessPromptImageContainer}>
                  <Image
                    source={{ uri: "/placeholder.svg?height=100&width=100" }}
                    style={styles.accessPromptImage}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.allowAccessButton}
                onPress={handleAllowAccess}
              >
                <Text style={styles.allowAccessButtonText}>Allow access</Text>
              </TouchableOpacity>
            </View>
          )}

          <FlashList
            data={sections.flatMap(section => section.data)}
            renderItem={({ item: contact }) => (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => handleSelectContact(contact)}
              >
                <View style={styles.contactAvatarContainer}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactInitial}>
                      {contact.initial}
                    </Text>
                  </View>
                  {contact.isN26User && (
                    <View style={styles.n26Badge}>
                      <Text style={styles.n26BadgeText}>N</Text>
                    </View>
                  )}
                </View>

                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.email && (
                    <Text style={styles.contactDetail}>{contact.email}</Text>
                  )}
                  {contact.phone && (
                    <Text style={styles.contactDetail}>{contact.phone}</Text>
                  )}
                </View>

                <TouchableOpacity style={styles.moreButton}>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            estimatedItemSize={70}
            getItemType={() => 'contact'}
          />
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#333",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contactsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  contactsList: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#999",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  contactAvatarContainer: {
    position: "relative",
    marginRight: 16,
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
  n26Badge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2ecc71",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1a1a1a",
  },
  n26BadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    color: "#999",
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  accessPromptContainer: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: "#0e3b43",
    overflow: "hidden",
  },
  accessPromptContent: {
    flexDirection: "row",
    padding: 16,
  },
  accessPromptTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  accessPromptTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  accessPromptDescription: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
  accessPromptImageContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  accessPromptImage: {
    width: 100,
    height: 100,
  },
  allowAccessButton: {
    alignSelf: "flex-end",
    marginRight: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#2ecc71",
  },
  allowAccessButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  referralCard: {
    backgroundColor: "#7047EB",
    borderRadius: 12,
    marginBottom: 24,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  referralGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    borderTopWidth: 80,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    borderRightWidth: 120,
    borderRightColor: "transparent",
    zIndex: 1,
  },
  referralCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    zIndex: 2,
    justifyContent: "space-between",
  },
  referralLeftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  referralIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  referralArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  referralTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  referralTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  referralDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
  },
  rewardBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FF9500",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 3,
  },
  rewardBadgeText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  profileCard: {
    backgroundColor: "#4285F4",
    borderRadius: 12,
    marginBottom: 24,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  profileCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  profileDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 16,
  },
});

export default SelectContactScreen;
