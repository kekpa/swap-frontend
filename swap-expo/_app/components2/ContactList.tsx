// frontend/swap/_app/components/contacts/ContactList.tsx
// Updated: Added areListsVisible prop and dynamic toggle text for section headers - 2025-05-27
// Updated: Added invite button functionality for phone-only contacts - 2025-05-29
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ContactMatch, DeviceContact, NormalizedContact } from '../services/ContactsService';
import { EntitySearchResult } from '../types/entity.types';

// Simplified interface for initially displayed phone contacts, or general display contact
export interface DisplayableContact {
  id: string;
  name: string;
  statusOrPhone?: string; // For status (app user) or phone number (phone contact)
  initials: string;
  avatarColor: string;
  avatarUrl?: string; // For app users
  // Original contact object if needed for press action
  originalContact?: ContactMatch | DeviceContact | NormalizedContact | EntitySearchResult; 
}

interface ContactListProps {
  appUserContacts: DisplayableContact[];
  phoneOnlyContacts: DisplayableContact[];
  isLoading: boolean;
  onContactPress: (contact: DisplayableContact) => void;
  onInviteContact?: (contact: DisplayableContact) => void; // New prop for inviting phone contacts
  listTitleAppUsers?: string;
  listTitlePhoneContacts?: string;
  showAppUsersCount?: boolean;
  showPhoneContactsCount?: boolean;
  emptyStateMessageAppUsers?: string;
  emptyStateMessagePhoneContacts?: string;
  permissionGranted: boolean | null;
  onRequestPermission?: () => void;
  isLoadingPermission?: boolean;
  // New props for section header actions
  onHideAppUsers?: () => void; // Optional: if you want a hide action
  appUsersToggleText?: string; // Text for the hide/show button for app users
  onHidePhoneContacts?: () => void; // Optional
  phoneContactsToggleText?: string; // Text for the hide/show button for phone contacts
  areListsVisible: boolean; // Controls visibility of the list content under headers
}

const ContactList: React.FC<ContactListProps> = React.memo(({
  appUserContacts,
  phoneOnlyContacts,
  isLoading,
  onContactPress,
  onInviteContact,
  listTitleAppUsers = 'SWAP CONTACTS',
  listTitlePhoneContacts = 'FROM YOUR PHONE',
  showAppUsersCount = true,
  showPhoneContactsCount = true,
  emptyStateMessageAppUsers = 'No contacts on SWAP yet.',
  emptyStateMessagePhoneContacts = 'No contacts found on your phone, or access not granted.',
  permissionGranted,
  onRequestPermission,
  isLoadingPermission,
  onHideAppUsers,
  appUsersToggleText = 'Hide', // Default to Hide
  onHidePhoneContacts,
  phoneContactsToggleText = 'Hide', // Default to Hide
  areListsVisible,
}) => {
  const { theme } = useTheme();

  // Memoized app user contact item (clickable, no invite button)
  const AppUserContactItem = React.memo<{ contact: DisplayableContact; keyPrefix: string; onPress: () => void }>(
    ({ contact, keyPrefix, onPress }) => (
      <TouchableOpacity
        key={`${keyPrefix}-${contact.id}`}
        style={styles.contactItem}
        onPress={onPress}
      >
        <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
          {contact.avatarUrl ? (
            <Text>IMG</Text> // Placeholder for Image component if avatarUrl exists
          ) : (
            <Text style={styles.avatarText}>{contact.initials}</Text>
          )}
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          {contact.statusOrPhone && (
            <Text style={styles.contactStatus}>{contact.statusOrPhone}</Text>
          )}
        </View>
      </TouchableOpacity>
    )
  );

  // Render app user contact item (clickable, no invite button)
  const renderAppUserContactItem = (contact: DisplayableContact, keyPrefix: string) => (
    <AppUserContactItem 
      contact={contact} 
      keyPrefix={keyPrefix} 
      onPress={() => onContactPress(contact)} 
    />
  );

  // Memoized phone-only contact item (not clickable, with invite button)
  const PhoneOnlyContactItem = React.memo<{ contact: DisplayableContact; keyPrefix: string; onInvite?: () => void }>(
    ({ contact, keyPrefix, onInvite }) => (
      <View
        key={`${keyPrefix}-${contact.id}`}
        style={styles.contactItem}
      >
        <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
          <Text style={styles.avatarText}>{contact.initials}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          {contact.statusOrPhone && (
            <Text style={styles.contactStatus}>{contact.statusOrPhone}</Text>
          )}
        </View>
        {onInvite && (
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={onInvite}
          >
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  );

  // Render phone-only contact item (not clickable, with invite button)
  const renderPhoneOnlyContactItem = (contact: DisplayableContact, keyPrefix: string) => (
    <PhoneOnlyContactItem 
      contact={contact} 
      keyPrefix={keyPrefix} 
      onInvite={onInviteContact ? () => onInviteContact(contact) : undefined} 
    />
  );

  const styles = StyleSheet.create({
    sectionContainer: { // New container for the whole section including header and list
      backgroundColor: theme.colors.background, // Ensures section background is consistent
      marginBottom: theme.spacing.sm, // Space between sections
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm, // Adjusted padding
      backgroundColor: theme.isDark ? theme.colors.grayUltraLight : theme.colors.card,  // White background in light mode
      // borderBottomWidth: 1, // Optional: if you want a bottom border for the header
      // borderBottomColor: theme.colors.divider,
    },
    sectionTitleText: { // Renamed from sectionSubtitle to avoid confusion
      fontSize: theme.typography.fontSize.sm, // Font size from InteractionsHistory2
      fontWeight: '500', // Font weight from InteractionsHistory2
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
    },
    sectionActionText: { // For "Hide" or other actions
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    contactsListContainer: { // Container for the list items below the header
      paddingHorizontal: theme.spacing.md, // Indent list items slightly
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    avatar: {
      width: 48, // Matched to NewInteraction2 size
      height: 48,
      borderRadius: 24, // Half of width/height
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    avatarText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.lg, // Matched to NewInteraction2
      fontWeight: 'bold',
    },
    contactInfo: { flex: 1 },
    contactName: {
      fontSize: theme.typography.fontSize.md, // Matched
      fontWeight: '500', // Matched
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    contactStatus: {
      fontSize: theme.typography.fontSize.sm, // Matched
      color: theme.colors.textSecondary,
    },
    inviteButton: {
      backgroundColor: theme.colors.success,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      marginLeft: theme.spacing.sm,
    },
    inviteButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
    },
    emptyListText: {
      textAlign: 'center',
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
      fontStyle: 'italic',
      paddingHorizontal: theme.spacing.md, // Add padding to empty text as well
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.lg, // Increased padding for loader
    },
    loadingText: {
      marginLeft: theme.spacing.sm,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    permissionSection: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.lg, // Added vertical padding
      marginBottom: theme.spacing.lg,
      alignItems: 'center',
      backgroundColor: theme.colors.card, // Use card background for this distinct section
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing.md, // Add horizontal margin to make it card-like
    },
    permissionPromptHeader: { // New style for the "Your contacts" title
        fontSize: theme.typography.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
    },
    permissionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      lineHeight: 20,
      textAlign: 'center',
    },
    permissionButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '60%', // Ensure button has a decent width
    },
    permissionButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
  });

  if (isLoading && !appUserContacts.length && !phoneOnlyContacts.length && permissionGranted !== false) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  const showAppUserSection = appUserContacts.length > 0 || (!isLoading && permissionGranted);
  const showPhoneContactListContent = permissionGranted === true && (phoneOnlyContacts.length > 0 || !isLoading);

  return (
    <View>
      {/* App Users Section (SWAP Contacts) */}
      {showAppUserSection && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleText}>
              {listTitleAppUsers}
              {showAppUsersCount && appUserContacts.length > 0 && ` · ${appUserContacts.length}`}
            </Text>
            {onHideAppUsers && (
              <TouchableOpacity onPress={onHideAppUsers}>
                <Text style={styles.sectionActionText}>{appUsersToggleText}</Text>
              </TouchableOpacity>
            )}
          </View>
          {areListsVisible && (
            <>
              {appUserContacts.length > 0 ? (
                <View style={styles.contactsListContainer}>
                  {appUserContacts.map(contact => 
                    <View key={contact.id}>
                      {renderAppUserContactItem(contact, 'app-user')}
                    </View>
                  )}
                </View>
              ) : (
                !isLoading && permissionGranted && <Text style={styles.emptyListText}>{emptyStateMessageAppUsers}</Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Phone-Only Contacts Section */}
      {/* Permission Request UI - only shows if lists are visible or permission not granted */}
      {(areListsVisible || permissionGranted === false) && permissionGranted === false && onRequestPermission && (
        <View style={styles.permissionSection}>
          <Text style={styles.permissionPromptHeader}>Your contacts</Text>
          <Text style={styles.permissionText}>
            Connect with friends by allowing Swap access to your phone contacts.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={onRequestPermission}
            disabled={isLoadingPermission}
          >
            {isLoadingPermission ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.permissionButtonText}>Allow Access</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Actual List of Phone Contacts - only shows if permission granted AND lists are visible */}
      {permissionGranted === true && areListsVisible && ( 
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleText}>
              {listTitlePhoneContacts}
              {showPhoneContactsCount && phoneOnlyContacts.length > 0 && ` · ${phoneOnlyContacts.length}`}
            </Text>
            {/* Optional: Hide/Show for this section too, if needed */}
            {onHidePhoneContacts && (
                <TouchableOpacity onPress={onHidePhoneContacts}>
                    <Text style={styles.sectionActionText}>{phoneContactsToggleText}</Text>
                </TouchableOpacity>
            )}
          </View>
          {phoneOnlyContacts.length > 0 ? (
            <View style={styles.contactsListContainer}>
              {phoneOnlyContacts.map(contact => 
                <View key={contact.id}>
                  {renderPhoneOnlyContactItem(contact, 'phone-only')}
                </View>
              )}
            </View>
          ) : (
            !isLoading && <Text style={styles.emptyListText}>{emptyStateMessagePhoneContacts}</Text>
          )}
        </View>
      )}

       {/* Fallback Loading indicator */}
      {isLoading && (appUserContacts.length === 0 && phoneOnlyContacts.length === 0) && permissionGranted === null && (
         <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      )}
    </View>
  );
});

export default ContactList; 