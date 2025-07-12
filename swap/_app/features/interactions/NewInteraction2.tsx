import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CommonActions, StackActions } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { InteractionsStackParamList } from '../../navigation/interactions/interactionsNavigator';
import { useSearchEntities } from '../../query/hooks/useSearchEntities';
// EntitySearchResult type moved to query hooks
interface EntitySearchResult {
  id: string;
  type: 'user' | 'business';
  name: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  lastActiveAt?: string;
}
import logger from '../../utils/logger';
import { RootStackParamList } from '../../navigation/rootNavigator';
import contactsService, { ContactMatch, DeviceContact, NormalizedContact } from '../../services/ContactsService';
import ContactList, { DisplayableContact } from '../../components2/ContactList';
import SearchResultsList from '../../components2/SearchResultsList';
import { inviteContactViaSMS } from '../../utils/inviteUtils';

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Remove Contact interface if DisplayableContact from ContactList covers it, or adjust
// interface Contact {
//   id: string;
//   name: string;
//   status: string;
//   avatar: string;
//   initials: string;
//   avatarColor: string;
// }

// Simplified interface for initially displayed phone contacts (can be removed if DisplayableContact is sufficient)
// interface DisplayablePhoneContact {
//   id: string; // device contact id
//   name: string;
//   rawPhoneNumber?: string; // For display
//   initials: string;
//   avatarColor: string;
// }

// SearchResult interface to match SearchResultsList component
interface SearchResult {
  id: string;
  name: string;
  type: 'entity' | 'interaction' | 'contact';
  avatarUrl?: string;
  initials: string;
  avatarColor: string;
  secondaryText: string;
  originalData: any;
}

const NewInteraction2: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  
  // State declarations first
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // TanStack Query hook for search - replaces useData() search functions
  const {
    results: { entities: entitySearchResults },
    isLoading: isLoadingEntitySearch,
    refetch: refetchSearch
  } = useSearchEntities({ query: searchQuery, enabled: searchQuery.length >= 2 });
  
  // getInitials can be removed if ContactList handles it or it's not needed elsewhere
  const getInitials = (name: string): string => {
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0] || ''}${nameParts[1][0] || ''}`.toUpperCase();
    } else if (nameParts.length === 1 && nameParts[0]) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    return 'UN';
  };
  
  // Contact-related state - types changed to DisplayableContact[]
  const [allDeviceContacts, setAllDeviceContacts] = useState<ContactMatch[]>([]); // This might be less directly used now
  const [appUserContacts, setAppUserContacts] = useState<DisplayableContact[]>([]);
  const [phoneOnlyContacts, setPhoneOnlyContacts] = useState<DisplayableContact[]>([]);
  // const [initialPhoneContacts, setInitialPhoneContacts] = useState<DisplayableContact[]>([]); // May not be needed
  const [hasContactsPermission, setHasContactsPermission] = useState<boolean | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingInitialContacts, setIsLoadingInitialContacts] = useState(true);
  const [contactsSynced, setContactsSynced] = useState(false);
  
  // Move the ref declaration to component top level
  const prevResultsRef = useRef('');
  
  // Recent contacts - clear hardcoded data, this should be populated dynamically if used
  const [recentContacts, setRecentContacts] = useState<DisplayableContact[]>([]);

  // Search results state - now using SearchResult[] for consistency
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Helper to generate avatar color
  const getAvatarColor = (name: string): string => {
    const colorPalette = ['#3B82F6', '#8B5CF6', '#EF4444', '#F97316', '#10B981', '#06B6D4', '#8B5A2B', '#EC4899'];
    const charCode = name.charCodeAt(0) || 0;
    return colorPalette[Math.abs(charCode) % colorPalette.length];
  };

  // Check contacts permission and load phone contacts on mount
  useEffect(() => {
    const initializeContacts = async () => {
      setIsLoadingInitialContacts(true);
      setIsLoadingContacts(true);

      try {
        logger.debug('[NewInteraction2] Initializing contacts...', "NewInteraction");
        const hasPermission = await contactsService.checkPermission();
        setHasContactsPermission(hasPermission);
        
        if (hasPermission) {
          logger.debug('[NewInteraction2] Has contacts permission. Fetching contacts from service...', "NewInteraction");
          
          // Fetch platform-matched (app user) contacts
          const platformMatches = await contactsService.getMatchedPlatformContacts(false); // false = don't force refresh initially
          const appUsersMapped = platformMatches.map(cm => {
            const displayName = cm.matchedUser?.displayName || cm.contact.displayName;
            const initials = getInitials(displayName);
            const charCode = displayName.charCodeAt(0) || 0;
            // Consistent, valid color palette
            const colorPalette = ['#38bdf8', '#818cf8', '#f87171', '#fb923c', '#a3e635', '#4ade80', '#2dd4bf', '#60a5fa'];
            const avatarColor = colorPalette[Math.abs(charCode) % colorPalette.length];

            if (displayName.toLowerCase().includes('hank')) {
              logger.debug(`[NewInteraction2] Mapping AppUser: Name='${displayName}', Initials='${initials}', AvatarColor='${avatarColor}'`);
            }

            return {
              id: cm.matchedUser?.entityId || cm.contact.deviceContactId || `app-user-${cm.contact.phoneNumber}`,
              name: displayName,
              statusOrPhone: `@${cm.matchedUser?.username || 'user'}`,
              initials: initials,
              avatarColor: avatarColor,
              avatarUrl: cm.matchedUser?.avatarUrl,
              originalContact: cm,
            };
          });
          setAppUserContacts(appUsersMapped);
          logger.debug(`[NewInteraction2] Mapped ${platformMatches.length} platform contacts.`);

          // Fetch phone-only contacts (NormalizedContact[])
          const phoneOnlyNormalized = await contactsService.getPhoneOnlyNormalizedContacts(false); // false = don't force refresh initially
          const phoneOnlyMapped = phoneOnlyNormalized.map(normContact => {
            const displayName = normContact.displayName;
            const initials = getInitials(displayName);
            const charCode = displayName.charCodeAt(0) || 0;
            // Consistent, valid color palette
            const colorPalette = ['#38bdf8', '#818cf8', '#f87171', '#fb923c', '#a3e635', '#4ade80', '#2dd4bf', '#60a5fa'];
            const avatarColor = colorPalette[Math.abs(charCode) % colorPalette.length];

            if (displayName.toLowerCase().includes('hank')) {
              logger.debug(`[NewInteraction2] Mapping PhoneOnly: Name='${displayName}', Initials='${initials}', AvatarColor='${avatarColor}'`);
            }

            return {
              id: normContact.deviceContactId || `phone-${normContact.phoneNumber}`,
              name: displayName,
              statusOrPhone: normContact.rawPhoneNumber,
              initials: initials,
              avatarColor: avatarColor,
              originalContact: normContact,
            };
          });
          setPhoneOnlyContacts(phoneOnlyMapped);
          // setInitialPhoneContacts(phoneOnlyMapped); // May not be needed
          logger.debug(`[NewInteraction2] Mapped ${phoneOnlyNormalized.length} phone-only normalized contacts.`);

          setContactsSynced(true);
          // logger.debug(`[NewInteraction2] Contacts loaded/synced. Total Device: ${allContactsData.length}, App Users: ${appUsersMapped.length}, Phone Only: ${phoneOnlyMapped.length}`);
          logger.debug(`[NewInteraction2] Contacts loaded/synced. App Users: ${appUsersMapped.length}, Phone Only: ${phoneOnlyMapped.length}`);

        } else {
          logger.warn('[NewInteraction2] No contacts permission. Skipping contact load.');
          // setIsLoadingInitialContacts(false); // Already handled in finally
        }
      } catch (error) {
        logger.error('[NewInteraction2] Error initializing contacts:', error);
        // setIsLoadingInitialContacts(false); // Already handled in finally
      } finally {
        setIsLoadingInitialContacts(false);
        setIsLoadingContacts(false);
      }
    };
    
    initializeContacts();
  }, []); // Removed dependencies that might cause re-fetch, like currentUser.entityId if it changes rarely after init.

  // Convert entity search results to contacts format
  useEffect(() => {
    // Skip if dependencies didn't actually change or if we've already processed these results
    const resultsFingerprint = entitySearchResults?.length ? entitySearchResults.map(e => e.id).join(',') : '';
    
    if (resultsFingerprint === prevResultsRef.current && prevResultsRef.current !== '') {
      // Skip processing if we've already processed these exact results
      return;
    }
    
    // Update reference to current results
    prevResultsRef.current = resultsFingerprint;
    
    if (entitySearchResults && entitySearchResults.length > 0) {
      logger.debug(`Processing ${entitySearchResults.length} search results`, "NewInteraction");
      const mappedResults = entitySearchResults.map(entity => {
        const displayName = entity.displayName || 'Unknown User';
        const initials = getInitials(displayName);
        const avatarColor = getAvatarColor(displayName);

        return {
          id: entity.id,
          name: displayName,
          type: 'entity' as const,
          avatarUrl: entity.avatarUrl || undefined,
          initials: initials,
          avatarColor: avatarColor,
          secondaryText: entity.entityType === 'profile' ? 'Profile' : 
                        entity.entityType === 'business' ? 'Business' : 'Account',
          originalData: entity,
        };
      });
      
      setSearchResults(mappedResults);
      setHasSearched(true);
      logger.debug(`Mapped ${mappedResults.length} contacts from search results`, "NewInteraction");
    } else if (hasSearched) {
      // Only clear contacts if we've actually searched and found nothing
      logger.debug(`No search results found or empty results`, "NewInteraction");
      setSearchResults([]);
    }
    
    // Cleanup function
    return () => {
      // Nothing to clean up right now
    };
  }, [entitySearchResults, hasSearched]);

  // Debounced search function
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // If query is empty, don't search and reset contacts to default
    if (!text || text.length < 2) {
      setHasSearched(false);
      return;
    }
    
    // Set new timeout (300ms debounce)
    const timeout = setTimeout(async () => {
      logger.debug(`Searching all with query: ${text}`, "NewInteraction");
      try {
        await refetchSearch(); // Use refetchSearch from TanStack Query
        setHasSearched(true);
      } catch (error) {
        logger.error("Error searching all", error, "NewInteraction");
        // Still mark as searched even on error to show empty state
        setHasSearched(true);
      }
    }, 300);
    
    setSearchTimeout(timeout);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleScanQR = () => {
    logger.debug('Scan QR code pressed', "NewInteraction");
    // Navigate to QR scanner
  };

  const handleAddManually = () => {
    logger.debug('Add manually pressed', "NewInteraction");
    // Navigate to form for adding new contact manually
    // This is a placeholder - we'll create a basic alert to simulate the action
    alert('This would navigate to a form for adding a new contact manually. This feature is coming soon!');
    
    // Mock implementation to display sample person being added
    const newContact: DisplayableContact = {
      id: `new-${Date.now()}`,
      name: searchQuery || "New Contact",
      statusOrPhone: "New contact",
      initials: "NC",
      avatarColor: '#22c55e',
    };
    
    // Add to recent contacts
    // setRecentContacts([newContact, ...recentContacts.slice(0, 3)]);
    
    // Reset search
    setSearchQuery('');
    setHasSearched(false);
  };

  const handleRequestContactsPermission = async () => {
    setIsLoadingContacts(true); 
    try {
      logger.debug('[NewInteraction2] Requesting contacts permission...');
      const granted = await contactsService.requestPermission();
      setHasContactsPermission(granted);
      if (granted) {
        logger.debug('[NewInteraction2] Permission granted. Re-fetching contacts with forceRefresh=true...');
        // Re-fetch both lists with forceRefresh after permission is granted
        const platformMatches = await contactsService.getMatchedPlatformContacts(true);
        const appUsersMapped = platformMatches.map(cm => {
          const displayName = cm.matchedUser?.displayName || cm.contact.displayName;
          const initials = getInitials(displayName);
          const charCode = displayName.charCodeAt(0) || 0;
          // Consistent, valid color palette
          const colorPalette = ['#38bdf8', '#818cf8', '#f87171', '#fb923c', '#a3e635', '#4ade80', '#2dd4bf', '#60a5fa'];
          const avatarColor = colorPalette[Math.abs(charCode) % colorPalette.length];

          if (displayName.toLowerCase().includes('hank')) {
            logger.debug(`[NewInteraction2] Mapping AppUser (Permission Grant): Name='${displayName}', Initials='${initials}', AvatarColor='${avatarColor}'`);
          }

          return {
            id: cm.matchedUser?.entityId || cm.contact.deviceContactId || `app-user-${cm.contact.phoneNumber}`,
            name: displayName,
            statusOrPhone: `@${cm.matchedUser?.username || 'user'}`,
            initials: initials,
            avatarColor: avatarColor,
            avatarUrl: cm.matchedUser?.avatarUrl,
            originalContact: cm,
          };
        });
        setAppUserContacts(appUsersMapped);

        const phoneOnlyNormalized = await contactsService.getPhoneOnlyNormalizedContacts(true);
        const phoneOnlyMapped = phoneOnlyNormalized.map(normContact => {
          const displayName = normContact.displayName;
          const initials = getInitials(displayName);
          const charCode = displayName.charCodeAt(0) || 0;
          // Consistent, valid color palette
          const colorPalette = ['#38bdf8', '#818cf8', '#f87171', '#fb923c', '#a3e635', '#4ade80', '#2dd4bf', '#60a5fa'];
          const avatarColor = colorPalette[Math.abs(charCode) % colorPalette.length];
          
          if (displayName.toLowerCase().includes('hank')) {
            logger.debug(`[NewInteraction2] Mapping PhoneOnly (Permission Grant): Name='${displayName}', Initials='${initials}', AvatarColor='${avatarColor}'`);
          }

          return {
            id: normContact.deviceContactId || `phone-${normContact.phoneNumber}`,
            name: displayName,
            statusOrPhone: normContact.rawPhoneNumber,
            initials: initials,
            avatarColor: avatarColor,
            originalContact: normContact,
          };
        });
        setPhoneOnlyContacts(phoneOnlyMapped);
        setContactsSynced(true);
        logger.debug('[NewInteraction2] Contacts re-fetched after permission grant.');
      }
    } catch (error) {
      logger.error('[NewInteraction2] Error requesting contacts permission or re-initializing:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleContactPress = (contact: DisplayableContact) => {
    logger.debug(`Contact pressed: ${contact.name} (ID: ${contact.id})`, "NewInteraction");
    
    // Only handle platform contacts (app users) - phone-only contacts should use invite button
    if (contact.originalContact && (contact.originalContact as ContactMatch).matchedUser) {
      const contactMatch = contact.originalContact as ContactMatch;
      const entityIdForNavigation = contactMatch.matchedUser?.entityId;
      
      if (entityIdForNavigation) {
    const contactData = {
          contactId: entityIdForNavigation,
      contactName: contact.name,
      contactInitials: contact.initials,
      contactAvatarColor: contact.avatarColor,
        };

        logger.debug(
          `Navigating to ContactInteractionHistory2 for platform contact: ${contact.name} (entityId: ${entityIdForNavigation})`,
          "NewInteraction"
        );

        navigation.dispatch(
          CommonActions.navigate({
            name: 'ContactInteractionHistory2',
            params: contactData,
          })
        );
      } else {
        logger.warn(`No entityId found for contact: ${contact.name}`, "NewInteraction");
      }
    } else {
      // This should not happen if ContactList is properly separating app users vs phone contacts
      logger.warn(`Contact pressed but no matchedUser found: ${contact.name} - this should use invite instead`, "NewInteraction");
    }
  };

  // Handles invite button press for phone-only contacts
  const handleInviteContact = async (contact: DisplayableContact) => {
    logger.debug(`Inviting contact: ${contact.name}`, "NewInteraction");
    
    // Extract phone number from original contact
    let phoneNumber = contact.statusOrPhone; // This should contain the phone number for phone-only contacts
    
    // If not in statusOrPhone, try to get it from the original contact
    if (!phoneNumber && contact.originalContact) {
      const originalContact = contact.originalContact as NormalizedContact;
      phoneNumber = originalContact.phoneNumber || originalContact.rawPhoneNumber;
    }
    
    if (!phoneNumber) {
      logger.warn(`No phone number found for contact: ${contact.name}`, "NewInteraction");
      return;
    }
    
    try {
      await inviteContactViaSMS({
        name: contact.name,
        phoneNumber: phoneNumber,
      });
      logger.info(`Successfully initiated invite for: ${contact.name}`, "NewInteraction");
    } catch (error) {
      logger.error(`Failed to invite contact: ${contact.name}`, error);
    }
  };

  // Handle search result selection
  const handleSearchResultPress = (searchResult: SearchResult) => {
    logger.debug(`Search result pressed: ${searchResult.name} (ID: ${searchResult.id})`, "NewInteraction");
    
    const contactData = {
      contactId: searchResult.id, // Use entity ID directly from search results
      contactName: searchResult.name,
      contactInitials: searchResult.initials,
      contactAvatarColor: searchResult.avatarColor,
      forceRefresh: true,
      timestamp: new Date().getTime(),
    };
    
    // 1. Dismiss the modal first
    navigation.goBack();

    // 2. After interactions (like modal dismiss animation) have settled, navigate to the nested screen
    InteractionManager.runAfterInteractions(() => {
      logger.debug(`After modal dismiss, navigating to App/Contacts -> ContactInteractionHistory2 with params: ${JSON.stringify(contactData)}`, "NewInteraction");
      navigation.navigate('App', {
        screen: 'Contacts', // Target tab
        params: {           // Params for the nested InteractionsNavigator
          screen: 'ContactInteractionHistory2', // Target screen within InteractionsNavigator
          params: contactData,                // Params for ContactInteractionHistory2
        },
      });
    });
  };

  // Memoize styles
  const styles = useMemo(() => StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: theme.colors.background,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card },
    closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary },
    emptySpace: { width: 40 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.inputBackground, borderRadius: theme.borderRadius.xl, margin: theme.spacing.md, marginTop: theme.spacing.sm + 2, marginBottom: theme.spacing.lg, paddingHorizontal: theme.spacing.sm, height: 40, borderWidth: 1, borderColor: theme.colors.inputBorder },
    searchIcon: { marginRight: theme.spacing.sm },
    searchInput: { flex: 1, fontSize: theme.typography.fontSize.sm, color: theme.colors.inputText },
    scrollView: { flex: 1 },
    section: { paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg },
    fullWidthSection: { marginBottom: theme.spacing.lg }, // New style for full-width sections like search results
    sectionTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: theme.spacing.md -2 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md - 2 },
    sectionSubtitle: { fontSize: theme.typography.fontSize.sm -1, fontWeight: '600', color: theme.colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
    hideButton: { color: theme.colors.primary, fontSize: theme.typography.fontSize.sm, fontWeight: '500' },
    addOptions: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm },
    addOption: { flex: 1, height: 56, backgroundColor: theme.colors.inputBackground, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg + 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.md },
    addOptionText: { fontSize: theme.typography.fontSize.md, fontWeight: '600', color: theme.colors.textPrimary },
    recentContactsContainer: { flexDirection: 'row', paddingVertical: theme.spacing.xs + 2 },
    recentContactItem: { width: 70, alignItems: 'center', marginRight: theme.spacing.sm + 2 },
    recentAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.xs + 1 },
    recentAvatarText: { color: theme.colors.white, fontSize: theme.typography.fontSize.xl, fontWeight: 'bold' },
    recentContactName: { fontSize: theme.typography.fontSize.xs, fontWeight: '500', color: theme.colors.textPrimary, textAlign: 'center', width: 65 },
    contactsList: { marginTop: theme.spacing.sm },
    contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
    avatarText: { color: theme.colors.white, fontSize: theme.typography.fontSize.lg, fontWeight: 'bold' },
    contactInfo: { flex: 1 },
    contactName: { fontSize: theme.typography.fontSize.md, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 2 },
    contactStatus: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary },
    searchLoader: { marginLeft: theme.spacing.sm },
    contactsPermissionText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.md, lineHeight: 20 },
    contactsPermissionButton: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, paddingVertical: theme.spacing.sm + 2, paddingHorizontal: theme.spacing.lg, alignItems: 'center', justifyContent: 'center' },
    contactsPermissionButtonText: { color: theme.colors.white, fontSize: theme.typography.fontSize.md, fontWeight: '600' },
    showMoreButton: { paddingVertical: theme.spacing.sm, alignItems: 'center' },
    showMoreText: { color: theme.colors.primary, fontSize: theme.typography.fontSize.sm, fontWeight: '500' },
    loadingContactsContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md },
    loadingContactsText: { marginLeft: theme.spacing.sm, fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary },
  }), [theme]);

  // Render a recent contact avatar
  const renderRecentContact = (contact: DisplayableContact) => (
    <TouchableOpacity 
      key={contact.id}
      style={styles.recentContactItem}
      onPress={() => handleContactPress(contact)}
    >
      <View style={[styles.recentAvatar, { backgroundColor: contact.avatarColor }]}>
        <Text style={styles.recentAvatarText}>{contact.initials}</Text>
      </View>
      <Text style={styles.recentContactName} numberOfLines={1} ellipsizeMode="tail">
        {contact.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New chat</Text>
        <View style={styles.emptySpace} />
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Name, @Swaptag, phone, email"
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {isLoadingEntitySearch && (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.searchLoader} />
        )}
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Add New Contact Section */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add new contact</Text>
          
          <View style={styles.addOptions}>
            <TouchableOpacity style={styles.addOption} onPress={handleScanQR}>
              <Text style={styles.addOptionText}>Scan QR code</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.addOption} onPress={handleAddManually}>
              <Text style={styles.addOptionText}>Add manually</Text>
            </TouchableOpacity>
          </View>
        </View> */}
        
        {/* Recent Contacts Section */}
        {!searchQuery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent contacts</Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentContactsContainer}
            >
              {recentContacts.map(contact => renderRecentContact(contact))}
            </ScrollView>
          </View>
        )}
        
        {/* USE THE NEW ContactList COMPONENT HERE */}
        {/* This replaces the old SWAP CONTACTS and FROM YOUR PHONE sections */}
        {!searchQuery && (
           <ContactList
            appUserContacts={appUserContacts}
            phoneOnlyContacts={phoneOnlyContacts}
            isLoading={isLoadingInitialContacts || isLoadingContacts}
            onContactPress={handleContactPress}
            onInviteContact={handleInviteContact}
            permissionGranted={hasContactsPermission}
            onRequestPermission={handleRequestContactsPermission}
            isLoadingPermission={isLoadingContacts}
            areListsVisible={true}
          />
        )}
        
        {/* Search Results Section - Only shown when searchQuery is active */}
        {searchQuery && (
          <View style={styles.fullWidthSection}>
            <SearchResultsList
              searchResults={searchResults}
              isLoading={isLoadingEntitySearch}
              searchQuery={searchQuery}
              hasSearched={hasSearched}
              onItemSelect={handleSearchResultPress}
              emptyStateTitle={`No results found for "${searchQuery}"`}
              emptyStateSubtitle="Try a different search term or add this contact manually"
              scrollable={false}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NewInteraction2; 