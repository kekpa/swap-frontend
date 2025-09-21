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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { InteractionsStackParamList } from '../../navigation/interactions/interactionsNavigator';
import SearchHeader from '../header/SearchHeader';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthContext } from '../auth/context/AuthContext';
import { useInteractions, InteractionItem } from '../../hooks-data/useInteractions';
import { usePrefetchTimeline } from '../../hooks-data/useTimeline';
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
  message: string; // This will be lastMessageSnippet from InteractionItem or a default
  time: string;    // This will be formatted from last_message_at or a default
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

const InteractionsHistory2: React.FC = (): JSX.Element => {
  const navigation = useNavigation<InteractionsNavigationProp>();
  const route = useRoute<InteractionsHistoryRouteProp>();
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const user = authContext.user;
  const isAuthenticated = authContext.isAuthenticated;
  
  // 🚀 SIMPLIFIED TanStack Query usage - no complex loading state management
  const { 
    interactions: interactionsList, 
    isLoading: isLoadingInteractions, 
    refetch: refreshInteractions,
    isError: hasInteractionsError,
    error: interactionsError,
    isRefetching
  } = useInteractions({ enabled: !!user });

  // 🚀 PROFESSIONAL: Add intelligent conversation preloading
  const prefetchTimeline = usePrefetchTimeline();

  const [activeTab, setActiveTab] = useState<InteractionTab>(InteractionTab.All);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
  
  // 🚀 PROFESSIONAL: Intelligent conversation preloading
  useEffect(() => {
    if (interactionsList && interactionsList.length > 0) {
      // Preload the top 3 most recent conversations for instant loading
      const topInteractions = interactionsList.slice(0, 3);
      
      logger.debug(`[InteractionsHistory] Preloading top ${topInteractions.length} conversations for instant UX`, "InteractionsHistory");
    
      // Preload in background with small delays to avoid overwhelming
      topInteractions.forEach((interaction, index) => {
        setTimeout(() => {
          prefetchTimeline(interaction.id).catch(error => {
            logger.debug(`[InteractionsHistory] Preload failed for ${interaction.id}: ${String(error)}`, "InteractionsHistory");
          });
        }, index * 100); // Stagger by 100ms each
      });
    }
  }, [interactionsList, prefetchTimeline]);
  
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
            const initials = getInitials(displayName);
            const charCode = displayName.charCodeAt(0) || 0;
            const colorPalette = ['#38bdf8', '#818cf8', '#f87171', '#fb923c', '#a3e635', '#4ade80', '#2dd4bf', '#60a5fa'];
            const avatarColor = colorPalette[Math.abs(charCode) % colorPalette.length];
            
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
          
          const cachedPhoneUsers = cachedPhoneOnly.map(normContact => {
            const displayName = normContact.displayName;
            const initials = getInitials(displayName);
            const charCode = displayName.charCodeAt(0) || 0;
            const colorPalette = ['#38bdf8', '#818cf8', '#f87171', '#fb923c', '#a3e635', '#4ade80', '#2dd4bf', '#60a5fa'];
            const avatarColor = colorPalette[Math.abs(charCode) % colorPalette.length];

            return {
              id: normContact.deviceContactId || `phone-${normContact.phoneNumber}`,
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
          const initials = getInitials(displayName);
          const charCode = displayName.charCodeAt(0) || 0;
          // Consistent, valid color palette
          const colorPalette = ['#38bdf8', '#818cf8', '#f87171', '#fb923c', '#a3e635', '#4ade80', '#2dd4bf', '#60a5fa'];
          const avatarColor = colorPalette[Math.abs(charCode) % colorPalette.length];
          
          if (displayName.toLowerCase().includes('hank')) {
            logger.debug(`[InteractionsHistory] Mapping AppUser: Name='${displayName}', Initials='${initials}', AvatarColor='${avatarColor}'`);
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
        logger.debug(`[InteractionsHistory] Mapped ${platformMatches.length} platform contacts to DisplayableContact.`);

        // Fetch phone-only contacts (NormalizedContact[])
        const phoneOnlyNormalized = await contactsService.getPhoneOnlyNormalizedContacts(forceRefreshContacts);
        const phoneOnlyMapped = phoneOnlyNormalized.map(normContact => {
          const displayName = normContact.displayName;
          const initials = getInitials(displayName);
          const charCode = displayName.charCodeAt(0) || 0;
          // Consistent, valid color palette
          const colorPalette = ['#38bdf8', '#818cf8', '#f87171', '#fb923c', '#a3e635', '#4ade80', '#2dd4bf', '#60a5fa'];
          const avatarColor = colorPalette[Math.abs(charCode) % colorPalette.length];

          if (displayName.toLowerCase().includes('hank')) {
            logger.debug(`[InteractionsHistory] Mapping PhoneOnly: Name='${displayName}', Initials='${initials}', AvatarColor='${avatarColor}'`);
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

  // 🚀 SIMPLIFIED: Remove complex refresh throttling - TanStack Query handles this
  const onRefresh = useCallback(async () => {
    if (isRefreshing) {
      logger.debug("[InteractionsHistory] Refresh already in progress", "InteractionsHistory");
      return;
    }
    
    logger.debug("[InteractionsHistory] Starting manual refresh", "InteractionsHistory");
    setIsRefreshing(true);
    
    try {
      await refreshInteractions();
      logger.debug("[InteractionsHistory] Manual refresh completed successfully", "InteractionsHistory");
    } catch (error) {
      logger.error("Failed to refresh interactions", error, "InteractionsHistory");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshInteractions]);

  // 🚀 SIMPLIFIED: Remove complex useFocusEffect logic
  useFocusEffect(
    useCallback(() => {
      // Debug route params
      logger.debug('[InteractionsHistory] Screen focused', "InteractionsHistory");
      
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
      };
    }, [route.params?.navigateToContact, route.params?.navigateToNewChat, contactsSynced, hasContactsPermission, initializeContacts, navigation])
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

    // Sort by last_message_at for real-time reordering (most recent first)
    const sortedInteractions = [...interactionsList].sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime; // Most recent first
    });
    

    const mappedResult = sortedInteractions.map((interaction: InteractionItem): DisplayChat => {
      let chatName = interaction.name || 'Group Chat';
      let avatarText = '??';
      let interactionType: 'friend' | 'business' = 'friend';
      let avatarColor = theme.colors.primary;

      if (!interaction.is_group && interaction.members && interaction.members.length > 0) {
        const otherMember = interaction.members.find(
          (member) => member.entity_id !== user.entityId
        );

        if (otherMember) {
          chatName = otherMember.display_name || 'Unknown User';
          avatarText = getInitials(chatName);
          const charCode = chatName.charCodeAt(0);
          const colorPalette = [theme.colors.primary, theme.colors.secondary, theme.colors.success, theme.colors.info, theme.colors.warning];
          avatarColor = colorPalette[charCode % colorPalette.length];
          interactionType = otherMember.entity_type === 'business' ? 'business' : 'friend';
        } else {
          chatName = 'Self Chat'; 
          avatarText = user.firstName ? getInitials(user.firstName) : (user.email ? user.email.substring(0,2).toUpperCase() : 'ME');
        }
      } else if (interaction.is_group) {
        avatarText = getInitials(interaction.name || 'Group');
        interactionType = 'business'; 
      }

      const messageSnippet = interaction.last_message_snippet || (interaction.is_group ? 'Group created' : 'Chat started');
      const lastMessageTime = interaction.last_message_at || interaction.updated_at || '';

      const displayChatItem = {
        id: interaction.id,
        name: chatName,
        message: messageSnippet,
        time: formatTime(lastMessageTime),
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
      backgroundColor: theme.colors.grayUltraLight,
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.textSecondary,
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
    if (item.name === 'Swap' && initials === 'S') { // Example: Make 'Swap' always use primary color and icon
      bgColor = theme.colors.primary;
      return (
        <View style={[styles.avatar, { backgroundColor: bgColor }]}>
          <Ionicons name="repeat" size={24} color={theme.colors.white} />
        </View>
      );
    }
    // Fallback to initials if no specific logic applies
    // Color can be derived from name hash if not provided with avatarColor
    if (!(item as DisplayChat).avatarColor && !(item as DisplayableContact).avatarColor) { // Check if avatarColor was NOT explicitly provided
        const charCode = item.name.charCodeAt(0);
        const colorPalette = [theme.colors.primary, theme.colors.secondary, theme.colors.success, theme.colors.info, theme.colors.warning];
        bgColor = colorPalette[charCode % colorPalette.length];
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

  // Add a function to handle interaction deletion
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
            // Here you would call your API to delete the conversation
            logger.debug(`Deleting conversation with ID: ${interactionId}`, "InteractionsHistory");
            // After deletion, refresh the interactions list
            refreshInteractions();
            // For now, we'll just refresh without actual deletion
          }
        }
      ]
    );
  };

  // Add a function to handle unmuting
  const handleMuteInteraction = (interactionId: string) => {
    logger.debug(`Unmuting conversation with ID: ${interactionId}`, "InteractionsHistory");
    // API call would go here
    refreshInteractions();
  };

  // Add a function to handle archiving
  const handleArchiveInteraction = (interactionId: string) => {
    logger.debug(`Archiving conversation with ID: ${interactionId}`, "InteractionsHistory");
    // API call would go here
    refreshInteractions();
  };

  // Render swipe action buttons - simplified to just slide without scaling or opacity effects
  const renderRightActions = (
    progress: any,
    dragX: any,
    interactionId: string
  ) => {

    // Create swipe action styles
    const actionStyles = StyleSheet.create({
      actionContainer: {
        width: 240, // Increased width for 3 buttons (80px each)
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
      muteButton: {
        backgroundColor: theme.colors.warning,
      },
      deleteButton: {
        backgroundColor: theme.colors.error,
      },
      archiveButton: {
        backgroundColor: theme.colors.grayDark,
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
        {/* Mute Button */}
        <View style={[
          actionStyles.actionButton, 
          actionStyles.muteButton
        ]}>
          <TouchableOpacity 
            style={actionStyles.buttonContent}
            onPress={() => handleMuteInteraction(interactionId)}
          >
            <Ionicons name="volume-high" size={22} color="white" />
            <Text style={actionStyles.actionText}>Mute</Text>
          </TouchableOpacity>
        </View>

        {/* Delete Button */}
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

        {/* Archive Button */}
        <View style={[
          actionStyles.actionButton, 
          actionStyles.archiveButton
        ]}>
          <TouchableOpacity 
            style={actionStyles.buttonContent}
            onPress={() => handleArchiveInteraction(interactionId)}
          >
            <Ionicons name="archive" size={22} color="white" />
            <Text style={actionStyles.actionText}>Archive</Text>
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
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "UA"; 
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
          Start a new chat to begin messaging
        </Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewChat}
        >
          <Text style={styles.newChatButtonText}>Start New Chat</Text>
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
        <StatusBar barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
         <SearchHeader
          onSearchPress={handleSearchPress}
            onNewChat={handleNewChat}
            onProfilePress={handleProfilePress}
          placeholder="Search chats & contacts"
            rightIcons={[{ name: "add-circle", onPress: handleNewChat, color: theme.colors.primary }]}
            avatarUrl={user?.avatarUrl}
            initials={getHeaderInitials()}
          isSearchActive={isSearchActive}
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          onSearchCancel={handleSearchCancel}
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
      <StatusBar barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Search Header - Always visible, transforms based on search state */}
      <SearchHeader
        onSearchPress={handleSearchPress}
        onNewChat={handleNewChat}
        onProfilePress={handleProfilePress}
        placeholder="Search chats & contacts"
        rightIcons={[{ name: "add-circle", onPress: handleNewChat, color: theme.colors.primary }]}
        avatarUrl={user?.avatarUrl}
        initials={getHeaderInitials()}
        showSearch={true}
        brandName="Swap"
        isSearchActive={isSearchActive}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        onSearchCancel={handleSearchCancel}
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
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || isRefetching} 
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
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
      </ScrollView>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default InteractionsHistory2; 