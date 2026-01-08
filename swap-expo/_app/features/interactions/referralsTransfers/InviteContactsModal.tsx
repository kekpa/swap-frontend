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
  Share,
  Clipboard,
  Alert,
  Linking,
} from "react-native";
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from "@expo/vector-icons";
import logger from '../../../utils/logger';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  initial: string;
}

interface InviteContactsModalProps {
  onClose: () => void;
  contacts?: Contact[];
  referralLink?: string;
}

const InviteContactsModal: React.FC<InviteContactsModalProps> = ({
  onClose,
  contacts = [
    {
      id: "1",
      name: "Jane",
      phoneNumber: "+6590366027",
      initial: "J",
    },
  ],
  referralLink = "https://example.com/ref/user123",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phoneNumber.includes(searchQuery)
  );

  const handleCopyLink = () => {
    Clipboard.setString(referralLink);
    setShowCopiedMessage(true);
    setTimeout(() => {
      setShowCopiedMessage(false);
    }, 3000);
  };

  const handleShareWhatsApp = () => {
    const message = `Join me on this app and we both get ${45} SGD! Use my link: ${referralLink}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
  };

  const handleShareMessenger = () => {
    const message = `Join me on this app and we both get ${45} SGD! Use my link: ${referralLink}`;
    Linking.openURL(
      `fb-messenger://share/?link=${encodeURIComponent(
        referralLink
      )}&app_id=123456789`
    );
  };

  const handleShareMore = async () => {
    try {
      await Share.share({
        message: `Join me on this app and we both get ${45} SGD! Use my link: ${referralLink}`,
        url: referralLink,
        title: "Invite Contacts and earn rewards",
      });
    } catch (error) {
      logger.error("Error sharing", error, 'app');
    }
  };

  const handleInviteContact = (contact: Contact) => {
    // In a real app, this would send an invitation to the contact
    Alert.alert("Invitation Sent", `Invitation sent to ${contact.name}`);
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <View style={styles.contactItem}>
      <View style={styles.contactInitial}>
        <Text style={styles.initialText}>{item.initial}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
      </View>
      <TouchableOpacity
        style={styles.inviteContactButton}
        onPress={() => handleInviteContact(item)}
      >
        <Text style={styles.inviteContactButtonText}>Invite</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Contacts</Text>
        <View style={styles.headerRight} />
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

      <FlashList
        data={filteredContacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.id}
        getItemType={() => 'contact'}
      />

      {showCopiedMessage && (
        <View style={styles.copiedContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#000" />
          <Text style={styles.copiedText}>Copied to clipboard</Text>
        </View>
      )}

      <View style={styles.shareContainer}>
        <TouchableOpacity style={styles.shareOption} onPress={handleCopyLink}>
          <View style={styles.shareIconContainer}>
            <Ionicons name="link-outline" size={24} color="#6200ee" />
          </View>
          <Text style={styles.shareOptionText}>Copy link</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareOption}
          onPress={handleShareWhatsApp}
        >
          <View style={styles.shareIconContainer}>
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
          </View>
          <Text style={styles.shareOptionText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareOption}
          onPress={handleShareMessenger}
        >
          <View style={styles.shareIconContainer}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color="#0084FF"
            />
          </View>
          <Text style={styles.shareOptionText}>Messenger</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareOption} onPress={handleShareMore}>
          <View style={styles.shareIconContainer}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
          </View>
          <Text style={styles.shareOptionText}>More</Text>
        </TouchableOpacity>
      </View>
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
    borderBottomColor: "#eee",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: "#000",
  },
  contactsList: {
    paddingHorizontal: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  contactInitial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0f7fa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  initialText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#00acc1",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: "#666",
  },
  inviteContactButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  inviteContactButtonText: {
    fontSize: 14,
    color: "#6200ee",
    fontWeight: "500",
  },
  copiedContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  copiedText: {
    fontSize: 14,
    color: "#000",
    marginLeft: 8,
  },
  shareContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  shareOption: {
    alignItems: "center",
  },
  shareIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  shareOptionText: {
    fontSize: 12,
    color: "#666",
  },
});

export default InviteContactsModal;
