import React, { useEffect, useState, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
import { userStateManager } from '../../services/UserStateManager';
import { useTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/theme';
// LOCAL-FIRST ARCHITECTURE: SQLite is the source of truth
import { useLocalTimeline, LocalTimelineItem, isProcessingStatus } from '../../hooks-data/useLocalTimeline';
import { unifiedTimelineService } from '../../services/UnifiedTimelineService';
import { backgroundSyncService } from '../../services/BackgroundSyncService';
import { useInteraction } from '../../tanstack-query/mutations/useInteraction';
import { SendMessageRequest, MessageType, Message as ApiMessage, MessageStatus } from '../../types/message.types';
import { TimelineItem, TimelineItemType as ImportedTimelineItemType, MessageTimelineItem, TransactionTimelineItem, DateSeparatorTimelineItem } from '../../types/timeline.types';
import TransferCompletedScreen from './sendMoney2/TransferCompletedScreen';
import { networkService } from '../../services/NetworkService';
import { getTransactionStatusDisplay } from '../../utils/transactionStatusDisplay';

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
    paddingHorizontal: theme.spacing.sm, // 8px from screen edge
  },
  // Sent transaction: rounded corners except bottom-right (tail pointing to sender)
  transactionBubble: {
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.xs, // 4px tail corner
    padding: theme.spacing.sm,
    minWidth: 160,  // Minimum width for readability
    maxWidth: '65%',  // Max width relative to screen
    borderWidth: 1,
    backgroundColor: theme.colors.primaryUltraLight,
    borderColor: theme.colors.primaryLight,
    alignSelf: 'flex-end',
  },
  // Received transaction: rounded corners except bottom-left (tail pointing to contact)
  receivedTransactionBubble: {
    backgroundColor: theme.colors.grayUltraLight,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
    borderBottomRightRadius: theme.borderRadius.lg, // Restore rounded
    borderBottomLeftRadius: theme.borderRadius.xs, // 4px tail corner
  },
  transactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
  transactionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryUltraLight, paddingVertical: 2, paddingHorizontal: theme.spacing.xs, borderRadius: theme.borderRadius.lg }, 
  transactionBadgeText: { color: theme.colors.success, fontSize: theme.typography.fontSize.xs, fontWeight: '600', marginLeft: 2 },
  transactionAmount: { fontSize: theme.typography.fontSize.xl, fontWeight: '700', color: theme.colors.primary, marginBottom: theme.spacing.xs },
  receivedTransactionAmount: { color: theme.colors.textPrimary },
  transactionDetails: { fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  transactionStatus: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.xs, gap: 12 },
  transactionId: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textTertiary, flex: 1 },
  transactionTime: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textTertiary, flexShrink: 0 },
});
const messageBubbleStyles = (theme: Theme) => StyleSheet.create({
  messageContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: theme.spacing.xs, paddingHorizontal: theme.spacing.sm }, // 8px from screen edge
  receivedContainer: { justifyContent: 'flex-start' },
  // Sent message: rounded corners except bottom-right (tail pointing to sender)
  messageBubble: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.xs, // 4px tail corner
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    maxWidth: '70%',
  },
  // Received message: rounded corners except bottom-left (tail pointing to contact)
  receivedBubble: {
    backgroundColor: theme.colors.grayUltraLight,
    borderBottomRightRadius: theme.borderRadius.lg, // Restore rounded
    borderBottomLeftRadius: theme.borderRadius.xs, // 4px tail corner
  },
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
  outerContainer: { flex: 1, backgroundColor: theme.colors.card },
  container: { flex: 1, backgroundColor: theme.colors.card },
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
  filterBar: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.sm, padding: theme.spacing.sm, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  contentArea: { flex: 1, backgroundColor: theme.colors.white },
  filterBadge: { paddingVertical: theme.spacing.xs + 2, paddingHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.xl, backgroundColor: theme.colors.grayUltraLight },
  activeFilterBadge: { backgroundColor: theme.colors.primaryLight },
  filterBadgeText: { fontSize: theme.typography.fontSize.sm, fontWeight: '500', color: theme.colors.textSecondary },
  activeFilterBadgeText: { color: theme.colors.primary, fontWeight: '600' },
  timelineContent: { paddingVertical: theme.spacing.sm, paddingHorizontal: 0, flexGrow: 1 },
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

  // Get status display properties from Saga-aware utility
  const statusDisplay = useMemo(() => getTransactionStatusDisplay(status), [status]);

  // Map color type to theme color
  const statusColor = useMemo(() => {
    switch (statusDisplay.color) {
      case 'success': return theme.colors.success;
      case 'error': return theme.colors.error;
      case 'warning': return theme.colors.warning;
      case 'info': return theme.colors.info;
      default: return theme.colors.success;
    }
  }, [statusDisplay.color, theme]);

  // Determine alignment based on isFromCurrentUser
  const justifyContentStyle: { justifyContent: 'flex-start' | 'flex-end' } = isFromCurrentUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' };
  const bubbleStyle = isFromCurrentUser ? componentStyles.transactionBubble : [componentStyles.transactionBubble, componentStyles.receivedTransactionBubble];
  const amountStyle = isFromCurrentUser ? componentStyles.transactionAmount : [componentStyles.transactionAmount, componentStyles.receivedTransactionAmount];

  return (
    <View style={[componentStyles.transactionContainer, justifyContentStyle]}>
      <TouchableOpacity style={bubbleStyle} onPress={onPress}>
        <View style={componentStyles.transactionHeader}>
          <View style={componentStyles.transactionBadge}>
            {statusDisplay.isProcessing ? (
              <ActivityIndicator size={12} color={statusColor} />
            ) : (
              <Ionicons name={statusDisplay.icon} size={14} color={statusColor} />
            )}
            <Text style={[componentStyles.transactionBadgeText, { color: statusColor }]}>{statusDisplay.label}</Text>
          </View>
        </View>
        <Text style={amountStyle}>{isFromCurrentUser ? '-' : '+'}{amount}</Text>
        {source && <Text style={componentStyles.transactionDetails}>"{source}"</Text>}
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
  // ONE hook for all interaction needs (find or create)
  const { ensureInteraction } = useInteraction();

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

  // State declarations
  const [activeTab, setActiveTab] = useState<ImportedTimelineItemType | 'all'>('all');
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentInteractionId, setCurrentInteractionId] = useState<string | null>(passedInteractionId || null);

  // 🚀 LOCAL-FIRST: SQLite is the ONLY source of truth (WhatsApp-grade architecture)
  const {
    items: localTimelineItems,
    isLoading: isLoadingTimeline,
    refetch: refetchTimeline,
    hasMore: hasNextPage,
    loadMore: fetchNextPage,
    isLoadingMore: isFetchingNextPage,
    error: timelineError,
  } = useLocalTimeline(currentInteractionId, {
    enabled: !!currentInteractionId && !!currentUser?.profileId,
    pageSize: 50,
  });

  // Map LocalTimelineItem to TimelineItem format for component compatibility
  // ALIGNED WITH SUPABASE: from_entity_id = who sent (for message alignment)
  const timelineItems = useMemo(() => {
    return localTimelineItems.map((item): TimelineItem => {
      if (item.item_type === 'message') {
        return {
          id: item.id,
          type: 'message',
          itemType: 'message',
          interaction_id: item.interaction_id,
          from_entity_id: item.from_entity_id,
          content: item.content || '',
          message_type: (item.message_type || 'text') as any,
          timestamp: item.created_at,
          createdAt: item.created_at,
          status: item.local_status as any,
          metadata: item.metadata ? JSON.parse(item.metadata) : {},
        } as MessageTimelineItem;
      } else {
        return {
          id: item.id,
          type: 'transaction',
          itemType: 'transaction',
          interaction_id: item.interaction_id,
          from_entity_id: item.from_entity_id,
          amount: item.amount || 0,
          currency_symbol: item.currency_symbol || '$',
          currency_code: item.currency_code || 'USD',
          description: item.description || item.content || '',
          timestamp: item.created_at,
          createdAt: item.created_at,
          status: item.local_status,
          // Entity IDs for transaction direction (who sent / who received)
          from_entity_id: item.from_entity_id,
          to_entity_id: item.to_entity_id,
          metadata: item.metadata ? JSON.parse(item.metadata) : {},
        } as TransactionTimelineItem;
      }
    });
  }, [localTimelineItems]);

  const hasTimelineError = !!timelineError;

  // 🚀 Start background sync service on mount
  useEffect(() => {
    if (currentUser?.profileId) {
      backgroundSyncService.start(currentUser.profileId);
      logger.debug('[ContactInteractionHistory] 🚀 BackgroundSyncService started');
    }
  }, [currentUser?.profileId]);

  // Debug logging for timeline state
  useEffect(() => {
    logger.debug(
      `[ContactInteractionHistory] 📊 TIMELINE STATE: currentInteractionId=${currentInteractionId}, timelineItems.length=${timelineItems.length}, isLoadingTimeline=${isLoadingTimeline}, hasTimelineError=${hasTimelineError}`,
      "ContactInteractionHistory"
    );
  }, [currentInteractionId, timelineItems.length, isLoadingTimeline, hasTimelineError]);

  // PROFESSIONAL: Intelligent loading state - only show loading if no data AND actually loading
  const shouldShowLoading = isLoadingTimeline && timelineItems.length === 0;
  const hasAnyData = timelineItems.length > 0;

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [currentTransferDetails, setCurrentTransferDetails] = useState<any>(null);
  
  // Network state for offline handling
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  const flatListRef = useRef<FlashList<TimelineItem>>(null);
  const styles = useMemo(() => createGlobalStyles(theme), [theme]);

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

  // Monitor network state changes for offline mode handling
  useEffect(() => {
    const networkUnsubscribe = networkService.onNetworkStateChange((state) => {
      logger.debug('[ContactInteractionHistory] Network state changed:', JSON.stringify(state));
      setIsOfflineMode(state.isOfflineMode);
    });
    
    // Get initial network state
    const initialState = networkService.getNetworkState();
    setIsOfflineMode(initialState.isOfflineMode);
    
    return networkUnsubscribe;
  }, []);

  // Initialize interaction - simplified with stable dependencies
  useEffect(() => {
    const initializeInteraction = async () => {
      logger.debug(
        `[ContactInteractionHistory] 🚀 INITIALIZING INTERACTION: passedInteractionId=${passedInteractionId}, contactId=${contactId}`,
        "ContactInteractionHistory"
      );

      if (passedInteractionId) {
        logger.debug(
          `[ContactInteractionHistory] ✅ Using passed interaction ID: ${passedInteractionId}`,
          "ContactInteractionHistory"
        );
        setCurrentInteractionId(passedInteractionId);
      } else if (contactId) {
        logger.debug(
          `[ContactInteractionHistory] 🔄 Getting/creating interaction for contact: ${contactId}`,
          "ContactInteractionHistory"
        );
        try {
          logger.debug(
            `[ContactInteractionHistory] 📞 Calling ensureInteraction with contactId: ${contactId}`,
            "ContactInteractionHistory"
          );
          const newInteractionId = await ensureInteraction(contactId);

          if (newInteractionId) {
            logger.debug(
              `[ContactInteractionHistory] ✅ SUCCESS: Set interaction ID: ${newInteractionId}`,
              "ContactInteractionHistory"
            );
            setCurrentInteractionId(newInteractionId);
          } else {
            logger.debug(
              `[ContactInteractionHistory] ✅ No conversation exists yet with ${contactId} - will create on first message/transaction`,
              "ContactInteractionHistory"
            );
            // Keep currentInteractionId as null - it will be created when user sends first message
          }
        } catch (error) {
          logger.error(
            `[ContactInteractionHistory] ❌ EXCEPTION: Error getting/creating interaction for contact ${contactId}`,
            error,
            "ContactInteractionHistory"
          );
        }
      } else {
        logger.warn(
          `[ContactInteractionHistory] ⚠️ WARNING: No passedInteractionId or contactId provided`,
          "ContactInteractionHistory"
        );
      }
    };

    initializeInteraction();
    // Only depend on data that actually changes - function is now memoized with useCallback
  }, [passedInteractionId, contactId, ensureInteraction]);

  // Enhanced focus effect - simplified
  useFocusEffect(
    useCallback(() => {
      logger.debug(
        `[ContactInteractionHistory] Screen focused. contactId: ${contactId}, currentInteractionId: ${currentInteractionId}`,
        "ContactInteractionHistory"
      );

      // Scroll to bottom when screen regains focus (WhatsApp/Messenger UX)
      // Defensive: Wait longer for FlashList layout to complete
      setTimeout(() => {
        try {
          if (flatListRef.current && filteredItems.length > 0) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        } catch (error) {
          // Silently fail - FlashList layout timing issue
          logger.debug('[ContactInteractionHistory] scrollToEnd skipped (layout not ready)', 'ContactInteractionHistory');
        }
      }, 300);

      // 🚀 PHASE 2.1: Global subscription model - no room joining needed!
      // User is already subscribed to their profile room globally
      // Just update user state to track current chat for smart notifications
      if (currentInteractionId) {
        logger.debug(`[UserState] User viewing chat: ${currentInteractionId}`, "ContactInteractionHistory");
        userStateManager.setCurrentChat(currentInteractionId);
      }
      
      return () => {
        logger.debug(
          `[ContactInteractionHistory] Screen unfocused. contactId: ${contactId}`,
          "ContactInteractionHistory"
        );
        
        // 🚀 PHASE 2.1: Clear current chat state (for smart notifications)
        logger.debug(`[UserState] User left chat: ${currentInteractionId}`, "ContactInteractionHistory");
        userStateManager.setCurrentChat(null);
      };
    }, [contactId, currentInteractionId])
  );

  const handleBackPress = () => {
    logger.debug("Back button pressed in ContactInteractionHistory2", "ContactInteractionHistory");
    navigation.pop();
  };

  const handleSendMoney = () => {
    logger.debug('[ContactInteractionHistory] Navigating to SendMoney screen', "ContactInteractionHistory");
    navigation.navigate("SendMoney", {
      toEntityId: contactId,
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
    // Validate input and user
    if (!messageInput.trim() || !currentUser?.entityId || !contactId || !currentUser?.profileId) {
      const errorDetails = {
        messageInputEmpty: !messageInput.trim(),
        currentUserMissing: !currentUser?.entityId,
        contactIdMissing: !contactId,
        profileIdMissing: !currentUser?.profileId,
      };
      logger.warn(
        'Cannot send message: Missing input, user/entity ID, contact ID, or profile ID.',
        `Details: ${JSON.stringify(errorDetails)}`
      );
      return;
    }

    setIsSending(true);
    const messageToSend = messageInput.trim();
    setMessageInput('');

    try {
      let interactionIdToUse = currentInteractionId;

      // If no interaction exists yet, create it (first message scenario)
      if (!interactionIdToUse) {
        logger.debug(
          '[ContactInteractionHistory] 🆕 No interaction exists - creating new interaction for first message',
          'ContactInteractionHistory'
        );

        // ensureInteraction handles find OR create automatically
        const newInteractionId = await ensureInteraction(contactId);

        if (!newInteractionId) {
          throw new Error('Failed to create interaction');
        }

        interactionIdToUse = newInteractionId;
        setCurrentInteractionId(interactionIdToUse);

        logger.debug(
          `[ContactInteractionHistory] ✅ Created new interaction: ${interactionIdToUse}`,
          'ContactInteractionHistory'
        );
      }

      // 🚀 NEW: Local-first message sending (INSTANT UI update)
      // Message is written to SQLite first, UI updates immediately
      // BackgroundSyncService handles API call asynchronously
      // Uses from_entity_id/to_entity_id for consistency with Supabase
      const { localId, success, error } = await unifiedTimelineService.sendMessage({
        interactionId: interactionIdToUse,
        profileId: currentUser.profileId,
        fromEntityId: currentUser.entityId,  // Who is sending
        toEntityId: contactId,                // Who is receiving
        content: messageToSend,
        messageType: 'text',
      });

      if (!success) {
        throw new Error(error || 'Failed to send message');
      }

      logger.debug(`[ContactInteractionHistory] ✅ Message ${localId} added to local timeline (INSTANT)`);

      // Trigger background sync immediately
      backgroundSyncService.triggerSync();

      // Auto-scroll to bottom to show the latest message (WhatsApp/Messenger UX)
      setTimeout(() => {
        try {
          if (flatListRef.current && filteredItems.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        } catch (error) {
          // Silently fail - FlashList layout timing issue
          logger.debug('[ContactInteractionHistory] scrollToEnd skipped (layout not ready)', 'ContactInteractionHistory');
        }
      }, 300);
    } catch (error) {
      logger.error('[ContactInteractionHistory] Error sending message', error);
      setMessageInput(messageToSend); // Restore message input
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleTabChange = (tab: ImportedTimelineItemType | 'all') => {
    logger.debug(`[ContactInteractionHistory] Changing tab from ${activeTab} to ${tab}`, "ContactInteractionHistory");
    setActiveTab(tab);
  };

  // Auto-scroll when new messages arrive (WhatsApp/Messenger UX)
  const previousTimelineLength = useRef(timelineItems.length);
  useEffect(() => {
    if (timelineItems.length > previousTimelineLength.current) {
      // New message arrived, scroll to bottom
      setTimeout(() => {
        try {
          if (flatListRef.current && filteredItems.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        } catch (error) {
          // Silently fail - FlashList layout timing issue
          logger.debug('[ContactInteractionHistory] scrollToEnd skipped (layout not ready)', 'ContactInteractionHistory');
        }
      }, 300);
    }
    previousTimelineLength.current = timelineItems.length;
  }, [timelineItems.length]);

  // Filter timeline items based on active tab AND insert date separators
  const filteredItems = useMemo(() => {
    // First filter by tab
    const items = activeTab === 'all'
      ? timelineItems
      : timelineItems.filter(item => {
          const itemType = item.itemType || item.type;
          return itemType === activeTab;
        });

    // Insert date separators between items on different days
    const withDateSeparators: TimelineItem[] = [];
    let lastDate: string | null = null;

    for (const item of items) {
      const itemTimestamp = item.created_at || item.timestamp || item.createdAt;
      const itemDate = itemTimestamp ? formatDate(new Date(itemTimestamp)) : null;

      if (itemDate && itemDate !== lastDate) {
        // Add date separator before this item
        withDateSeparators.push({
          id: `date-${itemDate}-${item.id}`,
          type: 'date',
          itemType: 'date',
          date_string: itemDate,
        } as DateSeparatorTimelineItem);
        lastDate = itemDate;
      }
      withDateSeparators.push(item);
    }

    return withDateSeparators;
  }, [timelineItems, activeTab]);
  
  const renderTimelineItem = ({ item }: { item: TimelineItem }) => {
    if (item.itemType === 'message' || item.type === 'message') {

      const messageItem = item as MessageTimelineItem;
      const messageContent = messageItem.content || '';
      const messageTimestamp = messageItem.timestamp || messageItem.createdAt || new Date().toISOString();
      
      const isFromCurrentUser = messageItem.from_entity_id === currentUser?.entityId;
      
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
      const currentUserEntityId = currentUser?.entityId;
      let isSentByCurrentUser: boolean;
      
      if (currentUserEntityId === txItem.from_entity_id) {
        isSentByCurrentUser = true;
      } else if (currentUserEntityId === txItem.to_entity_id) {
        isSentByCurrentUser = false;
      } else {
        const entryType = txItem.metadata?.entry_type;
        if (entryType === 'CREDIT') {
          isSentByCurrentUser = true;
        } else if (entryType === 'DEBIT') {
          isSentByCurrentUser = false;
        } else {
          isSentByCurrentUser = false;
        }
      }

      // Format time with explicit space before AM/PM
      const timeStr = new Date(txItem.timestamp || txItem.createdAt || '').toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return (
        <ThemedTransaction
          key={txItem.id}
          amount={txItem.amount?.toString() || ''}
          date={''} 
          time={timeStr}
          source={txItem.description || ''}
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

  useLayoutEffect(() => { 
    if (Platform.OS === 'ios') StatusBar.setBarStyle(theme.name.includes('dark') ? 'light-content' : 'dark-content', true); 
  }, [theme]);

  const handleCloseTransferCompletedModal = () => {
    setShowTransferModal(false);
    setCurrentTransferDetails(null);
    setActiveTab('all');
  };

  useEffect(() => {
    if (route.params?.showTransferCompletedModal && route.params?.transferDetails) {
      navigation.navigate("TransferCompleted", route.params.transferDetails);
      navigation.setParams({ showTransferCompletedModal: undefined, transferDetails: undefined } as any);
    }
  }, [route.params?.showTransferCompletedModal]);

  // Enhanced empty state component that handles normal display
  const renderEmptyState = useCallback(() => {
    const emptyStateStyle = styles.emptyState; // CRITICAL FIX: Use normal empty state since list is no longer inverted
    
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
      </View>
    );
  }, [activeTab, styles, theme.colors.grayMedium]);

  // 🚀 WHATSAPP-STYLE: Never show loading screen if we have ANY data (even stale)
  const shouldShowLoadingScreen = shouldShowLoading && !hasAnyData;

  // CRITICAL: If we have ANY data, show it immediately - never show loading
  if (shouldShowLoadingScreen) {
    return (
      <View style={styles.outerContainer}>
        <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.card} />
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
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.card} />
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
          <TouchableOpacity style={[styles.filterBadge, activeTab === 'all' && styles.activeFilterBadge]} onPress={() => handleTabChange('all')}>
            <Text style={[styles.filterBadgeText, activeTab === 'all' && styles.activeFilterBadgeText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBadge, activeTab === 'transaction' && styles.activeFilterBadge]} onPress={() => handleTabChange('transaction')}>
            <Text style={[styles.filterBadgeText, activeTab === 'transaction' && styles.activeFilterBadgeText]}>Transactions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBadge, activeTab === 'message' && styles.activeFilterBadge]} onPress={() => handleTabChange('message')}>
            <Text style={[styles.filterBadgeText, activeTab === 'message' && styles.activeFilterBadgeText]}>Messages</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentArea}>
          <FlashList
            ref={flatListRef}
            data={filteredItems}
            keyExtractor={(item, index) => `${item.type || item.itemType || 'unknown'}-${item.id}-${index}`}
            renderItem={renderTimelineItem}
            estimatedItemSize={80}
            contentContainerStyle={[
              styles.timelineContent,
              { flexGrow: 1, justifyContent: filteredItems.length > 0 ? 'flex-start' : 'center' }
            ]}
            inverted={false} // Keep chronological order: oldest at top, newest at bottom
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              // Defensive check for FlashList layout timing issue
              if (!event?.nativeEvent?.contentOffset) {
                return;
              }

              // Load older messages when scrolling UP to the TOP
              const yOffset = event.nativeEvent.contentOffset.y;
              const threshold = 100; // Trigger when within 100px of top

              if (yOffset <= threshold && hasNextPage && !isFetchingNextPage) {
                logger.debug('[ContactInteractionHistory] Near top - loading older messages...', 'ContactInteractionHistory');
                fetchNextPage();
              }
            }}
            scrollEventThrottle={400}
            ListHeaderComponent={
              isFetchingNextPage ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={{ marginTop: 8, color: theme.colors.textSecondary, fontSize: 12 }}>
                    Loading older messages...
                  </Text>
                </View>
              ) : null
            }
          />
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          style={{ flexShrink: 0 }}
        >
          <View style={styles.chatInputContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSendMoney}>
              <Text style={styles.emojiButton}>🤑</Text>
            </TouchableOpacity>
            <TextInput 
              style={styles.chatInput} 
              placeholder="Type a message..." 
              placeholderTextColor={theme.colors.textTertiary} 
              value={messageInput} 
              onChangeText={setMessageInput} 
              multiline={true} 
            />
            <TouchableOpacity
              style={[styles.sendButton, (!messageInput.trim() || isSending) && styles.disabledSendButton]}
              onPress={handleSendMessage}
              disabled={!messageInput.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default ContactTransactionHistoryScreen2; 