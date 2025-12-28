import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
  InteractionManager,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { InteractionsStackParamList } from '../../navigation/interactions/interactionsNavigator';
import SearchHeader from '../header/SearchHeader';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthContext } from '../auth/context/AuthContext';
import { useInteractions, InteractionItem } from '../../hooks-data/useInteractions';
// NOTE: usePrefetchTimeline removed - local-first architecture doesn't need prefetch (SQLite is instant)
import { useDeleteInteraction, useArchivedCount } from '../../hooks-actions/useDeleteInteraction';
// NOTE: useRealtimeUpdates removed - BackgroundSyncService handles local-first updates
import { websocketService } from '../../services/websocketService';
import { userStateManager } from '../../services/UserStateManager';
// EntitySearchResult type - keeping for compatibility
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
import { getAvatarColor } from '../../utils/avatarUtils';
import { useRefreshByUser } from '../../hooks/useRefreshByUser';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/rootNavigator';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import contactsService, { ContactMatch, DeviceContact, NormalizedContact } from '../../services/ContactsService';
import ContactList, { DisplayableContact } from '../../components2/ContactList';
import SearchOverlay from '../header/SearchOverlay';
import { inviteContactViaSMS } from '../../utils/inviteUtils';
import { networkService } from '../../services/NetworkService';
import apiClient from '../../_api/apiClient';

// Define navigation type more precisely for nested context
// InteractionsHistory is a screen in InteractionsStack, which is inside a Tab in RootStack's App screen.
type AppScreenProps = BottomTabScreenProps<any>; // Replace 'any' with your Tab ParamList if defined
type InteractionsNavigationProp = StackNavigationProp<RootStackParamList, 'App'>;

// Define the type for the route prop specifically for InteractionsHistory
// This now includes the optional navigateToContact parameter
type InteractionsHistoryRouteProp = RouteProp<RootStackParamList, 'App'>;

// Interface for displayed chat items - can be mapped from InteractionItem
interface DisplayChat {
  id: string;
  name: string;
  message: string; // This will be lastActivitySnippet from InteractionItem or a default
  time: string;    // This will be formatted from last_activity_at or a default
  avatar: string;  // Initials or derived from avatar_url
  avatarColor?: string; // For colored initial avatars
  isVerified?: boolean;
  isGroup?: boolean;
  hasChecked?: boolean; // This might not be directly available, depends on backend/message status
  sender?: string; // This might not be directly available from top-level interaction
  type?: 'friend' | 'business'; // This needs to be derived based on entity_type of members
}

// Contact interface is removed, DisplayableContact from ContactList will be used.

// Tab enum for type safety
enum InteractionTab {
  All = 0,
  Friends = 1,
  Business = 2,
}

// Tab component props need theme
interface TabProps {
  title: string;
  isActive: boolean;
  badge?: number;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
  flex?: number; // Add flex property to control tab width
}

const Tab: React.FC<TabProps> = ({ title, isActive, badge, onPress, theme, flex = 1 }) => {
  // Tab styles now depend on the passed theme
  const tabStyles = StyleSheet.create({
    tab: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      marginHorizontal: theme.spacing.xs,
      backgroundColor: isActive ? theme.colors.primary : theme.colors.grayUltraLight,
      flex: flex, // Use flex to control width
    },
    tabText: {
      color: isActive ? theme.colors.white : theme.colors.textSecondary,
      fontWeight: isActive ? "600" : "500",
      fontSize: theme.typography.fontSize.sm,
    },
    tabBadge: {
      backgroundColor: isActive ? theme.colors.white : theme.colors.primary,
      borderRadius: theme.borderRadius.circle,
      paddingHorizontal: theme.spacing.xs + 2,
      paddingVertical: 2,
      marginLeft: theme.spacing.sm,
      minWidth: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    tabBadgeText: {
      color: isActive ? theme.colors.primary : theme.colors.white,
      fontSize: 10,
      fontWeight: "bold",
    },
  });

  return (
    <TouchableOpacity 
      style={tabStyles.tab}
      onPress={onPress}
    >
      <Text style={tabStyles.tabText}>{title}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={tabStyles.tabBadge}>
          <Text style={tabStyles.tabBadgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Helper function to get name initials 
const getInitials = (name: string): string => {
  if (!name) return '??';
  
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// SearchHeader height constant (matches SearchHeader.tsx: 40px content + 10px padding)
// SEARCH_HEADER_HEIGHT removed - no longer needed for padding calculation

const InteractionsHistory2: React.FC = (): JSX.Element => {
  const navigation = useNavigation<InteractionsNavigationProp>();
  const route = useRoute<InteractionsHistoryRouteProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const authContext = useAuthContext();
  const user = authContext.user;
  const isAuthenticated = authContext.isAuthenticated;

  // NOTE: Real-time updates handled by BackgroundSyncService (local-first architecture)

  // Delete/Archive interaction mutation
  const deleteInteractionMutation = useDeleteInteraction();

  // Archived interactions count (for badge display)
  const { count: archivedCount } = useArchivedCount();

  // Note: headerOffset removed - contentContainer is already below SearchHeader in normal flow

  // Scroll tracking for SearchHeader blur effect
  const scrollY = useRef(new Animated.Value(0)).current;

  // 🚀 SIMPLIFIED TanStack Query usage - no complex loading state management
  const {
    interactions: interactionsList,
    isLoading: isLoadingInteractions,
    refetch: refreshInteractions,
    isError: hasInteractionsError,
    error: interactionsError,
    isRefetching
  } = useInteractions({ enabled: !!user });

  // NOTE: Real-time updates and prefetching not needed with local-first architecture
  // SQLite reads are instant (<10ms), no preloading required

  // Industry-standard refresh hook - per-screen local state (TanStack Query pattern)
  const { refreshing, onRefresh } = useRefreshByUser(refreshInteractions);

  const [activeTab, setActiveTab] = useState<InteractionTab>(InteractionTab.All);
  
  // Search state - Google Maps style
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Contact-related state (similar to NewInteraction2.tsx)
  const [allDeviceContacts, setAllDeviceContacts] = useState<ContactMatch[]>([]);
  const [appUserContacts, setAppUserContacts] = useState<DisplayableContact[]>([]);
  const [phoneOnlyContacts, setPhoneOnlyContacts] = useState<DisplayableContact[]>([]);
  const [hasContactsPermission, setHasContactsPermission] = useState<boolean | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingInitialContacts, setIsLoadingInitialContacts] = useState(true);
  const [contactsSynced, setContactsSynced] = useState(false);
  const [showContactLists, setShowContactLists] = useState(true);
  
  // Add refs to prevent rapid state changes causing "magazine page" effect
  const isContactsInitializing = useRef(false);
  const isMounted = useRef(true);
  const hasInitialContactsRun = useRef(false);
  
  // 🚀 SIMPLIFIED: Remove complex render stability controls
  const [swipeableRefs, setSwipeableRefs] = useState<{[key: string]: React.RefObject<Swipeable>}>({});
  
  // Component lifecycle with mount stability
  const componentId = useRef(Date.now());
  
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  const initializeContacts = useCallback(async (requestPermission: boolean = false, forceRefreshContacts: boolean = false) => {
    // Prevent multiple simultaneous executions to avoid UI glitches
    if (isContactsInitializing.current) {
      logger.debug('[InteractionsHistory] Contacts already initializing, skipping duplicate call', "InteractionsHistory");
      return;
    }
    
    // If component is unmounted, don't continue
    if (!isMounted.current) {
      logger.debug('[InteractionsHistory] Component unmounted, skipping contacts initialization', "InteractionsHistory");
      return;
    }
    
    // Mark as initializing to prevent rapid calls
    isContactsInitializing.current = true;
    
    setIsLoadingInitialContacts(true);
    setIsLoadingContacts(true);

    try {
      // ⚡ STEP 1: Load cached contacts INSTANTLY (local-first)
      logger.debug('[InteractionsHistory] 🚀 STEP 1: Loading cached contacts instantly...', "InteractionsHistory");
      
      try {
        // Try to load from cache first for instant UI
        const cachedPlatformMatches = await contactsService.getMatchedPlatformContacts(false); // Don't force refresh
        const cachedPhoneOnly = await contactsService.getPhoneOnlyNormalizedContacts(false); // Don't force refresh
        
        if (cachedPlatformMatches.length > 0 || cachedPhoneOnly.length > 0) {
          logger.debug(`[InteractionsHistory] ⚡ INSTANT: Loaded ${cachedPlatformMatches.length} platform + ${cachedPhoneOnly.length} phone contacts from cache`, "InteractionsHistory");
          
          // Map cached contacts for instant display
          const cachedAppUsers = cachedPlatformMatches.map(cm => {
            const displayName = cm.matchedUser?.displayName || cm.contact.displayName;
            const entityId = cm.matchedUser?.entityId || cm.contact.deviceContactId || `app-user-${cm.contact.phoneNumber}`;
            const initials = getInitials(displayName);
            const avatarColor = getAvatarColor(entityId); // Use entity_id for consistent colors

            return {
              id: entityId,
              name: displayName,
              statusOrPhone: `@${cm.matchedUser?.username || 'user'}`,
              initials: initials,
              avatarColor: avatarColor,
              avatarUrl: cm.matchedUser?.avatarUrl,
              originalContact: cm,
            };
          });
          
          const cachedPhoneUsers = cachedPhoneOnly.map(normContact => {
            const displayName = normContact.displayName;
            const contactId = normContact.deviceContactId || `phone-${normContact.phoneNumber}`;
            const initials = getInitials(displayName);
            const avatarColor = getAvatarColor(contactId); // Use contact ID for consistent colors

            return {
              id: contactId,
              name: displayName,
              statusOrPhone: normContact.rawPhoneNumber,
              initials: initials,
              avatarColor: avatarColor,
              originalContact: normContact,
            };
          });
          
          // Update UI instantly with cached data
          setAppUserContacts(cachedAppUsers);
          setPhoneOnlyContacts(cachedPhoneUsers);
          setIsLoadingInitialContacts(false); // Remove loading spinner immediately
          
          logger.debug('[InteractionsHistory] ⚡ INSTANT UI UPDATE: Contacts loaded from cache', "InteractionsHistory");
        }
      } catch (cacheError) {
        logger.debug('[InteractionsHistory] No cached contacts available, proceeding with fresh load', "InteractionsHistory");
      }

      // ⚡ STEP 2: Handle permissions (background)
      let currentHasPermission = hasContactsPermission;
      if (requestPermission) {
        logger.debug('[InteractionsHistory] 🔐 STEP 2: Checking contacts permission...', "InteractionsHistory");
        currentHasPermission = await contactsService.checkPermission();
        setHasContactsPermission(currentHasPermission);
      }
      
      // ⚡ STEP 3: Refresh from device/platform (background)
      if (currentHasPermission) {
        logger.debug(`[InteractionsHistory] 🔄 STEP 3: Background refresh (forceRefresh: ${forceRefreshContacts})...`, "InteractionsHistory");
        
        // Fetch fresh platform-matched (app user) contacts
        const platformMatches = await contactsService.getMatchedPlatformContacts(forceRefreshContacts);
        const appUsersMapped = platformMatches.map(cm => {
          const displayName = cm.matchedUser?.displayName || cm.contact.displayName;
          const entityId = cm.matchedUser?.entityId || cm.contact.deviceContactId || `app-user-${cm.contact.phoneNumber}`;
          const initials = getInitials(displayName);
          const avatarColor = getAvatarColor(entityId); // Use entity_id for consistent colors

          return {
            id: entityId,
            name: displayName,
            statusOrPhone: `@${cm.matchedUser?.username || 'user'}`,
            initials: initials,
            avatarColor: avatarColor,
            avatarUrl: cm.matchedUser?.avatarUrl,
            originalContact: cm,
          };
        });
        setAppUserContacts(appUsersMapped);
        logger.debug(`[InteractionsHistory] Mapped ${platformMatches.length} platform contacts to DisplayableContact.`);

        // Fetch phone-only contacts (NormalizedContact[])
        const phoneOnlyNormalized = await contactsService.getPhoneOnlyNormalizedContacts(forceRefreshContacts);
        const phoneOnlyMapped = phoneOnlyNormalized.map(normContact => {
          const displayName = normContact.displayName;
          const contactId = normContact.deviceContactId || `phone-${normContact.phoneNumber}`;
          const initials = getInitials(displayName);
          const avatarColor = getAvatarColor(contactId); // Use contact ID for consistent colors

          return {
            id: contactId,
            name: displayName,
            statusOrPhone: normContact.rawPhoneNumber,
            initials: initials,
            avatarColor: avatarColor,
            originalContact: normContact,
          };
        });
        setPhoneOnlyContacts(phoneOnlyMapped);
        
        setContactsSynced(true);
        logger.debug(`[InteractionsHistory] Contacts loaded/synced. App Users: ${appUsersMapped.length}, Phone Only: ${phoneOnlyMapped.length}`, "InteractionsHistory");

      } else {
        logger.warn('[InteractionsHistory] No contacts permission. Contacts will not be loaded.', "InteractionsHistory");
        setIsLoadingInitialContacts(false);
      }
    } catch (error) {
      logger.error('[InteractionsHistory] Error initializing contacts:', error, "InteractionsHistory");
      if (isMounted.current) {
        setIsLoadingInitialContacts(false);
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingContacts(false);
        if (isLoadingInitialContacts) setIsLoadingInitialContacts(false);
        hasInitialContactsRun.current = true;
      }
      // Always mark as not initializing, even if component unmounted
      isContactsInitializing.current = false;
    }
  }, [hasContactsPermission]);
  
  // Add this helper function to get or create a ref for a chat item
  const getSwipeableRef = useCallback((id: string) => {
    if (!swipeableRefs[id]) {
      const updatedRefs = {
        ...swipeableRefs,
        [id]: React.createRef<Swipeable>()
      };
      setSwipeableRefs(updatedRefs);
    }
    return swipeableRefs[id];
  }, [swipeableRefs]);

  // 🚀 SIMPLIFIED: Remove complex useFocusEffect logic
  useFocusEffect(
    useCallback(() => {
      // Debug route params
      logger.debug('[InteractionsHistory] Screen focused', "InteractionsHistory");
      
      // 🚀 ENHANCED DEBUGGING: Log detailed WebSocket state for recipient device investigation
      console.log('🔥🔥🔥 [InteractionsHistory] SCREEN FOCUS - WebSocket Status Check:', {
        hasUser: !!user,
        userEntityId: user?.entityId,
        userProfileId: user?.profileId,
        isSocketConnected: websocketService.isSocketConnected(),
        isSocketAuthenticated: websocketService.isSocketAuthenticated(),
        timestamp: new Date().toISOString(),
        deviceType: 'DEBUGGING_RECIPIENT_ISSUE'
      });
      
      // 🚀 PHASE 1.1: Join profile room for guaranteed message delivery
      // 🔧 FIX: Use API client profile ID (from auth token) instead of user object profile ID for consistency
      const apiProfileId = apiClient.getProfileId();
      const userProfileId = user?.profileId;
      
      console.log('🔥🔥🔥 [InteractionsHistory] PROFILE ID COMPARISON:', {
        apiProfileId,
        userProfileId,
        match: apiProfileId === userProfileId,
        timestamp: new Date().toISOString()
      });
      
      // 🔧 DATABASE-FIRST FIX: Use entity_id for messaging rooms (unified personal/business system)
      // Handle async getEntityId call properly within the focus effect
      apiClient.getEntityId().then((apiEntityId) => {
        if (apiEntityId) {
          logger.debug(`[InteractionsHistory] [WebSocket] Joining entity room: ${apiEntityId}`, "InteractionsHistory");
          console.log('🔥🔥🔥 [InteractionsHistory] ATTEMPTING ENTITY ROOM JOIN (DATABASE-FIRST):', {
            entityId: apiEntityId,
            userEntityId: user?.entityId,
            isSocketConnected: websocketService.isSocketConnected(),
            isSocketAuthenticated: websocketService.isSocketAuthenticated(),
            source: 'JWT_TOKEN_ENTITY_ID',
            timestamp: new Date().toISOString()
          });
          websocketService.joinEntityRoom(apiEntityId);
        } else {
          console.log('🔥🔥🔥 [InteractionsHistory] CANNOT JOIN ENTITY ROOM (DATABASE-FIRST):', {
            hasUser: !!user,
            apiEntityId,
            userEntityId: user?.entityId,
            reason: !apiEntityId ? 'NO_API_ENTITY_ID' : 'UNKNOWN',
            timestamp: new Date().toISOString()
          });
        }
      }).catch((error) => {
        logger.error('[InteractionsHistory] Error getting entity ID:', error);
        console.log('🔥🔥🔥 [InteractionsHistory] ENTITY ID ERROR:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });

      // 🚀 PHASE 2.1: Clear current chat state when on interactions list
      logger.debug(`[UserState] User on interactions list - clearing current chat`, "InteractionsHistory");
      userStateManager.setCurrentChat(null);
      
      // Initialize contacts if needed
      if (!contactsSynced && !hasInitialContactsRun.current) { 
        if (hasContactsPermission === null) {
          logger.debug('[InteractionsHistory] Loading contacts with permission request', "InteractionsHistory");
            initializeContacts(true, false);
        } else if (hasContactsPermission) {
          logger.debug('[InteractionsHistory] Loading contacts with existing permission', "InteractionsHistory");
            initializeContacts(false, false);
          }
      }

      // Handle navigation params
      const navigateToContactParams = route.params?.navigateToContact;
      const navigateToNewChat = route.params?.navigateToNewChat;
      
      if (navigateToContactParams) {
        const paramsForHistory: RootStackParamList['ContactInteractionHistory2'] = navigateToContactParams;
        navigation.navigate(
          'ContactInteractionHistory2',
          paramsForHistory
        );
        navigation.setParams({ navigateToContact: undefined } as any);
      }
      
        if (navigateToNewChat) {
          InteractionManager.runAfterInteractions(() => {
            (navigation as StackNavigationProp<RootStackParamList>).navigate("NewInteraction");
          });
          navigation.setParams({ navigateToNewChat: undefined } as any);
        }
        
        return () => {
        logger.debug("[InteractionsHistory] Screen unfocused", "InteractionsHistory");
        // Note: We don't leave profile room here since we want to receive messages
        // even when navigating to other screens within the app
      };
    }, [route.params?.navigateToContact, route.params?.navigateToNewChat, contactsSynced, hasContactsPermission, initializeContacts, navigation, user?.entityId])
  );

  // Handle search activation
  const handleSearchPress = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      setIsSearchActive(true);
    });
  }, []);
    
  // Handle search cancellation
  const handleSearchCancel = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      setIsSearchActive(false);
      setSearchQuery("");
    });
  }, []);

  // Handle search query changes
  const handleSearchQueryChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Handle search item selection
  const handleSearchItemSelect = (item: any) => {
    logger.debug(`Search item selected: ${item.name} (${item.type})`, "InteractionsHistory");
    
    // Close search
    setIsSearchActive(false);
    setSearchQuery("");
    
    // Navigate to the selected item
    const navParams: RootStackParamList['ContactInteractionHistory2'] = {
      contactId: item.id,
      contactName: item.name,
      contactInitials: item.initials,
      contactAvatarColor: item.avatarColor,
      isGroup: item.type === 'interaction' ? item.originalData?.is_group : false,
      forceRefresh: true,
      timestamp: new Date().getTime(),
    };

    navigation.navigate('ContactInteractionHistory2', navParams);
  };

  const handleCloseSearchModal = () => {
    setIsSearchActive(false);
  };
  
      const handleNewChat = () => {
      // Use InteractionManager to ensure smooth navigation
      InteractionManager.runAfterInteractions(() => {
        (navigation as StackNavigationProp<RootStackParamList>).navigate("NewInteraction");
      });
    };

  const handleProfilePress = () => {
    const source = 'Interactions'; 
    logger.debug(`[InteractionsHistory2] Navigating to ProfileModal, sourceRoute: ${source}`, "InteractionsHistory");
    navigation.navigate("ProfileModal", { sourceRoute: source }); // This is in RootStackParamList
  };

  // Handle tab change
  const handleTabChange = (tab: InteractionTab) => {
    setActiveTab(tab);
  };

  // Helper to format time (simplified)
  const formatTime = (isoString?: string): string => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      // Could add more complex logic for "Mon", "Yesterday", etc.
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Map InteractionItem from DataContext to DisplayChat for rendering
  const mappedChats: DisplayChat[] = useMemo(() => {
    // Return empty array only if we have no data
    if (interactionsList.length === 0) {
      return [];
    }
    
    if (!user || !user.entityId) {
      return [];
    }

    // Sort by last_activity_at for real-time reordering (most recent first)
    const sortedInteractions = [...interactionsList].sort((a, b) => {
      const aTime = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
      const bTime = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
      return bTime - aTime; // Most recent first
    });
    

    const mappedResult = sortedInteractions.map((interaction: InteractionItem): DisplayChat => {
      let chatName = interaction.name || 'Group Interaction';
      let avatarText = '??';
      let interactionType: 'friend' | 'business' = 'friend';
      let avatarColor = theme.colors.primary;
      let entityIdForColor = interaction.id; // Default to interaction ID

      if (!interaction.is_group && interaction.members && interaction.members.length > 0) {
        const otherMember = interaction.members.find(
          (member) => member.entity_id !== user.entityId
        );

        if (otherMember) {
          chatName = otherMember.display_name || 'Unknown User';
          avatarText = getInitials(chatName);
          entityIdForColor = otherMember.entity_id; // Use other member's entity_id
          avatarColor = getAvatarColor(entityIdForColor); // Use entity_id for consistent colors
          interactionType = otherMember.entity_type === 'business' ? 'business' : 'friend';
        } else {
          chatName = 'Self Interaction';
          avatarText = user.firstName ? getInitials(user.firstName) : (user.email ? user.email.substring(0,2).toUpperCase() : 'ME');
          avatarColor = getAvatarColor(user.entityId); // Use own entity_id
        }
      } else if (interaction.is_group) {
        avatarText = getInitials(interaction.name || 'Group');
        avatarColor = getAvatarColor(interaction.id); // Use group interaction ID
        interactionType = 'business';
      }

      const activitySnippet = interaction.last_activity_snippet || (interaction.is_group ? 'Group created' : 'Interaction started');
      const lastActivityTime = interaction.last_activity_at || interaction.updated_at || '';

      const displayChatItem = {
        id: interaction.id,
        name: chatName,
        message: activitySnippet,
        time: formatTime(lastActivityTime),
        avatar: avatarText,
        avatarColor: avatarColor,
        isGroup: interaction.is_group,
        type: interactionType,
      };

      return displayChatItem;
    });
    
    return mappedResult;
  }, [interactionsList, user?.entityId, theme.colors]);

  // Filter chats based on active tab
  const getFilteredChats = () => {
    if (!mappedChats) return [];
    switch (activeTab) {
      case InteractionTab.Friends:
        return mappedChats.filter(chat => chat.type === 'friend');
      case InteractionTab.Business:
        return mappedChats.filter(chat => chat.type === 'business');
      default:
        return mappedChats;
    }
  };

  // Calculate badge counts
  const friendsCount = mappedChats.filter(chat => chat.type === 'friend').length;
  const businessCount = mappedChats.filter(chat => chat.type === 'business').length;
  const allCount = mappedChats.length;

  // Get filtered chats
  const filteredDisplayChats = getFilteredChats();

  // Memoize styles
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      flex: 1,
    },
    mainContent: {
      flex: 1,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F1F5F9',
      borderRadius: 20,
      margin: 16,
      paddingHorizontal: 12,
      height: 40,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      marginLeft: 8,
      color: '#1A202C',
    },
    notificationIcon: {
      padding: 4,
    },
    tabsOuterContainer: {
      backgroundColor: theme.colors.background,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tabsContainer: {
      flexDirection: "row",
      paddingHorizontal: theme.spacing.md,
      width: '100%', // Ensure container takes full width
      justifyContent: 'space-between', // Distribute tabs evenly
    },
    scrollView: {
      flex: 1,
      // Note: No paddingTop needed - contentContainer is already below SearchHeader in the flow
    },
    chatItem: {
      flexDirection: 'row',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    avatarText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: 'bold',
    },
    chatContent: {
      flex: 1,
      justifyContent: 'center',
    },
    chatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    nameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    name: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginRight: theme.spacing.xs,
    },
    verifiedIcon: {
      marginLeft: theme.spacing.xs,
      color: theme.colors.info,
    },
    checkedIcon: {
      marginLeft: theme.spacing.sm,
      color: theme.colors.success,
    },
    time: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sender: {
      fontWeight: '500',
      marginRight: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    message: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    status: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.isDark ? theme.colors.grayUltraLight : theme.colors.card,  // White background in light mode
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.textSecondary,  // Gray text for visibility on white header bars
      textTransform: 'uppercase',
    },
    sectionAction: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    emptyStateText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.colors.background,
    },
    emptyText: {
      fontSize: 18,
      color: theme.colors.grayMedium,
      marginTop: 20,
      fontWeight: '600',
    },
    emptySubText: {
      fontSize: 14,
      color: theme.colors.grayMedium,
      marginTop: 8,
      textAlign: 'center',
      marginBottom: 24,
      opacity: 0.8,
    },
    newChatButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
    },
    newChatButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
  }), [theme]);

  const renderAvatar = (item: DisplayChat | DisplayableContact) => {
    // Check if avatarColor is available on the item, default to theme.colors.primary otherwise
    let bgColor = (item as DisplayChat).avatarColor || (item as DisplayableContact).avatarColor || theme.colors.primary;
    const initials = (item as DisplayChat).avatar || (item as DisplayableContact).initials;

    // Specific avatar for "Swap" can be handled if needed, or make it data-driven
    if (item.name === 'Swap' && initials === 'S') {
      bgColor = theme.colors.primary;
      return (
        <View style={[styles.avatar, { backgroundColor: bgColor }]}>
          <Ionicons name="repeat" size={24} color={theme.colors.white} />
        </View>
      );
    }
    // Fallback: if no avatarColor provided, use item ID for consistent color
    if (!(item as DisplayChat).avatarColor && !(item as DisplayableContact).avatarColor) {
      bgColor = getAvatarColor(item.id); // Use entity_id/item ID for consistent colors
    }

    return (
      <View style={[styles.avatar, { backgroundColor: bgColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    );
  };

  const handleChatPress = (chat: DisplayChat, isFromSearch: boolean = false) => {
    const fullInteractionItem = !isFromSearch ? interactionsList.find(item => item.id === chat.id) : null;
    let actualContactEntityId: string | undefined = undefined;
    let resolvedContactName = chat.name;
    let resolvedContactInitials = chat.avatar;
    let resolvedContactAvatarColor = chat.avatarColor;
    let actualInteractionId: string | undefined = !isFromSearch ? chat.id : undefined;

    if (isFromSearch) { // Selected from entity search results (platform users/businesses)
      actualContactEntityId = chat.id; // chat.id is entity_id here
    } else if (fullInteractionItem && !fullInteractionItem.is_group && fullInteractionItem.members && user && user.entityId) {
      const otherMember = fullInteractionItem.members.find(m => m.entity_id !== user.entityId);
      if (otherMember) {
        actualContactEntityId = otherMember.entity_id;
        resolvedContactName = otherMember.display_name || chat.name;
        resolvedContactInitials = getInitials(resolvedContactName);
        // Avatar color re-calculation logic can be centralized or derived if needed
      }
      actualInteractionId = fullInteractionItem.id;
    } else if (fullInteractionItem?.is_group) {
      actualContactEntityId = fullInteractionItem.id; // Group ID
      actualInteractionId = fullInteractionItem.id;
    }

    const chatPressParams: RootStackParamList['ContactInteractionHistory2'] = {
      interactionId: actualInteractionId,
      contactId: actualContactEntityId || '', 
      contactName: resolvedContactName,
      contactInitials: resolvedContactInitials,
      contactAvatarColor: resolvedContactAvatarColor || theme.colors.primary,
      isGroup: isFromSearch ? false : chat.isGroup, // Search results are direct entities
      forceRefresh: true,
      timestamp: new Date().getTime()
    };
    navigation.navigate("ContactInteractionHistory2", chatPressParams);
  };
  
  // Handles press on a contact from the ContactList component
  const handleContactListItemPress = (contact: DisplayableContact) => {
    logger.debug(`[InteractionsHistory] ContactListItem pressed: ${contact.name} (ID: ${contact.id})`, "InteractionsHistory");
    
    // Only handle platform contacts (app users) - phone-only contacts should use invite button
    if (contact.originalContact && (contact.originalContact as ContactMatch).matchedUser) {
      const contactMatch = contact.originalContact as ContactMatch;
      const entityId = contactMatch.matchedUser?.entityId;
      
      if (entityId) {
        navigation.navigate("ContactInteractionHistory2", {
          contactId: entityId,
          contactName: contact.name,
          contactInitials: contact.initials,
          contactAvatarColor: contact.avatarColor,
          isGroup: false,
          forceRefresh: true,
          timestamp: Date.now(),
        });
      } else {
        logger.warn(`[InteractionsHistory] No entityId found for contact: ${contact.name}`, "InteractionsHistory");
      }
    } else {
      // This should not happen if ContactList is properly separating app users vs phone contacts
      logger.warn(`[InteractionsHistory] Contact pressed but no matchedUser found: ${contact.name}`, "InteractionsHistory");
    }
  };

  // Handles invite button press for phone-only contacts
  const handleInviteContact = async (contact: DisplayableContact) => {
    logger.debug(`[InteractionsHistory] Inviting contact: ${contact.name}`, "InteractionsHistory");
    
    // Extract phone number from original contact
    let phoneNumber = contact.statusOrPhone; // This should contain the phone number for phone-only contacts
    
    // If not in statusOrPhone, try to get it from the original contact
    if (!phoneNumber && contact.originalContact) {
      const originalContact = contact.originalContact as NormalizedContact;
      phoneNumber = originalContact.phoneNumber || originalContact.rawPhoneNumber;
    }
    
    if (!phoneNumber) {
      logger.warn(`[InteractionsHistory] No phone number found for contact: ${contact.name}`, "InteractionsHistory");
      return;
    }
    
    try {
      await inviteContactViaSMS({
        name: contact.name,
        phoneNumber: phoneNumber,
      });
      logger.info(`[InteractionsHistory] Successfully initiated invite for: ${contact.name}`, "InteractionsHistory");
    } catch (error) {
      logger.error(`[InteractionsHistory] Failed to invite contact: ${contact.name}`, error);
    }
  };

  // Handle interaction deletion (smart: deletes if no transactions, archives if has transactions)
  const handleDeleteInteraction = (interactionId: string) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              logger.debug(`[InteractionsHistory] Deleting/archiving conversation: ${interactionId}`, "InteractionsHistory");
              const result = await deleteInteractionMutation.mutateAsync(interactionId);

              // If archived (has transactions), show informational alert
              if (result.action === 'archived') {
                Alert.alert(
                  "Conversation Archived",
                  "This conversation was archived because it contains financial transactions. You can find it in the Archived section."
                );
              }

              // Refresh interactions list
              refreshInteractions();
            } catch (error) {
              logger.error(`[InteractionsHistory] Failed to delete conversation: ${interactionId}`, error);
              Alert.alert("Error", "Failed to delete conversation. Please try again.");
            }
          }
        }
      ]
    );
  };

  // COMMENTED OUT - Mute feature not implemented yet (notifications not ready)
  // const handleMuteInteraction = (interactionId: string) => {
  //   logger.debug(`Muting conversation with ID: ${interactionId}`, "InteractionsHistory");
  //   // API call would go here
  //   refreshInteractions();
  // };

  // COMMENTED OUT - Archive is now handled automatically by handleDeleteInteraction
  // (if interaction has transactions, it gets archived instead of deleted)
  // const handleArchiveInteraction = (interactionId: string) => {
  //   logger.debug(`Archiving conversation with ID: ${interactionId}`, "InteractionsHistory");
  //   // API call would go here
  //   refreshInteractions();
  // };

  // Navigate to archived interactions screen
  const handleArchivedPress = () => {
    logger.debug('[InteractionsHistory] Navigating to archived interactions', "InteractionsHistory");
    // Navigate to ArchivedInteractions screen
    navigation.navigate('ArchivedInteractions' as never);
  };

  // Render archived section (WhatsApp-style)
  const renderArchivedSection = () => {
    if (archivedCount <= 0) return null;

    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          backgroundColor: theme.colors.background,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
        }}
        onPress={handleArchivedPress}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.grayUltraLight,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: theme.spacing.md,
          }}
        >
          <Ionicons name="archive" size={20} color={theme.colors.textSecondary} />
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: theme.typography.fontSize.md,
            fontWeight: '500',
            color: theme.colors.textPrimary,
          }}
        >
          Archived
        </Text>
        <Text
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginRight: theme.spacing.xs,
          }}
        >
          {archivedCount}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  // Render swipe action buttons - simplified to single Delete button
  // (Delete auto-decides: no transactions = soft delete, has transactions = archive)
  const renderRightActions = (
    progress: any,
    dragX: any,
    interactionId: string
  ) => {

    // Create swipe action styles
    const actionStyles = StyleSheet.create({
      actionContainer: {
        width: 80, // Single button width
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
      },
      actionButton: {
        width: 80,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      },
      deleteButton: {
        backgroundColor: theme.colors.error,
      },
      actionText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 13,
        marginTop: 5,
      },
      buttonContent: {
        alignItems: 'center',
        justifyContent: 'center',
      }
    });

    return (
      <View style={actionStyles.actionContainer}>
        {/* Delete Button - auto-archives if interaction has transactions */}
        <View style={[
          actionStyles.actionButton,
          actionStyles.deleteButton
        ]}>
          <TouchableOpacity
            style={actionStyles.buttonContent}
            onPress={() => handleDeleteInteraction(interactionId)}
          >
            <Ionicons name="trash" size={22} color="white" />
            <Text style={actionStyles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Update renderChatItem to use enhanced Swipeable configuration
  const renderChatItem = (chat: DisplayChat, isFromSearch: boolean = false) => {
    const currentRef = getSwipeableRef(chat.id);
    
    return (
      <Swipeable
        ref={currentRef}
        renderRightActions={(progress, dragX) => 
          renderRightActions(progress, dragX, chat.id)
        }
        friction={1.5}      // Lower friction for smoother movement
        rightThreshold={40}
        overshootRight={false}  // Prevent overshooting
        containerStyle={{ backgroundColor: 'transparent' }}
        childrenContainerStyle={{ backgroundColor: theme.colors.background }}
        onSwipeableOpen={() => logger.debug(`Swipeable opened for chat: ${chat.id}`, "InteractionsHistory")}
        key={chat.id}
      >
        <TouchableOpacity 
          style={styles.chatItem}
          onPress={() => handleChatPress(chat, isFromSearch)}
        >
          {renderAvatar(chat)}
          
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{chat.name}</Text>
                {chat.isVerified && (
                  <Ionicons name="checkmark-circle" size={16} style={styles.verifiedIcon} />
                )}
              </View>
              <Text style={styles.time}>{chat.time}</Text>
            </View>
            
            <View style={styles.messageRow}>
              {chat.sender && (
                <Text style={styles.sender}>{chat.sender}</Text>
              )}
              <Text style={styles.message} numberOfLines={1} ellipsizeMode="tail">
                {chat.message}
              </Text>
              {chat.hasChecked && (
                <Ionicons name="checkmark" size={16} style={styles.checkedIcon} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // Helper to get initials for the header
  const getHeaderInitials = () => {
    // For business users, use business name initials
    if (user?.businessName) {
      const words = user.businessName.split(' ').filter(word => word.length > 0);
      if (words.length >= 2) {
        return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
      }
      if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
      }
    }

    // For personal users, use first/last name
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    // PROFESSIONAL: Use '??' fallback (matches avatarUtils.ts standard)
    return "??";
  };

  // Render empty state
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="chatbubbles-outline"
          size={60}
          color={theme.colors.grayMedium}
        />
        <Text style={styles.emptyText}>
          No conversations yet
        </Text>
        <Text style={styles.emptySubText}>
          Start a new interaction to begin messaging
        </Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewChat}
        >
          <Text style={styles.newChatButtonText}>Start New Interaction</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleRequestContactsPermission = useCallback(async () => {
    setIsLoadingContacts(true); 
    try {
      logger.debug('[InteractionsHistory] Requesting contacts permission...', "InteractionsHistory");
      const granted = await contactsService.requestPermission();
      setHasContactsPermission(granted); // This will update the state
      if (granted) {
        // Call initializeContacts. It will use the updated hasContactsPermission value in its next execution.
        await initializeContacts(false, true); 
    }
    } catch (error) {
      logger.error('[InteractionsHistory] Error requesting contacts permission:', error, "InteractionsHistory");
    } finally {
      setIsLoadingContacts(false);
    }
  }, [initializeContacts]); // initializeContacts is a stable useCallback now

  // 🚀 SIMPLIFIED: Show loading screen ONLY when there's no cached data and we're loading
  const shouldShowLoadingScreen = isLoadingInteractions && filteredDisplayChats.length === 0;

  if (shouldShowLoadingScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
         <SearchHeader
          onSearchPress={handleSearchPress}
            onNewChat={handleNewChat}
            onProfilePress={handleProfilePress}
          placeholder="Search interactions & contacts"
            rightIcons={[{ name: "add-circle", onPress: handleNewChat, color: theme.colors.primary }]}
            avatarUrl={user?.avatarUrl}
            initials={getHeaderInitials()}
          isSearchActive={isSearchActive}
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          onSearchCancel={handleSearchCancel}
          entityId={user?.entityId}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.emptyStateText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Search Header - Always visible, transforms based on search state */}
      <SearchHeader
        onSearchPress={handleSearchPress}
        onNewChat={handleNewChat}
        onProfilePress={handleProfilePress}
        placeholder="Search interactions & contacts"
        rightIcons={[{ name: "add-circle", onPress: handleNewChat, color: theme.colors.primary }]}
        avatarUrl={user?.avatarUrl}
        initials={getHeaderInitials()}
        showSearch={true}
        brandName="Swap"
        isSearchActive={isSearchActive}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        onSearchCancel={handleSearchCancel}
        transparent={true}
        scrollY={scrollY}
        entityId={user?.entityId}
      />
      
      {/* Content Area - Either normal content or search overlay */}
      <View style={styles.contentContainer}>
        {isSearchActive ? (
          // Search Overlay - Google Maps style (only covers content area)
          <SearchOverlay
            searchQuery={searchQuery}
            onItemSelect={handleSearchItemSelect}
            />
        ) : (
          // Normal content
          <View style={styles.mainContent}>
      {/* Chat List */}
      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
            {/* Archived Section (WhatsApp-style) - show at top if there are archived chats */}
            {renderArchivedSection()}

            {/* Show empty state when not loading and no chats */}
            {filteredDisplayChats.length === 0 && renderEmptyState()}

            {/* Show chats when available */}
            {filteredDisplayChats.length > 0 && filteredDisplayChats.map(chat => renderChatItem(chat))}
            
              {/* ContactList Integration - show in "All" tab */}
            {activeTab === InteractionTab.All && (
                <ContactList
                  appUserContacts={appUserContacts}
                  phoneOnlyContacts={phoneOnlyContacts}
                  isLoading={isLoadingInitialContacts || isLoadingContacts} // Combined loading
                  onContactPress={handleContactListItemPress}
                  permissionGranted={hasContactsPermission}
                  onRequestPermission={handleRequestContactsPermission}
                  isLoadingPermission={isLoadingContacts} // Use isLoadingContacts for permission button too
                  listTitleAppUsers="SWAP CONTACTS"
                  listTitlePhoneContacts="FROM YOUR PHONE"
                  areListsVisible={showContactLists}
                  onHideAppUsers={() => setShowContactLists(!showContactLists)} // This will toggle both lists
                  appUsersToggleText={showContactLists ? "Hide" : "Show"}
                  onInviteContact={handleInviteContact}
                />
        )}
      </Animated.ScrollView>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default InteractionsHistory2; 