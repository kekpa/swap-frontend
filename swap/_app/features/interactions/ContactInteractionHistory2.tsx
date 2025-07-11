import React, { useEffect, useState, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../_api/apiClient';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { InteractionsStackParamList } from '../../navigation/interactions/interactionsNavigator';
import { useAuthContext } from '../auth/context/AuthContext';
import { formatDate, formatTime } from '../../utils/dateFormatters';
import { Toast } from '../../components/Toast';
import logger from '../../utils/logger';
import API_PATHS from '../../_api/apiPaths';
import { websocketService } from '../../services/websocketService';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/theme';
import { useData } from '../../contexts/DataContext';
import { SendMessageRequest, MessageType, Message as ApiMessage, MessageStatus } from '../../types/message.types';
import { TimelineItem, TimelineItemType as ImportedTimelineItemType, MessageTimelineItem, TransactionTimelineItem, DateSeparatorTimelineItem } from '../../types/timeline.types';
import TransferCompletedScreen from './sendMoney2/TransferCompletedScreen';
import { messageRepository } from '../../localdb/MessageRepository';
import { Message, MessageType as APIMessageType, TextMessage } from '../../types/message.types';
import { getTimelineManager } from '../../services/TimelineManager';
import { timelineRepository } from '../../localdb/TimelineRepository';
import { TimelineManager } from '../../services/TimelineManager';
import { messageManager } from '../../services/MessageManager';
import { transactionManager } from '../../services/TransactionManager';
import { networkService } from '../../services/NetworkService';

// --- Type definitions ---
type TimelineItemType = 'transaction' | 'message' | 'date';
interface TransactionProps {
  amount: string;
  date: string;
  time: string;
  source: string;
  type: 'sent' | 'received';
  transactionId: string;
  status?: string;
  theme: Theme;
  isFromCurrentUser: boolean;
}
interface MessageBubbleProps { content: string; time: string; isFromContact: boolean; theme: Theme; }

interface TransferDetails {
  amount: number;
  recipientName: string;
  recipientInitial: string;
  recipientColor: string;
  message: string;
  transactionId: string;
  status?: string;
  createdAt?: string;
}

type ContactTransactionHistoryRouteProp = RouteProp<{ ContactInteractionHistory2: { contactId: string; contactName: string; contactInitials: string; contactAvatarColor: string; silentErrorMode?: boolean; interactionId?: string; forceRefresh?: boolean; timestamp?: number; isGroup?: boolean; showTransferCompletedModal?: boolean; transferDetails?: TransferDetails; }; }, 'ContactInteractionHistory2'>;
type NavigationProp = StackNavigationProp<InteractionsStackParamList, 'ContactInteractionHistory2'>;

// --- Stylesheet functions defined globally ---
const transactionStyles = (theme: Theme) => StyleSheet.create({
  transactionContainer: { 
    marginBottom: theme.spacing.sm, 
    flexDirection: 'row',
  },
  transactionBubble: { 
    borderRadius: theme.borderRadius.md, 
    padding: theme.spacing.sm, 
    maxWidth: '80%',
    borderWidth: 1, 
    backgroundColor: theme.colors.primaryUltraLight, 
    borderColor: theme.colors.primaryLight,
    alignSelf: 'flex-end',
  },
  receivedTransactionBubble: { 
    backgroundColor: theme.colors.grayUltraLight, 
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
  },
  transactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
  transactionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryUltraLight, paddingVertical: 2, paddingHorizontal: theme.spacing.xs, borderRadius: theme.borderRadius.lg }, 
  transactionBadgeText: { color: theme.colors.success, fontSize: theme.typography.fontSize.xs, fontWeight: '600', marginLeft: 2 },
  transactionAmount: { fontSize: theme.typography.fontSize.xl, fontWeight: '700', color: theme.colors.primary, marginBottom: theme.spacing.xs },
  receivedTransactionAmount: { color: theme.colors.textPrimary },
  transactionDetails: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  transactionStatus: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.xs },
  transactionId: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textTertiary },
  transactionTime: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textTertiary },
});
const messageBubbleStyles = (theme: Theme) => StyleSheet.create({
  messageContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: theme.spacing.xs },
  receivedContainer: { justifyContent: 'flex-start' },
  messageBubble: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, maxWidth: '70%', borderBottomRightRadius: theme.borderRadius.xs },
  receivedBubble: { backgroundColor: theme.colors.grayUltraLight, borderBottomRightRadius: theme.borderRadius.md, borderBottomLeftRadius: theme.borderRadius.xs },
  messageText: { color: theme.colors.white, fontSize: theme.typography.fontSize.md },
  receivedMessageText: { color: theme.colors.textPrimary },
  messageTime: { fontSize: theme.typography.fontSize.xs, color: theme.colors.primaryUltraLight, alignSelf: 'flex-end', marginTop: 2, opacity: 0.8 },
  receivedMessageTime: { color: theme.colors.textTertiary, opacity: 0.8 },
});
const dateHeaderStyles = (theme: Theme) => StyleSheet.create({
  dateHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: theme.spacing.sm },
  dateHeaderLine: { flex: 1, height: 1, backgroundColor: theme.colors.divider },
  dateHeaderText: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, marginHorizontal: theme.spacing.sm, fontWeight: '500' },
});

// Global styles function for the main screen
const createGlobalStyles = (theme: Theme) => StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, height: 70, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backButton: { marginRight: theme.spacing.sm, padding: theme.spacing.xs },
  avatarContainer: { marginRight: theme.spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: theme.colors.white, fontSize: theme.typography.fontSize.md, fontWeight: '600' },
  headerContent: { flex: 1 },
  headerName: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.md, fontWeight: '600' },
  headerStatus: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.xs },
  headerActions: { flexDirection: 'row' },
  headerButton: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginLeft: theme.spacing.sm },
  filterBar: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.sm, padding: theme.spacing.sm, backgroundColor: theme.colors.background, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  filterBadge: { paddingVertical: theme.spacing.xs + 2, paddingHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.grayUltraLight },
  activeFilterBadge: { backgroundColor: theme.colors.primaryLight },
  filterBadgeText: { fontSize: theme.typography.fontSize.sm, fontWeight: '500', color: theme.colors.textSecondary },
  activeFilterBadgeText: { color: theme.colors.primary, fontWeight: '600' },
  timelineContent: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, flexGrow: 1 },
  chatInputContainer: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.sm, backgroundColor: theme.colors.card, borderTopWidth: 1, borderTopColor: theme.colors.border },
  actionButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  emojiButton: { fontSize: 30 },
  chatInput: { 
    flex: 1, 
    backgroundColor: theme.name.includes('dark') 
      ? 'rgba(255, 255, 255, 0.08)' // Lighter background for dark mode
      : theme.colors.inputBackground, 
    borderRadius: theme.borderRadius.xl, 
    paddingHorizontal: theme.spacing.md, 
    paddingVertical: Platform.OS === 'ios' ? theme.spacing.sm : theme.spacing.xs, 
    marginHorizontal: theme.spacing.sm, 
    color: theme.colors.inputText, 
    fontSize: theme.typography.fontSize.sm, 
    minHeight: 40, 
    maxHeight: 100,
    borderWidth: theme.name.includes('dark') ? 1 : 0,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Subtle border for dark mode
  },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  disabledSendButton: { backgroundColor: theme.colors.grayMedium },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: theme.typography.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  emptyStateInverted: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: theme.spacing.lg,
    transform: [{ scaleY: -1 }] // Flip back to normal when list is inverted
  },
  emptyStateText: { fontSize: theme.typography.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  errorText: { fontSize: theme.typography.fontSize.md, color: theme.colors.error, marginTop: theme.spacing.sm, textAlign: 'center' },
  smallLoadingIndicator: {
    position: 'absolute',
    top: 120, // Below the header and filter bar
    alignSelf: 'center',
    zIndex: 10,
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});

// --- Sub-Components (Ensure these are defined before the main component or correctly imported) ---

const ThemedTransaction: React.FC<TransactionProps & { onPress?: () => void }> = ({ amount, time, source, type, transactionId, status = 'Completed', theme, isFromCurrentUser, onPress }) => {
  const componentStyles = useMemo(() => transactionStyles(theme), [theme]);
  
  // Determine alignment based on isFromCurrentUser
  const justifyContentStyle: { justifyContent: 'flex-start' | 'flex-end' } = isFromCurrentUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' };
  const bubbleStyle = isFromCurrentUser ? componentStyles.transactionBubble : [componentStyles.transactionBubble, componentStyles.receivedTransactionBubble];
  const amountStyle = isFromCurrentUser ? componentStyles.transactionAmount : [componentStyles.transactionAmount, componentStyles.receivedTransactionAmount];

  return (
    <View style={[componentStyles.transactionContainer, justifyContentStyle]}>
      <TouchableOpacity style={bubbleStyle} onPress={onPress}>
        <View style={componentStyles.transactionHeader}>
          <View style={componentStyles.transactionBadge}>
            <Ionicons name="checkmark-outline" size={14} color={theme.colors.success} />
            <Text style={componentStyles.transactionBadgeText}>{status}</Text>
          </View>
        </View>
        <Text style={amountStyle}>{isFromCurrentUser ? '-' : '+'}{amount}</Text>
        <Text style={componentStyles.transactionDetails}>For {source}</Text>
        <View style={componentStyles.transactionStatus}>
          <Text style={componentStyles.transactionId}>#{transactionId?.slice(0,8)}</Text>
          <Text style={componentStyles.transactionTime}>{time}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const ThemedMessageBubble: React.FC<MessageBubbleProps> = ({ content, time, isFromContact, theme }) => {
  const componentStyles = useMemo(() => messageBubbleStyles(theme), [theme]);
  return (
    <View style={[componentStyles.messageContainer, isFromContact && componentStyles.receivedContainer]}>
      <View style={[componentStyles.messageBubble, isFromContact && componentStyles.receivedBubble]}>
        <Text style={[componentStyles.messageText, isFromContact && componentStyles.receivedMessageText]}>{content}</Text>
        <Text style={[componentStyles.messageTime, isFromContact && componentStyles.receivedMessageTime]}>{time}</Text>
      </View>
    </View>
  );
};

const ThemedDateHeader: React.FC<{ date: string, theme: Theme; }> = ({ date, theme }) => {
  const componentStyles = useMemo(() => dateHeaderStyles(theme), [theme]);
  return (
    <View style={componentStyles.dateHeaderContainer}>
      <View style={componentStyles.dateHeaderLine} />
      <Text style={componentStyles.dateHeaderText}>{date}</Text>
      <View style={componentStyles.dateHeaderLine} />
    </View>
  );
};

// --- Main Component ---
const ContactTransactionHistoryScreen2: React.FC = () => {
  const route = useRoute<ContactTransactionHistoryRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const authContext = useAuthContext();
  const { user: currentUser } = authContext;
  const {
    getOrCreateDirectInteraction,
    sendMessage,
    fetchInteractionTimeline,
    interactionTimeline,
    isLoadingTimeline,
  } = useData();
  
  const { 
    contactId, 
    contactName, 
    contactInitials, 
    contactAvatarColor = theme.colors.secondary, 
    interactionId: passedInteractionId,
    forceRefresh, 
    timestamp: routeTimestamp,
    showTransferCompletedModal,
    transferDetails,
  } = route.params || {};

  useEffect(() => {
    logger.debug(
      `ContactInteractionHistory2 mounted with params: ${JSON.stringify({
        contactId,
        contactName,
        contactInitials,
        forceRefresh,
        timestamp: routeTimestamp,
        passedInteractionId,
        showTransferCompletedModal,
        transferDetails,
      })}`,
      "ContactInteractionHistory"
    );
  }, [contactId, contactName, contactInitials, forceRefresh, routeTimestamp, passedInteractionId, showTransferCompletedModal, transferDetails]);
  
  const [activeTab, setActiveTab] = useState<ImportedTimelineItemType | 'all'>('all');
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentInteractionId, setCurrentInteractionId] = useState<string | null>(passedInteractionId || null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [currentTransferDetails, setCurrentTransferDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); // New state for overall loading
  const [isSyncing, setIsSyncing] = useState(false); // New state for sync indicator
  const [error, setError] = useState<string | null>(null); // New state for error
  
  // Offline mode state
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [networkState, setNetworkState] = useState({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    isOfflineMode: false,
  });

  // Timeline manager instance
  const timelineManager = useRef<ReturnType<typeof getTimelineManager> | null>(null);
  const flatListRef = useRef<FlatList<TimelineItem>>(null);

  const styles = useMemo(() => createGlobalStyles(theme), [theme]);
  
  // Initialize timeline manager when interaction ID is available
  useEffect(() => {
    if (currentInteractionId) {
      timelineManager.current = getTimelineManager(currentInteractionId);

      // Listen for timeline updates
      const handleTimelineUpdate = (items: TimelineItem[]) => {
        setTimelineItems(items);
      };

      timelineManager.current.on('timeline:updated', handleTimelineUpdate);
    
      // Set initial timeline items
      setTimelineItems(timelineManager.current.getTimelineItems());

      return () => {
        if (timelineManager.current) {
          timelineManager.current.removeListener('timeline:updated', handleTimelineUpdate);
        }
      };
    }
  }, [currentInteractionId]);

  // 🚀 Local-first timeline loading with instant UI
  const loadTimelineData = useCallback(async (forceRefresh = false) => {
    if (!currentInteractionId || !currentUser?.entityId) {
      console.log('📱 [ContactInteractionHistory2] ⚠️ Missing interactionId or user entity, skipping timeline load');
      return;
    }

    console.log(`📱 [ContactInteractionHistory2] 🚀 Loading timeline for interaction: ${currentInteractionId}, user: ${currentUser.entityId}, forceRefresh: ${forceRefresh}`);

    try {
      // STEP 1: Load from local cache INSTANTLY (no loading state)
      console.log('📱 [ContactInteractionHistory2] 📱 STEP 1: Loading from local cache...');
      const localTimeline = await timelineRepository.getTimelineForInteraction(
        currentInteractionId, 
        100
        // No user filtering here since API already filters and saves user-specific data
      );
      
      console.log(`📱 [ContactInteractionHistory2] 📱 Local timeline loaded: ${localTimeline.length} items`);
      
      // ALWAYS show cached data immediately (even if empty)
        setTimelineItems(localTimeline);
      setIsLoading(false); // NEVER show loading screen after local load
        console.log('📱 [ContactInteractionHistory2] ✅ Timeline UI updated with cached data (INSTANT)');

      // STEP 2: Background sync ONLY if online
      if (networkService.isOffline()) {
        console.log('📱 [ContactInteractionHistory2] 📱 OFFLINE MODE: Skipping background sync');
        setIsSyncing(false);
        return;
      }

      if (!forceRefresh && localTimeline.length > 0) {
        // Skip background sync if we have recent data (unless forced)
        console.log('📱 [ContactInteractionHistory2] ⏱️ Skipping background sync - have cached data');
        return;
      }

      // Show subtle sync indicator ONLY (not blocking loading)
      setIsSyncing(true);
      console.log('📱 [ContactInteractionHistory2] 🔄 STEP 2: Starting background sync...');
      
      const response = await apiClient.get(`/interactions/${currentInteractionId}/timeline?limit=100&entity_id=${currentUser.entityId}`);
      console.log(`📱 [ContactInteractionHistory2] 🌐 API response:`, {
        status: response.status,
        itemCount: response.data?.items?.length || 0
      });

      if (response.data?.items && Array.isArray(response.data.items)) {
        const apiItems = response.data.items;
        console.log(`📱 [ContactInteractionHistory2] 🌐 Processing ${apiItems.length} items from API`);

        // Save to local cache in background
        const manager = timelineManager.current || getTimelineManager(currentInteractionId);
        manager.setTimelineItems(apiItems);
        
        // Update UI only if we got new/different data
        const hasNewData = apiItems.length !== localTimeline.length || 
                          JSON.stringify(apiItems.slice(0, 5)) !== JSON.stringify(localTimeline.slice(0, 5));
        
        if (hasNewData) {
          setTimelineItems(apiItems);
          console.log('📱 [ContactInteractionHistory2] ✅ Timeline UI updated with fresh API data');
        } else {
          console.log('📱 [ContactInteractionHistory2] ✅ No new data from API, keeping cached version');
        }
      }

    } catch (error) {
      console.error('📱 [ContactInteractionHistory2] ❌ Error loading timeline:', error);
      // NEVER show error if we have cached data - just log it
      if (timelineItems.length === 0) {
        setError('Failed to load conversation');
      }
    } finally {
      setIsSyncing(false);
      console.log('📱 [ContactInteractionHistory2] 🏁 Timeline loading completed');
    }
  }, [currentInteractionId, currentUser?.entityId, timelineItems.length, networkService]);

  // Monitor network state changes for offline mode handling
  useEffect(() => {
    const networkUnsubscribe = networkService.onNetworkStateChange((state) => {
      logger.debug('[ContactInteractionHistory] 🌐 Network state changed:', JSON.stringify(state));
      setNetworkState(state);
      setIsOfflineMode(state.isOfflineMode);
      
      if (state.isOfflineMode) {
        logger.info('[ContactInteractionHistory] 📱 OFFLINE MODE: Using cached data only');
        // Clear any loading states when going offline
        setIsLoading(false);
        setIsSyncing(false);
      } else {
        logger.info('[ContactInteractionHistory] 🌐 ONLINE MODE: Will sync with server');
        
        // When coming back online, refresh data if we have an interaction
        if (currentInteractionId) {
          logger.debug('[ContactInteractionHistory] 🔄 Back online - refreshing timeline');
          loadTimelineData(true).catch(error => {
            logger.warn('[ContactInteractionHistory] Background refresh failed after coming online:', error);
          });
        }
      }
    });
    
    // Get initial network state
    const initialState = networkService.getNetworkState();
    setNetworkState(initialState);
    setIsOfflineMode(initialState.isOfflineMode);
    
    return networkUnsubscribe;
  }, [currentInteractionId, loadTimelineData]);

  // Sync DataContext timeline data into TimelineManager
  useEffect(() => {
    if (currentInteractionId && timelineManager.current && interactionTimeline.length > 0) {
      logger.debug(`[ContactInteractionHistory] Syncing ${interactionTimeline.length} timeline items from DataContext to TimelineManager`, "ContactInteractionHistory");
      
      // Filter timeline items for this specific interaction
      const filteredItems = interactionTimeline.filter(item => 
        (item as any).interaction_id === currentInteractionId
      );

      logger.debug(`[ContactInteractionHistory] Found ${filteredItems.length} items for interaction ${currentInteractionId}`, "ContactInteractionHistory");
      
      // Set the timeline items in TimelineManager
      timelineManager.current.setTimelineItems(filteredItems);
    }
  }, [currentInteractionId, interactionTimeline]);

  // Initialize interaction and load data immediately
  useEffect(() => {
    const initializeInteraction = async () => {
      if (passedInteractionId) {
        logger.debug(
          `[ContactInteractionHistory] Interaction ID was directly passed: ${passedInteractionId}, using it.`,
          "ContactInteractionHistory",
        );
        if (currentInteractionId !== passedInteractionId) {
          setCurrentInteractionId(passedInteractionId);
        }
        // Load data immediately when interaction ID is set
        await loadTimelineData(false);
      } else if (contactId) {
        logger.debug(
          `[ContactInteractionHistory] No interaction ID passed, attempting to get/create for contact (entityId): ${contactId}`,
          "ContactInteractionHistory",
        );
        try {
          const newInteractionId = await getOrCreateDirectInteraction(contactId);
          if (newInteractionId) {
            setCurrentInteractionId(newInteractionId);
            // Load data immediately when interaction ID is created
            await loadTimelineData(false);
            logger.debug(
              `[ContactInteractionHistory] Set currentInteractionId to: ${newInteractionId} for contact ${contactId}`,
              "ContactInteractionHistory",
            );
          } else {
            // No interaction exists yet - show empty state immediately
            setIsLoading(false);
            logger.warn(
              `[ContactInteractionHistory] Could not get/create interaction ID for contact ${contactId}. Timeline will be empty, sending a message will create it.`,
              "ContactInteractionHistory",
            );
          }
        } catch (error: unknown) {
          setIsLoading(false); // Never leave in loading state
          logger.error(
            `[ContactInteractionHistory] Error in getOrCreateDirectInteraction for contact ${contactId}`,
            error instanceof Error ? error.message : String(error),
            "ContactInteractionHistory",
          );
        }
      } else {
        // No contact or interaction - show empty state immediately
        setIsLoading(false);
        logger.warn(
          '[ContactInteractionHistory] Mounted without passedInteractionId or contactId. Cannot determine interaction.',
          "ContactInteractionHistory"
        );
      }
    };

    initializeInteraction();
  }, [passedInteractionId, contactId, getOrCreateDirectInteraction, loadTimelineData]);

  // Fetch data with improved local-first approach
  const fetchData = useCallback(async (options?: { forceRefresh?: boolean; silentUpdate?: boolean }) => {
    if (!currentInteractionId) return;

    try {      
      await fetchInteractionTimeline(currentInteractionId, options);
    } catch (error) {
      logger.error('[ContactInteractionHistory] Error fetching timeline', error);
    }
  }, [currentInteractionId, fetchInteractionTimeline]);
  
  useEffect(() => {
    if (currentInteractionId) {
      logger.debug(
        `[ContactInteractionHistory] currentInteractionId is now ${currentInteractionId}, relying on DataContext for timeline data.`,
        "ContactInteractionHistory",
      );
      
      // 🎯 NEW APPROACH: Let DataContext handle ALL timeline fetching
      // Screen components should ONLY consume DataContext state
      // This eliminates duplicate API calls and coordination issues
      
      // Check if DataContext already has timeline data for this interaction
      const existingTimelineData = interactionTimeline.filter(item => 
        (item as any).interaction_id === currentInteractionId
      );
      
      if (existingTimelineData.length > 0) {
        logger.debug(`[ContactInteractionHistory] ✅ DataContext has ${existingTimelineData.length} timeline items, using existing data`, "ContactInteractionHistory");
      } else {
        logger.debug(`[ContactInteractionHistory] 📡 No timeline data in DataContext, will wait for preload/fetch to complete`, "ContactInteractionHistory");
        // DataContext preload will handle fetching - we just wait for it
      }
      
      // 🚫 REMOVED: No more duplicate fetching from screen components
      // DataContext.preloadRecentTimelines() and fetchInteractionTimeline() handle all data loading
    }
  }, [currentInteractionId, interactionTimeline]);

  // Enhanced focus effect with local-first pattern - NO MORE AGGRESSIVE REFETCHING
  useFocusEffect(
    useCallback(() => {
      logger.debug(
        `[ContactInteractionHistory] Screen focused. contactId: ${contactId}, currentInteractionId: ${currentInteractionId}`,
        "ContactInteractionHistory",
      );
      
      // DON'T fetch data on every focus - this causes loading icons and destroys optimistic messages
      // Only join WebSocket room for real-time updates
      if (currentInteractionId) {
        if (websocketService.isSocketAuthenticated()) {
          logger.debug(`[WebSocket] Screen focused. Joining interaction room: ${currentInteractionId}`, "ContactInteractionHistory");
          websocketService.joinInteraction(currentInteractionId);
        } else {
            const detail = currentInteractionId 
                ? `Interaction ID: ${currentInteractionId}` 
                : 'Interaction ID is null';
            logger.warn('[WebSocket] Screen focused, but socket not authenticated. Cannot join room.', detail);
        }
      }
      
      return () => {
        logger.debug(
          `[ContactInteractionHistory] Screen unfocused. contactId: ${contactId}`,
          "ContactInteractionHistory",
        );
        if (currentInteractionId) {
            logger.debug(`[WebSocket] Screen unfocused. Leaving interaction room: ${currentInteractionId}`, "ContactInteractionHistory");
            websocketService.leaveInteraction(currentInteractionId);
        }
      };
    }, [contactId, currentInteractionId]), // Remove fetchData dependency
  );

  const handleBackPress = () => {
    logger.debug("Back button pressed in ContactInteractionHistory2", "ContactInteractionHistory");
    navigation.pop();
  };

  const handleSendMoney = () => {
    logger.debug('[ContactInteractionHistory] Navigating to SendMoney screen', "ContactInteractionHistory");
    navigation.navigate("SendMoney", { 
      recipientId: contactId, 
      recipientName: contactName, 
      recipientInitial: contactInitials, 
      recipientColor: contactAvatarColor
    });
  };

  const handleTransactionPress = (transactionItem: any) => {
    logger.debug(`[ContactInteractionHistory] Transaction pressed: ${transactionItem.id}`, "ContactInteractionHistory");
    
    // Create transaction object compatible with TransactionDetailsScreen
    const transaction = {
      id: transactionItem.id,
      amount: transactionItem.amount,
      currency_symbol: transactionItem.currency_symbol || '$',
      type: transactionItem.from_entity_id === currentUser?.entityId ? 'sent' : 'received',
      category: transactionItem.description || 'Payment',
      name: contactName,
      timestamp: transactionItem.timestamp || transactionItem.createdAt,
      status: transactionItem.status || 'Completed',
    };

    navigation.navigate('TransactionDetails' as any, {
      transactionId: transactionItem.id,
      transaction: transaction,
      sourceScreen: 'chat',
      contactName: contactName,
      contactInitials: contactInitials,
      contactAvatarColor: contactAvatarColor,
    });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentUser?.entityId || !currentInteractionId) {
        const errorDetails = {
            messageInputEmpty: !messageInput.trim(),
            currentUserMissing: !currentUser?.entityId,
            interactionIdMissing: !currentInteractionId
        };
        logger.warn("Cannot send message: Missing input, user/entity ID, or interaction ID.", 
            `Details: ${JSON.stringify(errorDetails)}`);
        if (!currentInteractionId) alert("Error: Chat session not ready. Please try again.");
        return;
    }

    setIsSending(true);
    const idempotencyKey = `local-${Date.now()}-${Math.random().toString(36).substring(2,8)}`;
    const messageToSend = messageInput.trim();
    setMessageInput('');

    try {
      // Add optimistic message via timeline manager
      const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
      timelineManager.current?.addMessage({
        id: optimisticId,
      interaction_id: currentInteractionId, 
      content: messageToSend,
        sender_entity_id: currentUser.entityId,
      message_type: APIMessageType.TEXT,
        metadata: {
          isOptimistic: true,
          idempotency_key: idempotencyKey,
        },
      });

      // Send via API
      const messageDto: SendMessageRequest & { 
        recipient_id: string; 
        idempotency_key: string;
        interaction_id: string;
      } = {
        interaction_id: currentInteractionId, 
        recipient_id: contactId,
        content: messageToSend,
        message_type: APIMessageType.TEXT,
        idempotency_key: idempotencyKey,
        metadata: { 
          optimisticId,
          client_timestamp: new Date().toISOString(),
        },
      };

      const sentMessage = await sendMessage(messageDto);
      if (!sentMessage) {
        throw new Error('Failed to send message');
      }

    } catch (error) {
      logger.error('[ContactInteractionHistory] Error sending message', error);
      setMessageInput(messageToSend); // Restore message input
    } finally {
      setIsSending(false);
    }
  };

  const handleTabChange = (tab: ImportedTimelineItemType | 'all') => {
    logger.debug(`[ContactInteractionHistory] Changing tab from ${activeTab} to ${tab}`, "ContactInteractionHistory");
    setActiveTab(tab);
  };
  
  // Get filtered timeline items from timeline manager
  const getValidFilterType = (tab: ImportedTimelineItemType | 'all'): 'all' | 'message' | 'transaction' => {
    if (tab === 'all' || tab === 'message' || tab === 'transaction') {
      return tab;
    }
    return 'all';
  };
  
  const filteredItems = timelineManager.current?.getFilteredItems(
    getValidFilterType(activeTab)
  ) || [];
  
  const renderTimelineItem = ({ item }: { item: TimelineItem }) => {
    if ((item.itemType === 'message' || item.type === 'message') && 
        (item.interaction_id === currentInteractionId)) {
      
      const messageItem = item as MessageTimelineItem;
      const messageContent = messageItem.content || '';
      const messageTimestamp = messageItem.timestamp || messageItem.createdAt || new Date().toISOString();
      
      const isFromCurrentUser = messageItem.sender_entity_id === currentUser?.entityId;
      
      return <ThemedMessageBubble 
        key={item.id} 
        content={messageContent} 
        time={new Date(messageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
        isFromContact={!isFromCurrentUser}
        theme={theme} 
      />;
    }
    if (item.itemType === 'transaction' || item.type === 'transaction') {
      const txItem = item as TransactionTimelineItem;
      
      // Determine transaction direction based on from_entity_id and to_entity_id
      // This works regardless of whether backend uses single or double-entry
      const currentUserEntityId = currentUser?.entityId;
      let isSentByCurrentUser: boolean;
      
      // Debug logging
      logger.debug(`[Transaction Alignment] Transaction ${txItem.id}: currentUser=${currentUserEntityId}, from=${txItem.from_entity_id}, to=${txItem.to_entity_id}, entry_type=${txItem.metadata?.entry_type}`, "ContactInteractionHistory");
      
      if (currentUserEntityId === txItem.from_entity_id) {
        // Current user is the sender - show on RIGHT
        isSentByCurrentUser = true;
        logger.debug(`[Transaction Alignment] User is SENDER - showing on RIGHT`, "ContactInteractionHistory");
      } else if (currentUserEntityId === txItem.to_entity_id) {
        // Current user is the receiver - show on LEFT  
        isSentByCurrentUser = false;
        logger.debug(`[Transaction Alignment] User is RECEIVER - showing on LEFT`, "ContactInteractionHistory");
      } else {
        // Fallback: if current user is neither sender nor receiver, 
        // check entry_type for backward compatibility
        const entryType = txItem.metadata?.entry_type;
        logger.debug(`[Transaction Alignment] User is NEITHER sender nor receiver - using fallback entry_type: ${entryType}`, "ContactInteractionHistory");
        if (entryType === 'CREDIT') {
          isSentByCurrentUser = true;
        } else if (entryType === 'DEBIT') {
          isSentByCurrentUser = false;
        } else {
          // Final fallback - assume received if we can't determine
          isSentByCurrentUser = false;
        }
      }

      const timeStr = new Date(txItem.timestamp || txItem.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return (
        <ThemedTransaction
          key={txItem.id}
          amount={txItem.amount?.toString() || ''}
          date={''} 
          time={timeStr}
          source={txItem.description || 'Payment'}
          type={isSentByCurrentUser ? 'sent' : 'received'}
          transactionId={txItem.id}
          status={txItem.status}
          theme={theme}
          isFromCurrentUser={isSentByCurrentUser}
          onPress={() => handleTransactionPress(txItem)}
        />
      );
    }
    if (item.itemType === 'date' || item.type === 'date') {
      const dateItem = item as DateSeparatorTimelineItem;
      return <ThemedDateHeader key={item.id} date={dateItem.date_string} theme={theme} />;
    }
    return null;
  };

  useLayoutEffect(() => { if (Platform.OS === 'ios') StatusBar.setBarStyle(theme.name.includes('dark') ? 'light-content' : 'dark-content', true); }, [theme]);

  const handleCloseTransferCompletedModal = () => {
    setShowTransferModal(false);
    setCurrentTransferDetails(null);
    setActiveTab('all');
    if (currentInteractionId) {
      // Force refresh after completing a transfer to ensure latest data
      fetchData({ forceRefresh: true, silentUpdate: false });
    }
  };

  useEffect(() => {
    if (route.params?.showTransferCompletedModal && route.params?.transferDetails) {
      navigation.navigate("TransferCompleted", route.params.transferDetails);
      navigation.setParams({ showTransferCompletedModal: undefined, transferDetails: undefined } as any);
    }
  }, [route.params?.showTransferCompletedModal]);

  // Enhanced empty state component that handles inverted display
  const renderEmptyState = useCallback(() => {
    const isInverted = true; // Since we always use inverted={true}
    const emptyStateStyle = isInverted ? styles.emptyStateInverted : styles.emptyState;
    
    let emptyMessage = 'No messages yet';
    if (activeTab === 'transaction') {
      emptyMessage = 'No transactions yet';
    } else if (activeTab === 'message') {
      emptyMessage = 'No messages yet';
    }
    
    return (
      <View style={emptyStateStyle}>
        <Ionicons name="chatbubble-outline" size={48} color={theme.colors.grayMedium} />
        <Text style={styles.emptyStateText}>
          {emptyMessage}
        </Text>
        {/* Show subtle loading indicator during background sync */}
        {isLoadingTimeline && (
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={{ marginTop: 8, fontSize: 12, color: theme.colors.textSecondary }}>
              Syncing...
            </Text>
          </View>
        )}
      </View>
    );
  }, [isLoadingTimeline, activeTab, styles, theme.colors.grayMedium, theme.colors.primary, theme.colors.textSecondary]);

  // Handle returning from send money screen - force refresh to show new transaction
  useEffect(() => {
    if (route.params?.forceRefresh || route.params?.timestamp) {
      logger.debug('[ContactInteractionHistory] Detected route params indicating refresh needed', "ContactInteractionHistory", {
        forceRefresh: route.params?.forceRefresh,
        timestamp: route.params?.timestamp
      });
      
      if (currentInteractionId) {
        // Force refresh when returning from send money to ensure latest transaction is shown
        fetchData({ forceRefresh: true, silentUpdate: false });
      }
    }
  }, [route.params?.forceRefresh, route.params?.timestamp, currentInteractionId, fetchData]);

  // 🚀 LOCAL-FIRST: Never show blocking loading screen after local-first loading
  // Always show the main UI with empty state if no data, and subtle sync indicator if loading

    return (
      <View style={styles.outerContainer}>
        <StatusBar barStyle={theme.name.includes('dark') ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: contactAvatarColor || theme.colors.secondary }]}>
                <Text style={styles.avatarText}>{contactInitials}</Text>
              </View>
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.headerName}>{contactName}</Text>
            {/* Show offline indicator in header */}
            {isOfflineMode && (
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                📱 Offline
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterBar}>
          <TouchableOpacity style={[styles.filterBadge, activeTab === 'all' && styles.activeFilterBadge]} onPress={() => handleTabChange('all')}><Text style={[styles.filterBadgeText, activeTab === 'all' && styles.activeFilterBadgeText]}>All</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.filterBadge, activeTab === 'transaction' && styles.activeFilterBadge]} onPress={() => handleTabChange('transaction')}><Text style={[styles.filterBadgeText, activeTab === 'transaction' && styles.activeFilterBadgeText]}>Transactions</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.filterBadge, activeTab === 'message' && styles.activeFilterBadge]} onPress={() => handleTabChange('message')}><Text style={[styles.filterBadgeText, activeTab === 'message' && styles.activeFilterBadgeText]}>Messages</Text></TouchableOpacity>
          
          {/* Show subtle sync indicator in filter bar */}
          {isSyncing && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 }}>
                Syncing...
              </Text>
            </View>
          )}
        </View>
        
        <FlatList
          ref={flatListRef}
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderTimelineItem}
          contentContainerStyle={[
            styles.timelineContent, 
            { flexGrow: 1, justifyContent: filteredItems.length > 0 ? 'flex-start' : 'center' }
          ]}
          inverted={true}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          style={{ flexShrink: 0 }}
        >
        <View style={styles.chatInputContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSendMoney}>
            <Text style={styles.emojiButton}>🤑</Text>
          </TouchableOpacity>
            <TextInput style={styles.chatInput} placeholder="Type a message..." placeholderTextColor={theme.colors.textTertiary} value={messageInput} onChangeText={setMessageInput} multiline={true} />
            <TouchableOpacity style={[styles.sendButton, (!messageInput.trim() || isSending) && styles.disabledSendButton]} onPress={handleSendMessage} disabled={!messageInput.trim() || isSending || !currentInteractionId}>
              {isSending ? <ActivityIndicator size="small" color={theme.colors.white} /> : <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />}
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default ContactTransactionHistoryScreen2; 