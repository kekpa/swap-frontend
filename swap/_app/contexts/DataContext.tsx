import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from "../_api/apiClient";
import { useAuthContext } from "../features/auth/context/AuthContext";
import logger from "../utils/logger";
import { CurrencyBalance, Balance } from "../types/account.types";
import API_PATHS from "../_api/apiPaths";
import { Message, SendMessageRequest, MessageType as APIMessageType, MessageStatus } from "../types/message.types";
// Removed unused imports: CreateDirectMessageDto, AxiosError
import { TimelineItem, MessageTimelineItem, TransactionTimelineItem } from "../types/timeline.types";
import { websocketService } from "../services/websocketService";
import { messageManager } from '../services/MessageManager';
import { webSocketHandler } from '../services/WebSocketHandler';
import { transactionManager } from '../services/TransactionManager';
import { TimelineManager } from '../services/TimelineManager';
import { networkService } from '../services/NetworkService';

// Import only the repositories still needed by active functions
import { InteractionRepository } from '../localdb/InteractionRepository';

// Define interface for entity search results
export interface EntitySearchResult {
  id: string;
  entity_type: string;
  reference_id: string;
  display_name: string;
  avatar_url?: string;
  is_active: boolean;
  metadata?: any;
}

// Define a type for individual interaction items based on backend structure
// This should align with InteractionListItemDto from the backend
export interface InteractionItem {
  id: string;
  name?: string; // Name of the interaction (e.g., group chat name, or generated for direct chats).
  is_group: boolean;
  last_message_at?: string; // Timestamp of the last message or event in the interaction.
  updated_at?: string; // Timestamp of the last update to the interaction.
  members: Array<{
    entity_id: string;
    role: string;
    display_name?: string;
    avatar_url?: string;
    entity_type?: string;
  }>;
  last_message_snippet?: string; // Snippet of the last message.
  last_message_sender_id?: string; // ID of the sender of the last message.
  unread_count?: number; // Optional: for unread messages
}

// Define a type for recent conversation items from the recent conversations endpoint
export interface RecentConversationItem {
  id: string;
  name: string;
  type: 'direct' | 'group';
  avatarUrl?: string;
  initials: string;
  avatarColor: string;
  lastMessageSnippet?: string;
  lastMessageAt?: Date;
  contactEntityId?: string;
  participantCount: number;
  hasUnreadMessages: boolean;
}

// Mock data removed - DataContext now uses TanStack Query for all data

// Define the DataContext interface
interface DataContextType {
  // Data
  currencyBalances: CurrencyBalance[];
  totalFiat: number;
  balances: Balance[];
  totalBalance: number;
  interactionsList: InteractionItem[];
  recentConversations: RecentConversationItem[];
  entitySearchResults: EntitySearchResult[];
  interactionTimeline: TimelineItem[];
  
  // User Profile Data
  userProfile: any | null;
  kycStatus: any | null;
  personalInfo: any | null;
  verificationStatus: any | null;

  // Loading states
  isLoadingBalances: boolean;
  isLoadingInteractions: boolean;
  isLoadingRecentConversations: boolean;
  isLoadingEntitySearch: boolean;
  isLoadingTimeline: boolean;
  // isLoadingUserData removed - handled by TanStack Query
  isInitialLoadComplete: boolean;
  
  // Professional loading state for UI components
  loadingState: {
    isLoading: boolean;
    progress: number;
    completedTasks: Set<string>;
    requiredTasks: string[];
    errors: string[];
  };
  
  // Data loading completion tracking removed - handled by TanStack Query status

  // Actions
  refreshBalances: () => Promise<void>;
  refreshInteractions: () => Promise<void>;
  refreshRecentConversations: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshAll: () => Promise<void>;
  searchAll: (query: string) => Promise<EntitySearchResult[]>;
  getOrCreateDirectInteraction: (contactProfileId: string) => Promise<string | null>;
  sendMessage: (messageData: SendMessageRequest & { recipient_id: string; idempotency_key: string, interaction_id: string }) => Promise<Message | null>;
  sendDirectTransaction: (dto: import('../types/transaction.types').CreateDirectTransactionDto) => Promise<any>;
  fetchInteractionTimeline: (interactionId: string, options?: { forceRefresh?: boolean; silentUpdate?: boolean }) => Promise<void>;
  // addMessageToTimeline removed - handled by TanStack Query useTimeline hook
  // addTransactionToTimeline removed - handled by TanStack Query useTimeline hook
  updateInteractionPreviewFromTimeline: (interactionId: string) => Promise<void>;
  clearAllTimelineState: () => void;
  clearRefreshThrottling: () => void;
  
  // Local-first utilities
  hasLocalData: () => Promise<boolean>;
  hasEssentialLocalData: () => Promise<boolean>;
}

// Create the context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Repository instances removed - handled by TanStack Query

// Cache utilities moved to TanStack Query configuration

// Cache functions removed - handled by TanStack Query

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const authContext = useAuthContext();
  const user = authContext?.user;
  const isAuthenticated = authContext?.isAuthenticated || false;
  const isGuestMode = authContext?.isGuestMode || false;
  const isAuthLoading = authContext?.isLoading || false;
  const getAccessToken = authContext?.getAccessToken;

  // Critical transition period management removed - handled by TanStack Query

  // Mock mode removed - DataContext now uses TanStack Query
  
  // Refresh throttling removed - handled by TanStack Query staleTime/cacheTime

  // State for data - initialize empty (no mock data)
  const [currencyBalances, setCurrencyBalances] = useState<CurrencyBalance[]>([]);
  const [totalFiat, setTotalFiat] = useState(0);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [interactionsList, setInteractionsList] = useState<InteractionItem[]>([]);
  const [recentConversations] = useState<RecentConversationItem[]>([]);
  const [interactionTimeline, setInteractionTimeline] = useState<TimelineItem[]>([]);
  // Optimistic message store removed - handled by TanStack Query optimistic updates

  // User Profile Data State - simplified (complex state handled by TanStack Query)
  const [userProfile] = useState<any | null>(null);
  const [kycStatus] = useState<any | null>(null);
  const [personalInfo] = useState<any | null>(null);
  const [verificationStatus] = useState<any | null>(null);
  
  // Verification status logging removed - now handled by TanStack Query

  // Loading states
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [isLoadingRecentConversations, setIsLoadingRecentConversations] = useState(false);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // Network state removed - handled by TanStack Query network detection
  
  // Simple loading state - complex logic moved to useLoadingState hook
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    progress: 0,
    completedTasks: new Set<string>(),
    requiredTasks: [] as string[],
    errors: [] as string[]
  });


  
  // Data loaded tracking removed - handled by TanStack Query status

  // State for entity search
  const [entitySearchResults, setEntitySearchResults] = useState<EntitySearchResult[]>([]);
  const [isLoadingEntitySearch, setIsLoadingEntitySearch] = useState(false);

  // Add ref to access current timeline state without causing useEffect recreation
  const interactionTimelineRef = useRef(interactionTimeline);
  
  // Update ref whenever timeline changes
  useEffect(() => {
    interactionTimelineRef.current = interactionTimeline;
  }, [interactionTimeline]);

  /* ---------- No longer needed - DatabaseManager handles initialization ---------- */
  useEffect(() => {
    // Database initialization is now handled by DatabaseManager in App.tsx
    // No local SQLite initialization needed here
    logger.debug('[DataContext] Database initialization handled by centralized DatabaseManager');
  }, []);

  /* ---------- Initialize WebSocketHandler when user is authenticated ---------- */
  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize WebSocketHandler for real-time message handling
      // This ensures WebSocket is connected and authenticated before setting up handlers
      logger.debug('[DataContext] User authenticated, initializing WebSocketHandler', 'data');
      console.log('🔥 [DataContext] 🚀 STARTING WebSocket initialization...');
      
      // Test WebSocket connection first
      const testConnection = async () => {
        try {
          console.log('🔥 [DataContext] 🧪 Testing WebSocket connection...');
          const isConnected = websocketService.isSocketConnected();
          const isAuthenticated = websocketService.isSocketAuthenticated();
          
          console.log('🔥 [DataContext] WebSocket status:', {
            isConnected,
            isAuthenticated
          });
          
          if (!isConnected) {
            console.log('🔥 [DataContext] 🔌 WebSocket not connected, attempting to connect...');
            const token = await getAccessToken();
            if (token) {
              await websocketService.connect(token);
              console.log('🔥 [DataContext] ✅ WebSocket connected successfully');
            }
          }
          
          // Test if we can receive events by registering a test handler
          console.log('🔥 [DataContext] 🧪 Registering test event handler...');
          // Note: WebSocket event handling is done through webSocketHandler, not directly on websocketService
          
          // Initialize the WebSocketHandler
          webSocketHandler.initialize();
          
          // Initialize BalanceManager for real-time balance updates
          console.log('🔥 [DataContext] 💰 BalanceManager ready for use (no initialization needed)');
          console.log('🔥 [DataContext] ✅ All services initialized successfully');
          
    } catch (error) {
          console.error('🔥 [DataContext] ❌ WebSocket connection test failed:', error);
        }
      };
      
      testConnection();
    }
  }, [isAuthenticated, user]);

  // Balance fetching removed - handled by useBalances hook

  // 🚀 NEW: Proactive timeline caching for WhatsApp-like experience
  // preloadRecentTimelines function will be defined after fetchInteractionTimeline

  // fetchInteractions removed - handled by TanStack Query useInteractions hook

  // fetchRecentConversations removed - handled by TanStack Query useRecentConversations hook

  // Loading initialization removed - handled by useLoadingState hook

  // Add request deduplication for timeline fetches
  // Note: Timeline request deduplication now handled by GlobalRequestManager

  // Function to clear all timeline state (called on logout)
  const clearAllTimelineState = useCallback(() => {
    logger.debug('[DataContext] Clearing all timeline state for user logout', 'data_timeline');
    
    // Cancel any active timeline requests
    // Timeline requests now managed by GlobalRequestManager
    
    // Clear timeline state
    setInteractionTimeline([]);
    interactionTimelineRef.current = [];
    
    // Reset loading states
    setIsLoadingTimeline(false);
    
    logger.debug('[DataContext] Timeline state cleared successfully', 'data_timeline');
  }, []);

  // Function to clear ALL data state (called on logout)
  const clearAllDataState = useCallback(() => {
    console.log('🔥 [DataContext] ⚠️  CLEARING ALL DATA STATE - THIS WILL NULL VERIFICATION STATUS');
    console.trace('🔥 [DataContext] Stack trace for clearAllDataState call');
    logger.debug('[DataContext] Clearing ALL data state for user logout', 'data');
    
    // Clear timeline state
    clearAllTimelineState();
    
    // Clear all TimelineManager instances
    TimelineManager.clearAllInstances();
    
    // Disconnect and clear WebSocket state
    try {
      websocketService.disconnect();
      logger.debug('[DataContext] WebSocket disconnected for logout', 'data');
    } catch (error) {
      logger.warn('[DataContext] Error disconnecting WebSocket', 'data', { error: error instanceof Error ? error.message : String(error) });
    }
    
    // Clear MessageManager, TransactionManager state (BalanceManager doesn't have cleanup)
    try {
      messageManager.cleanup();
      transactionManager.cleanup();
      // Note: balanceManager doesn't have cleanup method
      webSocketHandler.cleanup();
      logger.debug('[DataContext] Managers cleaned up for logout', 'data');
    } catch (error) {
      logger.warn('[DataContext] Error cleaning up managers', 'data', { error: error instanceof Error ? error.message : String(error) });
    }
    
    // Clear all other data state
    setInteractionsList([]);
    setCurrencyBalances([]);
    setTotalFiat(0);
    setBalances([]);
    setEntitySearchResults([]);
    // Optimistic message store removed
    
    // Reset loading states
    setIsLoadingBalances(false);
    setIsLoadingInteractions(false);
    setIsLoadingRecentConversations(false);
    setIsLoadingEntitySearch(false);
    setIsInitialLoadComplete(false);
    
    // Reset loading state
    setLoadingState({
      isLoading: false,
      progress: 0,
      completedTasks: new Set<string>(),
      requiredTasks: [],
      errors: []
    });
    
    // Refresh timestamps removed
    
    logger.debug('[DataContext] All data state cleared successfully', 'data');
  }, [clearAllTimelineState]);

  // 🚀 Professional Timeline Fetching with Global Request Deduplication
  // fetchInteractionTimeline removed - handled by TanStack Query useTimeline hook

  // fetchInteractionTimelineInternal removed - handled by TanStack Query useTimeline hook
  // Function body removed - handled by TanStack Query useTimeline hook

  // Function to add a new message (received via WebSocket) to the timeline state
  // addMessageToTimeline removed - handled by TanStack Query useTimeline hook with optimistic updates

  // addTransactionToTimeline removed - handled by TanStack Query useTimeline hook with optimistic updates

  // Search function removed - handled by TanStack Query useSearchEntities hook

  // Get or create interaction function removed - handled by TanStack Query useCreateInteraction hook

  // Refresh functions removed - handled by TanStack Query hook refetch methods

  // Send message function removed - handled by TanStack Query useSendMessage mutation hook

  // sendDirectTransaction removed - handled by TanStack Query useTransferMoney mutation

  // Timeline preloading removed - handled by TanStack Query useTimeline hook with prefetching

  // updateInteractionPreviewFromTimelineHelper removed - handled by TanStack Query useTimeline hook

  // CRITICAL: Reset DataContext state when user logs out
  useEffect(() => {
    if (!isAuthenticated && !isAuthLoading) {
      console.log('🧹 [DataContext] User logged out, resetting all state...');
      clearAllDataState();
    }
  }, [isAuthenticated, isAuthLoading]);



  // Initialize NetworkService when DataContext starts
  useEffect(() => {
    console.log('🌐 [DataContext] 🚀 Initializing network monitoring...');
    
    const initializeNetworkService = async () => {
      try {
        // Initialize network service
        logger.debug('[DataContext] 🌐 Initializing NetworkService...');
        await networkService.initialize();
        logger.info('[DataContext] ✅ NetworkService initialized successfully');
        
        // Set up network state listener
        const networkUnsubscribe = networkService.onNetworkStateChange((state) => {
          logger.info(`[DataContext] 🌐 Network state changed: ${state.isOfflineMode ? 'OFFLINE' : 'ONLINE'}`);
          
          if (!state.isOfflineMode && state.isConnected) {
            // Coming back online - trigger background sync for critical data
            logger.debug('[DataContext] 🔄 Back online - triggering background sync');
            
            // Only sync if we have authenticated user
            if (isAuthenticated && user) {
              // Background balance sync handled by TanStack Query
            }
          }
        });
        
        // Get initial network state
        const initialState = networkService.getNetworkState();
        logger.debug(`[DataContext] Initial network state: ${JSON.stringify(initialState)}`);
        
        return networkUnsubscribe;
      } catch (error) {
        logger.error('[DataContext] ❌ Failed to initialize NetworkService:', error);
        // Continue without network service - app should still work offline
        return () => {}; // Return empty cleanup function
      }
    };
    
    let networkCleanup: (() => void) | null = null;
    
    initializeNetworkService().then((cleanup) => {
      networkCleanup = cleanup;
    });
    
    return () => {
      if (networkCleanup) {
        networkCleanup();
      }
    };
  }, [isAuthenticated, user]);





  // Return the context value
  const contextValue: DataContextType = {
    // Data
    currencyBalances,
    totalFiat,
    balances,
    totalBalance: totalFiat,
    interactionsList,
    recentConversations,
    entitySearchResults,
    interactionTimeline,
    
    // User Profile Data
    userProfile,
    kycStatus,
    personalInfo,
    verificationStatus,
    
    // Loading states
    isLoadingBalances,
    isLoadingInteractions,
    isLoadingRecentConversations,
    isLoadingEntitySearch,
    isLoadingTimeline,
    // isLoadingUserData removed - handled by TanStack Query
    isInitialLoadComplete,
    
    // Professional loading state
    loadingState,
    
    // Data loading completion tracking removed - handled by TanStack Query status

    // Actions - STUB IMPLEMENTATIONS: These are disabled in favor of TanStack Query
    refreshBalances: async () => {
      logger.debug('[DataContext] refreshBalances called - DISABLED: Use TanStack Query useBalances hook instead');
    },
    refreshInteractions: async () => {
      logger.debug('[DataContext] refreshInteractions called - DISABLED: Use TanStack Query useInteractions hook instead');
    },
    refreshRecentConversations: async () => {
      logger.debug('[DataContext] refreshRecentConversations called - DISABLED: Use TanStack Query useRecentConversations hook instead');
    },
    refreshUserData: async () => {
      logger.debug('[DataContext] refreshUserData called - DISABLED: Use TanStack Query useUserProfile hook instead');
    },
    refreshAll: async () => { logger.debug('[DataContext] DISABLED - Use TanStack Query refetch methods'); },
    // DISABLED FUNCTIONS - Use TanStack Query hooks instead
    searchAll: async () => { logger.debug('[DataContext] DISABLED - Use useSearchEntities hook'); return []; },
    getOrCreateDirectInteraction: async () => { logger.debug('[DataContext] DISABLED - Use useCreateInteraction hook'); return null; },
    sendMessage: async () => { logger.debug('[DataContext] DISABLED - Use useSendMessage mutation'); return null; },
    sendDirectTransaction: async () => { logger.debug('[DataContext] DISABLED - Use useTransferMoney mutation'); return null; },
    fetchInteractionTimeline: async () => { logger.debug('[DataContext] DISABLED - Use useTimeline hook'); },
    // Timeline manipulation functions removed - handled by TanStack Query useTimeline hook
    updateInteractionPreviewFromTimeline: async () => { logger.debug('[DataContext] DISABLED - Use useTimeline hook'); },
    clearAllTimelineState: clearAllTimelineState,
    clearRefreshThrottling: () => { logger.debug('[DataContext] DISABLED - Use TanStack Query'); },
    
    // Local-first utilities
    hasLocalData: async () => false, // TODO: Implement hasLocalData function
    hasEssentialLocalData: async () => false, // TODO: Implement hasEssentialLocalData function
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Hook to use the DataContext
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};