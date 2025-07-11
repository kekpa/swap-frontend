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
import { CreateDirectMessageDto } from "../../../../backend/infra/dto/message.dto";
import { AxiosError } from "axios";
import { TimelineItem, MessageTimelineItem, TransactionTimelineItem } from "../types/timeline.types";
import { websocketService } from "../services/websocketService";
import { messageRepository } from "../localdb/MessageRepository";
import { transactionRepository } from "../localdb/TransactionRepository";
import { timelineRepository } from "../localdb/TimelineRepository";
import { messageManager } from '../services/MessageManager';
import { webSocketHandler } from '../services/WebSocketHandler';
import { transactionManager } from '../services/TransactionManager';
import { balanceManager } from '../services/BalanceManager';
import { Transaction, TransactionType, ProcessedByType } from '../types/transaction.types';
import { Alert } from "react-native";
import { CreateTransactionRequest } from '../types/transaction.types';
import { authEvents, AUTH_EVENT_TYPES } from '../utils/authManager';
import { TimelineManager } from '../services/TimelineManager';
import { getAccessToken } from '../utils/tokenStorage';
import contactsService from '../services/ContactsService';
import { eventEmitter } from '../utils/eventEmitter';
import { networkService } from '../services/NetworkService';

// Local-first imports - Add all repository imports for instant data loading
import { UserRepository } from '../localdb/UserRepository';
// AccountBalanceRepository removed - using CurrencyWalletsRepository
import { InteractionRepository } from '../localdb/InteractionRepository';
import { LocationRepository } from '../localdb/LocationRepository';
import { SearchHistoryRepository } from '../localdb/SearchHistoryRepository';

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

// Mock data for development
const MOCK_DATA = {
  currencyBalances: [
    { code: "HTG", symbol: "G", balance: 10000 },
    { code: "USD", symbol: "$", balance: 150 }
  ],
  totalFiat: 10150,
  balances: [],
  interactions: [
    {
      id: 'mock-1',
      name: 'Mock Swap Chat',
      is_group: false,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members: [
        {
          entity_id: 'user-profile-id-current', // Placeholder for current user's entity ID
          role: 'MEMBER',
          display_name: 'Current User',
          avatar_url: undefined,
          entity_type: 'profile'
        },
        {
          entity_id: 'contact-profile-id-other', // Placeholder for other user's entity ID
          role: 'MEMBER',
          display_name: 'Mock Contact',
          avatar_url: undefined,
          entity_type: 'profile'
        }
      ],
      last_message_snippet: 'Mock: Welcome!',
      last_message_sender_id: 'contact-profile-id-other',
      unread_count: 1,
    }
  ] as InteractionItem[], // Ensure mock data conforms to InteractionItem[]
  timeline: [],
};

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
  isLoadingUserData: boolean;
  isInitialLoadComplete: boolean;
  
  // Professional loading state for UI components
  loadingState: {
    isLoading: boolean;
    progress: number;
    completedTasks: Set<string>;
    requiredTasks: string[];
    errors: string[];
  };
  
  // Data loading completion tracking
  hasLoadedInteractions: boolean;
  hasLoadedBalances: boolean;
  hasLoadedUserData: boolean;
  hasLoadedRecentConversations: boolean;

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
  addMessageToTimeline: (interactionId: string, newMessageData: Partial<MessageTimelineItem> & { interaction_id: string; sender_entity_id?: string; metadata?: any; content?: string; message_type?: APIMessageType; created_at?: string; status?: MessageStatus; id?: string; }) => Promise<void>;
  addTransactionToTimeline: (interactionId: string, tx: any) => Promise<void>;
  updateInteractionPreviewFromTimeline: (interactionId: string) => Promise<void>;
  clearAllTimelineState: () => void;
  clearRefreshThrottling: () => void;
  
  // Local-first utilities
  hasLocalData: () => Promise<boolean>;
  hasEssentialLocalData: () => Promise<boolean>;
}

// Create the context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Local-first repository instances
const userRepository = UserRepository.getInstance();
// const accountBalanceRepository = AccountBalanceRepository.getInstance();
const interactionRepository = InteractionRepository.getInstance();
const locationRepository = LocationRepository.getInstance();
const searchHistoryRepository = SearchHistoryRepository.getInstance();

// Cache configuration for professional data management
const CACHE_KEYS = {
  USER_PROFILE: 'cache_user_profile',
  KYC_STATUS: 'cache_kyc_status',
  PERSONAL_INFO: 'cache_personal_info',
  VERIFICATION_STATUS: 'cache_verification_status',
  INTERACTIONS: 'cache_interactions',
  BALANCES: 'cache_balances',
} as const;

const CACHE_TTL = {
  USER_PROFILE: 30 * 60 * 1000, // 30 minutes
  KYC_STATUS: 15 * 60 * 1000,   // 15 minutes
  INTERACTIONS: 5 * 60 * 1000,  // 5 minutes
  BALANCES: 2 * 60 * 1000,      // 2 minutes
} as const;

// Cache utility functions
const setCacheItem = async (key: string, data: any, ttl: number): Promise<void> => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    logger.debug(`[Cache] Saved ${key} with TTL ${ttl}ms`, 'cache');
  } catch (error) {
    logger.warn(`[Cache] Failed to save ${key}`, 'cache', { error: String(error) });
  }
};

const getCacheItem = async (key: string): Promise<any | null> => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;

    if (age > cacheData.ttl) {
      // Cache expired, remove it
      await AsyncStorage.removeItem(key);
      logger.debug(`[Cache] Expired and removed ${key} (age: ${age}ms)`, 'cache');
      return null;
    }

    logger.debug(`[Cache] Hit for ${key} (age: ${age}ms)`, 'cache');
    return cacheData.data;
  } catch (error) {
    logger.warn(`[Cache] Failed to read ${key}`, 'cache', { error: String(error) });
    return null;
  }
};

const clearCache = async (keys?: string[]): Promise<void> => {
  try {
    const keysToRemove = keys || Object.values(CACHE_KEYS);
    await AsyncStorage.multiRemove(keysToRemove);
    logger.debug(`[Cache] Cleared ${keysToRemove.length} cache keys`, 'cache');
  } catch (error) {
    logger.warn('[Cache] Failed to clear cache', 'cache', { error: String(error) });
  }
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const authContext = useAuthContext();
  const user = authContext?.user;
  const isAuthenticated = authContext?.isAuthenticated || false;
  const isGuestMode = authContext?.isGuestMode || false;
  const isAuthLoading = authContext?.isLoading || false;
  const getAccessToken = authContext?.getAccessToken;

  // Critical Transition Period Management to prevent rapid state changes
  const [isCriticalTransitionPeriod, setIsCriticalTransitionPeriod] = useState(false);
  const transitionTimer = useRef<NodeJS.Timeout | null>(null);
  const lastNavigationChange = useRef<number>(0);
  const transitionPeriodDuration = 2000; // 2 seconds critical period
  
  // Batch state updates during transition to prevent magazine page effect
  const [pendingStateUpdates, setPendingStateUpdates] = useState<Array<() => void>>([]);
  const batchUpdateTimer = useRef<NodeJS.Timeout | null>(null);

  // Start critical transition period when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user && !isAuthLoading) {
      console.log('🚨 [DataContext] 🔄 CRITICAL TRANSITION PERIOD STARTED - Preventing rapid state changes');
      lastNavigationChange.current = Date.now();
      setIsCriticalTransitionPeriod(true);
      
      // Clear any existing timer
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current);
      }
      
      // End critical period after duration
      transitionTimer.current = setTimeout(() => {
        console.log('🚨 [DataContext] ✅ CRITICAL TRANSITION PERIOD ENDED - Resuming normal operations');
        setIsCriticalTransitionPeriod(false);
        
        // Apply any pending state updates
        if (pendingStateUpdates.length > 0) {
          console.log(`🚨 [DataContext] Applying ${pendingStateUpdates.length} pending state updates`);
          pendingStateUpdates.forEach(update => update());
          setPendingStateUpdates([]);
        }
      }, transitionPeriodDuration);
    }
    
    return () => {
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current);
      }
      if (batchUpdateTimer.current) {
        clearTimeout(batchUpdateTimer.current);
      }
    };
  }, [isAuthenticated, user, isAuthLoading]);

  // Safe state update function that respects critical transition period
  const safeStateUpdate = useCallback((updateFn: () => void, isHighPriority = false) => {
    if (!isCriticalTransitionPeriod || isHighPriority) {
      // Normal operation - apply immediately
      updateFn();
    } else {
      // During critical period - batch the update
      setPendingStateUpdates(prev => [...prev, updateFn]);
    }
  }, [isCriticalTransitionPeriod]);

  // Check if we're in mock mode - needs to match the setting in AuthContext
  const MOCK_USER_ENABLED = false;
  
  // Add timestamp tracking for last refresh
  const [lastInteractionsRefresh, setLastInteractionsRefresh] = useState<number>(0);
  const [lastBalancesRefresh, setLastBalancesRefresh] = useState<number>(0);
  // Minimum time between refreshes in milliseconds (3 seconds)
  const MIN_REFRESH_INTERVAL = 3000;

  // Add function to clear throttling on login
  const clearRefreshThrottling = useCallback(() => {
    logger.debug('[DataContext] Clearing refresh throttling for fresh start', 'data');
    setLastInteractionsRefresh(0);
    setLastBalancesRefresh(0);
    setLastRecentConversationsRefresh(0);
    setLastUserDataRefresh(0);
    setHasLoadedInteractions(false);
    setHasLoadedBalances(false);
    setHasLoadedUserData(false);
    setHasLoadedRecentConversations(false);
  }, []);

  // Add timestamp tracking for last recentConversations refresh
  const [lastRecentConversationsRefresh, setLastRecentConversationsRefresh] = useState<number>(0);
  const [lastUserDataRefresh, setLastUserDataRefresh] = useState<number>(0);

  // State for data - initialize with mock data for development
  const [currencyBalances, setCurrencyBalances] = useState<CurrencyBalance[]>(
    MOCK_USER_ENABLED ? MOCK_DATA.currencyBalances : []
  );
  const [totalFiat, setTotalFiat] = useState(
    MOCK_USER_ENABLED ? MOCK_DATA.totalFiat : 0
  );
  const [balances, setBalances] = useState<Balance[]>([]);
  const [interactionsList, setInteractionsList] = useState<InteractionItem[]>(
    MOCK_USER_ENABLED ? MOCK_DATA.interactions : []
  );
  const [recentConversations, setRecentConversations] = useState<RecentConversationItem[]>([]);
  const [interactionTimeline, setInteractionTimeline] = useState<TimelineItem[]>([]);
  const [optimisticMessageStore, setOptimisticMessageStore] = useState<Record<string, string>>({}); // Maps optimisticId to authoritativeId

  // User Profile Data State
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [kycStatus, setKycStatus] = useState<any | null>(null);
  const [personalInfo, setPersonalInfo] = useState<any | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<any | null>(null);
  
  // Add logging when verification status changes
  useEffect(() => {
    console.log("🔥 [DataContext] 🔄 Verification status changed:", verificationStatus);
    if (verificationStatus === null) {
      console.log("🔥 [DataContext] ⚠️  WARNING: Verification status set to NULL");
      console.trace("🔥 [DataContext] Stack trace for null verification status");
    }
  }, [verificationStatus]);

  // Loading states
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [isLoadingRecentConversations, setIsLoadingRecentConversations] = useState(false);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // Network and offline state
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [networkState, setNetworkState] = useState({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    isOfflineMode: false,
  });
  
  // Professional Loading State Manager with guest mode support
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    progress: 0,
    completedTasks: new Set<string>(),
    requiredTasks: isGuestMode ? ['interactions', 'contacts'] : ['interactions', 'balances', 'userData', 'contacts', 'recentTransactions'],
    errors: [] as string[]
  });
  
  // Prevent duplicate loading calls with ref
  const isInitialLoadInProgress = useRef(false);
  const loadingCompletionHandled = useRef(false);

  // Helper functions for loading state management
  const startTask = useCallback((taskName: string) => {
    console.log(`🔥 [LoadingManager] 🚀 Starting task: ${taskName}`);
    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
    }));
  }, []);

  const markTaskComplete = useCallback((taskName: string) => {
    console.log(`🔥 [LoadingManager] ✅ Task completed: ${taskName}`);
    setLoadingState(prev => {
      const newCompletedTasks = new Set(prev.completedTasks);
      newCompletedTasks.add(taskName);
      const progress = Math.round((newCompletedTasks.size / prev.requiredTasks.length) * 100);
      
      console.log(`🔥 [LoadingManager] 📊 Progress: ${progress}%, Completed: ${Array.from(newCompletedTasks).join(', ')}`);
      
      return {
        ...prev,
        completedTasks: newCompletedTasks,
        progress,
        isLoading: newCompletedTasks.size < prev.requiredTasks.length,
      };
    });
  }, []);

  // CRITICAL: Watch loadingState and set isInitialLoadComplete when all tasks are done
  useEffect(() => {
    const allTasksCompleted = loadingState.completedTasks.size >= loadingState.requiredTasks.length;
    const isLoadingFinished = !loadingState.isLoading;
    const progressComplete = loadingState.progress >= 100;
    
    console.log('🔥 [LoadingManager] 🎯 Checking completion status:', {
      allTasksCompleted,
      isLoadingFinished,
      progressComplete,
      completedCount: loadingState.completedTasks.size,
      requiredCount: loadingState.requiredTasks.length,
      currentIsInitialLoadComplete: isInitialLoadComplete
    });
    
    if (allTasksCompleted && isLoadingFinished && progressComplete && !isInitialLoadComplete) {
      console.log('🔥 [LoadingManager] 🎉 ALL TASKS COMPLETED - Setting isInitialLoadComplete = true');
      setIsInitialLoadComplete(true);
    }
  }, [loadingState.completedTasks.size, loadingState.isLoading, loadingState.progress, loadingState.requiredTasks.length, isInitialLoadComplete]);

  const resetLoadingState = useCallback(() => {
    console.log('🔥 [LoadingManager] 🔄 Resetting loading state');
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      progress: 0,
      completedTasks: new Set<string>(),
      errors: []
    }));
    isInitialLoadInProgress.current = false;
    loadingCompletionHandled.current = false;
  }, []);


  
  // Add new state to track if data has been loaded at least once, even if empty
  const [hasLoadedInteractions, setHasLoadedInteractions] = useState(MOCK_USER_ENABLED);
  const [hasLoadedBalances, setHasLoadedBalances] = useState(MOCK_USER_ENABLED);
  const [hasLoadedUserData, setHasLoadedUserData] = useState(MOCK_USER_ENABLED);
  const [hasLoadedRecentConversations, setHasLoadedRecentConversations] = useState(MOCK_USER_ENABLED);

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
    if (isAuthenticated && user && !MOCK_USER_ENABLED) {
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

  // Local-first balance fetching - Load from local first, then sync in background
  const fetchBalances = useCallback(
    async (forceRefresh = false) => {
      logger.debug(`[DataContext] fetchBalances called (forceRefresh: ${forceRefresh})`);
      
      // Skip if using mock data
      if (MOCK_USER_ENABLED) {
        logger.debug("Using mock balance data instead of API calls", "data");
        setHasLoadedBalances(true);
        return;
      }
    
      // 1. ALWAYS load from local first (instant UI)
      try {
        // Legacy account balances no longer supported - using CurrencyWalletsRepository
        const localBalances: any[] = []; // await accountBalanceRepository.getAccountBalances();
        if (localBalances.length > 0) {
          logger.debug(`[DataContext] Loaded ${localBalances.length} balances from local cache`);
          
          // Transform to UI format and update state immediately
          const currencyData = localBalances.map((balance: any) => ({
            code: balance.currency_code,
            symbol: balance.currency_symbol,
            balance: balance.balance
          }));
          
          setCurrencyBalances(currencyData);
          setTotalFiat(currencyData.reduce((sum: number, curr: any) => sum + curr.balance, 0));
          setHasLoadedBalances(true);
          setIsLoadingBalances(false);
          
          logger.debug('[DataContext] ✅ Balances loaded from local cache - UI updated instantly');
        }
      } catch (error) {
        logger.debug('[DataContext] Error loading balances from local cache:', String(error));
      }

      // 2. Skip background sync if in guest mode or not authenticated
      if (isGuestMode || !isAuthenticated || isAuthLoading || !user) {
        logger.debug("Skipping balance background sync: guest mode or not authenticated", "data");
        setIsLoadingBalances(false);
        setHasLoadedBalances(true);
        return;
      }

      // 3. Background sync - fetch from remote and update local cache
      logger.debug('[DataContext] 🔄 Starting background sync for balances');
      
      // Check if we've recently refreshed and aren't forcing a refresh
      const now = Date.now();
      if (!forceRefresh && hasLoadedBalances && (now - lastBalancesRefresh < MIN_REFRESH_INTERVAL)) {
        logger.debug(`Throttling balances API calls: last refresh was ${now - lastBalancesRefresh}ms ago`, "data");
        return;
      }

      // Don't sync if we're already syncing
      if (isLoadingBalances && !forceRefresh) {
        logger.debug("Already syncing balances, skipping duplicate fetch", "data");
        return;
      }

      // CRITICAL: Ensure we have a valid token before making the request to prevent 401 cascade
      try {
        const token = await getAccessToken();
        if (!token) {
          console.warn("🔒 [DataContext] No access token available for balance sync - stopping to prevent 401 errors");
          return;
        }
        
        // Test if token is valid by making a lightweight request first
        try {
          await apiClient.get('/auth/verify-token');
          console.log("✅ [DataContext] Token validation successful, proceeding with balance sync");
        } catch (tokenValidationError: any) {
          if (tokenValidationError.response?.status === 401) {
            console.warn("🔒 [DataContext] Token invalid (401), stopping balance sync to prevent cascade failure");
            return;
          }
          // If it's not a 401, continue anyway (might be network issue)
          console.warn("⚠️ [DataContext] Token validation failed but not 401, continuing with balance sync");
        }
      } catch (error) {
        logger.warn("[DataContext] Failed to get access token for balance sync", "data");
        return;
      }

      // Set syncing state (but don't block UI)
      setIsLoadingBalances(true);

      try {
        // Update timestamp even if we get an error
        setLastBalancesRefresh(now);
        setHasLoadedBalances(true);

        // Get the profile ID from the user object
        const profileId = user.profileId;

        if (!profileId) {
          logger.error("User has no profile ID", { userId: user.id });
          // Use the user ID as a fallback for the profile ID
          const fallbackProfileId = user.id;
          logger.debug(`Using user ID as fallback profile ID: ${fallbackProfileId}`, "data");
          
          // Fetch balances using the fallback ID - using the correct API path
          const response = await apiClient.get(
            API_PATHS.ACCOUNT.LIST
          );
          
          if (!response.data) {
            throw new Error("Invalid balance data received");
          }
          
          // Continue processing as normal with the fallback ID
          logger.debug(`Balance API response with fallback ID: ${JSON.stringify(response.data)}`, "data");
          
          // Check if we have balance data and it's in the expected format
          if (response.data && response.data.length > 0) {
            const currencyData = response.data[0];
            // Make sure we're accessing the right property (balance vs balances)
            const balanceAmount = parseFloat(currencyData.balance) || 0;
            
            const balances: CurrencyBalance[] = [
              { 
                code: currencyData.code, 
                symbol: currencyData.symbol, 
                balance: balanceAmount 
              }
            ];
            
            setCurrencyBalances(balances);
            setTotalFiat(balanceAmount);
            
            // Save to local cache for next time - use insertAccountBalance with proper type
            const balanceToSave = {
              id: `${fallbackProfileId}_${currencyData.code}`,
              balance: balanceAmount,
              currency_code: currencyData.code,
              currency_symbol: currencyData.symbol,
              account_type: 'primary',
              status: 'active',
              last_updated: new Date().toISOString()
            };
            
            // await accountBalanceRepository.insertAccountBalance(balanceToSave as any);
            logger.debug(`Balances synced and cached: ${balanceAmount} ${currencyData.code}`, "data");
          } else {
            // If no data, set empty balance with 0
            setCurrencyBalances([]);
            setTotalFiat(0);
            logger.debug("No balance data found, setting empty balance", "data");
          }
        } else {
          logger.debug(`Fetching real balances for profile: ${profileId}`, "data");

          // Define multiple endpoints to try for balance information
          const endpoints = [
            API_PATHS.ACCOUNT.LIST,  // Only use the working endpoint
          ];
          
          let response = null;
          let successEndpoint = '';
          
          // Try each endpoint until one works
          for (const endpoint of endpoints) {
            try {
              logger.debug(`Trying to fetch balances from: ${endpoint}`, "data");
              response = await apiClient.get(endpoint);
              
              if (response && response.data) {
                successEndpoint = endpoint;
                logger.debug(`Successfully fetched data from: ${endpoint}`, "data");
                break; // Break the loop as we found working endpoint
              }
            } catch (endpointError) {
              logger.debug(`Endpoint ${endpoint} failed: ${endpointError}`, "data");
              // Continue to next endpoint
            }
          }
          
          // If standard endpoint failed, there's no fallback anymore
          if (!response || !response.data) {
            logger.debug("Balance endpoint failed, setting empty balance", "data");
            setCurrencyBalances([]);
            setTotalFiat(0);
            return;
          }

          // Process the response data from accounts endpoint
          logger.debug(`Balance API response from ${successEndpoint}: ${JSON.stringify(response.data)}`, "data");

          let balanceData: CurrencyBalance[] = [];
          
          // Access the actual array of accounts – backend may return array directly or nested under data
          const accountsArrayRaw = Array.isArray(response.data?.data) ? response.data.data : response.data;
          const accountsArray = Array.isArray(accountsArrayRaw) ? accountsArrayRaw : [];
          
          // Process data from accounts endpoint
          if (Array.isArray(accountsArray) && accountsArray.length > 0) {
            // For each account, extract currency information
            for (const account of accountsArray) {
              const balance = parseFloat(account.balance) || 0;
              
              // Get currency details from joined currencies data
              const currencyCode = account.currencies?.code || "HTG";
              const currencySymbol = account.currencies?.symbol || "G";
              
              balanceData.push({
                code: currencyCode,
                symbol: currencySymbol,
                balance: balance
              });
            }
          }
          
          // If we have balance data, update state
          if (balanceData.length > 0) {
            setCurrencyBalances(balanceData);
            
            // Sum all balances for total fiat
            const totalBalance = balanceData.reduce((sum, curr) => sum + curr.balance, 0);
            setTotalFiat(totalBalance);
            
            logger.debug(`Real balances loaded: ${totalBalance} from ${balanceData.length} accounts`, "data");
          } else {
            // No balance data available, use empty/zero
            setCurrencyBalances([]);
            setTotalFiat(0);
            logger.debug("No balance data found in the response, setting empty balance", "data");
          }
        }
          } catch (error: any) {
      logger.error("Error fetching balances", error, "data");
      
      // On error, set empty values instead of fallback
      setCurrencyBalances([]);
      setTotalFiat(0);
      
      logger.debug("Error fetching balances, setting empty values", "data");
    } finally {
      setIsLoadingBalances(false);
      // Removed setIsInitialLoadComplete(true) - let LoadingManager handle this
    }
    },
    [isAuthenticated, isAuthLoading, user, isLoadingBalances, hasLoadedBalances, lastBalancesRefresh, isGuestMode]
  );
  
  // 🚀 NEW: Proactive timeline caching for WhatsApp-like experience
  // preloadRecentTimelines function will be defined after fetchInteractionTimeline

  // 🚀 Enhanced fetchInteractions with proactive timeline caching
  const fetchInteractions = useCallback(async (forceRefresh = false) => {
    const logContext = '🔥 [DataContext]';
    
    console.log(`${logContext} 🚀 fetchInteractions called`, {
      forceRefresh,
      hasUser: !!user,
      isAuthLoading,
      isAuthenticated,
      isGuestMode,
    });

    if (!isAuthenticated || isAuthLoading || isGuestMode) {
      console.log(`${logContext} 🚫 Not fetching interactions - auth state not ready`);
          return;
        }
        
    try {
      // STEP 1: Load from local cache first (instant UI update)
      console.log(`${logContext} 📱 STEP 1: Loading interactions from local cache (with members)...`);
      const localInteractions = await interactionRepository.getInteractionsWithMembers();
      
      console.log(`${logContext} 📱 Local interactions with members loaded:`, {
        count: localInteractions.length,
        interactions: localInteractions.slice(0, 3).map((i: any) => ({
          id: i.id,
          name: i.name,
          memberCount: i.members?.length || 0
        }))
      });

      if (localInteractions.length > 0) {
        // Transform to InteractionItem[] format
        const transformedInteractions: InteractionItem[] = localInteractions.map((local: any) => ({
          id: local.id,
          name: local.name || undefined,
          is_group: local.is_group || false,
          last_message_at: local.last_message_at || undefined,
          updated_at: local.updated_at || undefined,
          last_message_snippet: local.last_message_snippet || undefined,
          unread_count: local.unread_count || undefined,
          members: local.members.map((member: any) => ({
            entity_id: member.entity_id,
            role: member.role,
            display_name: member.display_name || undefined,
            avatar_url: member.avatar_url || undefined,
            entity_type: member.entity_type || undefined,
          }))
        }));
        
        setInteractionsList(transformedInteractions);
        console.log(`${logContext} ✅ Local interactions set in UI - INSTANT UPDATE (NO GLITCH)`);
        eventEmitter.emit('data_updated', { type: 'interactions', data: transformedInteractions });
        console.log(`${logContext} 📡 Emitted data_updated event for interactions`);
      }

      // STEP 2: Skip background sync if not needed
      if (!forceRefresh && localInteractions.length > 0) {
        const currentIsNewAuthentication = !hasLoadedInteractions && isAuthenticated;
        const shouldBypassThrottle = forceRefresh || !hasLoadedInteractions || currentIsNewAuthentication;
        const timeSinceLastRefresh = Date.now() - (lastInteractionsRefresh || 0);
        const minInterval = 3000; // 3 seconds

        console.log(`${logContext} 🕐 Throttling check:`, {
          hasLoadedInteractions,
          isNewAuthentication: currentIsNewAuthentication,
          lastRefresh: lastInteractionsRefresh,
          timeSinceLastRefresh,
          minInterval,
          shouldBypassThrottle,
          now: Date.now()
        });

        if (!shouldBypassThrottle && timeSinceLastRefresh < minInterval) {
          console.log(`${logContext} ⏱️ Skipping background sync - too soon (${timeSinceLastRefresh}ms < ${minInterval}ms)`);
      return;
        }
    }

      // STEP 3: Background sync
      console.log(`${logContext} 🔄 STEP 3: Starting background sync...`);
      console.log(`${logContext} 🌐 Background sync: Starting API call...`);

    setIsLoadingInteractions(true);
    
      const response = await apiClient.get('/interactions?public=true');
      console.log(`${logContext} 🌐 API response received:`, {
        status: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        itemCount: Array.isArray(response.data) ? response.data.length : 'N/A'
      });

      // Process API response
      let fetchedInteractions: InteractionItem[] = [];
      if (Array.isArray(response.data)) {
        fetchedInteractions = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        fetchedInteractions = response.data.data;
      } else if (response.data?.interactions && Array.isArray(response.data.interactions)) {
        fetchedInteractions = response.data.interactions;
      }

      console.log(`${logContext} 🌐 Processed interactions from API:`, {
        count: fetchedInteractions.length,
        interactions: fetchedInteractions.slice(0, 3).map((i: any) => ({
          id: i.id,
          name: i.name,
          memberCount: i.members?.length || 0
        }))
      });

      if (fetchedInteractions.length > 0) {
        // Save to local cache
        console.log(`${logContext} 💾 Saving interactions and members to local cache...`);
            for (const interaction of fetchedInteractions) {
          // Save interaction
          await interactionRepository.upsertInteraction(interaction);
          
          // Save members if they exist
          if (interaction.members && interaction.members.length > 0) {
            const membersToSave = interaction.members.map(member => ({
              interaction_id: interaction.id,
              entity_id: member.entity_id,
              role: member.role,
              display_name: member.display_name || null,
              avatar_url: member.avatar_url || null,
              entity_type: member.entity_type || 'profile',
              joined_at: new Date().toISOString()
            }));
            await interactionRepository.saveInteractionMembers(membersToSave);
          }
        }
        console.log(`${logContext} ✅ Interactions and members saved to local cache`);

        // Update UI
          setInteractionsList(fetchedInteractions);
        console.log(`${logContext} ✅ Interactions UI updated from API`);
        
        // Emit update event
        eventEmitter.emit('data_updated', { type: 'interactions', data: fetchedInteractions });
        console.log(`${logContext} 📡 Emitted data_updated event for API interactions`);
      }

      // Update tracking variables
      setHasLoadedInteractions(true);
      setLastInteractionsRefresh(Date.now());

      // 🚀 NEW: Start proactive timeline preloading after interactions are loaded
      setTimeout(() => {
        preloadRecentTimelines();
      }, 100); // Small delay to avoid blocking UI

    } catch (error) {
      console.error(`${logContext} ❌ Error fetching interactions:`, error);
    } finally {
      setIsLoadingInteractions(false);
      console.log(`${logContext} 🏁 Background sync completed (setIsLoadingInteractions = false)`);
    }
  }, [
    isAuthenticated,
    isGuestMode,
    isAuthLoading,
    user,
    hasLoadedInteractions,
    lastInteractionsRefresh
  ]);

  // Fetch recent conversations from API
  const fetchRecentConversations = useCallback(async (forceRefresh = false) => {
    if (MOCK_USER_ENABLED) {
      logger.debug("Using mock recent conversations data instead of API calls", "data");
      setRecentConversations([]);
      setHasLoadedRecentConversations(true);
      return;
    }

    if (!isAuthenticated || isAuthLoading || !user) {
      logger.debug("Skipping recent conversations fetch: not authenticated or still loading", "data");
      setIsLoadingRecentConversations(false);
      return;
    }

    // Check if we've recently refreshed and aren't forcing a refresh
    const now = Date.now();
    
    // For new authentication, bypass throttling to ensure data loads
    const isNewAuthentication = !hasLoadedRecentConversations && isAuthenticated;
    const shouldBypassThrottle = forceRefresh || isNewAuthentication;
    
    if (!shouldBypassThrottle && hasLoadedRecentConversations && (now - lastRecentConversationsRefresh < MIN_REFRESH_INTERVAL)) {
      logger.debug(`Throttling recent conversations API calls: last refresh was ${now - lastRecentConversationsRefresh}ms ago`, "data");
      return;
    }

    // Don't set loading if we're already loading (prevent duplicate fetches)
    if (isLoadingRecentConversations && !forceRefresh && !isNewAuthentication) {
      logger.debug("Already loading recent conversations, skipping duplicate fetch", "data");
      return;
    }

    setIsLoadingRecentConversations(true);
    // Always update the timestamp to prevent rapid successive calls
    setLastRecentConversationsRefresh(now);
    
    try {
      // Update timestamp and mark as loaded even if we get an error
      setHasLoadedRecentConversations(true);
      
      const response = await apiClient.get(API_PATHS.INTERACTION.RECENT);

      if (response && response.status === 200) {
        // Process the response data
        const conversationsData = response.data?.data || response.data || [];
        
        if (Array.isArray(conversationsData)) {
          const processedConversations: RecentConversationItem[] = conversationsData.map((item: any) => ({
            id: item.id,
            name: item.name || 'Unknown',
            type: item.type || 'direct',
            avatarUrl: item.avatar_url,
            initials: item.initials || '??',
            avatarColor: item.avatar_color || '#0077b6',
            lastMessageSnippet: item.last_message_snippet,
            lastMessageAt: item.last_message_at ? new Date(item.last_message_at) : undefined,
            contactEntityId: item.contact_entity_id,
            participantCount: item.participant_count || 0,
            hasUnreadMessages: item.has_unread_messages || false,
          }));
          
          setRecentConversations(processedConversations);
          logger.debug(`[DataContext] Recent conversations loaded: ${processedConversations.length} items`, "data");
        } else {
          setRecentConversations([]);
          logger.debug("[DataContext] No recent conversations data found", "data");
        }
      } else {
        setRecentConversations([]);
        logger.warn(`[DataContext] Error response from recent conversations API. Status: ${response?.status}`);
      }
    } catch (error: any) {
      logger.error("[DataContext] Error fetching recent conversations", error, "data");
      setRecentConversations([]);
    } finally {
      setIsLoadingRecentConversations(false);
    }
  }, [isAuthenticated, isAuthLoading, user, isLoadingRecentConversations, hasLoadedRecentConversations, lastRecentConversationsRefresh]);

  // CRITICAL: Start loading tasks when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isAuthLoading && !isInitialLoadInProgress.current) {
      console.log('🔥 [LoadingManager] 🚀 STARTING INITIAL DATA LOADING...');
      isInitialLoadInProgress.current = true;
      
      // Start all required tasks
      const tasks = isGuestMode ? ['interactions', 'contacts'] : ['interactions', 'balances', 'userData', 'contacts', 'recentTransactions'];
      
      console.log('🔥 [LoadingManager] 📋 Required tasks:', tasks);
      
      // CRITICAL: Update the required tasks in loading state to match what we're actually starting
      setLoadingState(prev => ({
        ...prev,
        requiredTasks: tasks,
        completedTasks: new Set<string>(), // Reset completed tasks
        progress: 0,
        isLoading: true
      }));
      
      // Start interactions task
      if (tasks.includes('interactions')) {
        startTask('interactions');
        fetchInteractions(false).finally(() => markTaskComplete('interactions'));
      }
      
      // Start balances task (only if not guest mode)
      if (tasks.includes('balances')) {
        startTask('balances');
        fetchBalances(false).finally(() => markTaskComplete('balances'));
      }
      
      // Start userData task (only if not guest mode)
      if (tasks.includes('userData')) {
        startTask('userData');
        // For now, mark userData as complete immediately since fetchUserData doesn't exist
        setTimeout(() => markTaskComplete('userData'), 100);
      }
      
      // Start contacts task
      if (tasks.includes('contacts')) {
        startTask('contacts');
        // For now, mark contacts as complete immediately since we don't have a fetchContacts function
        setTimeout(() => markTaskComplete('contacts'), 100);
      }
      
      // Start recentTransactions task (only if not guest mode)
      if (tasks.includes('recentTransactions')) {
        startTask('recentTransactions');
        fetchRecentConversations(false).finally(() => markTaskComplete('recentTransactions'));
      }
    }
  }, [isAuthenticated, user, isAuthLoading, isGuestMode, startTask, markTaskComplete, fetchInteractions, fetchBalances, fetchRecentConversations]);

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
    setOptimisticMessageStore({});
    
    // Reset loading states
    setIsLoadingBalances(false);
    setIsLoadingInteractions(false);
    setIsLoadingRecentConversations(false);
    setIsLoadingEntitySearch(false);
    setIsInitialLoadComplete(false);
    setHasLoadedInteractions(false);
    setHasLoadedBalances(false);
    setHasLoadedRecentConversations(false);
    
    // Reset loading manager state completely
    resetLoadingState();
    isInitialLoadInProgress.current = false;
    loadingCompletionHandled.current = false;
    
    // Reset refresh timestamps
    setLastInteractionsRefresh(0);
    setLastBalancesRefresh(0);
    
    logger.debug('[DataContext] All data state cleared successfully', 'data');
  }, [clearAllTimelineState]);

  // 🚀 Professional Timeline Fetching with Global Request Deduplication
  const fetchInteractionTimeline = useCallback(
    async (interactionId: string, options: { forceRefresh?: boolean; silentUpdate?: boolean } = {}) => {
      // Simplified for TanStack Query migration - direct call to internal function
      return fetchInteractionTimelineInternal(interactionId, options);
    },
    []
  );

  // Internal timeline fetch function (renamed from original)
  const fetchInteractionTimelineInternal = useCallback(
    async (interactionId: string, options: { forceRefresh?: boolean; silentUpdate?: boolean } = {}) => {
      const { forceRefresh = false, silentUpdate = false } = options;
      
      if (MOCK_USER_ENABLED || !interactionId) {
        setIsLoadingTimeline(false); // Ensure loading is false if we're returning early
        return;
      }

      logger.debug(`[DataContext] Fetching timeline for interaction ID: ${interactionId} (forceRefresh: ${forceRefresh}, silentUpdate: ${silentUpdate})`, "data_timeline");
      
      let localTimelineLoadedSuccessfully = false;
      let initialTimelineSetFromLocal = false;
      let hasExistingTimelineData = false;

      // Check if we already have timeline data in memory for this interaction
      const existingTimelineData = interactionTimelineRef.current.filter(item => 
        (item as any).interaction_id === interactionId && item.type !== 'date'
      );
      hasExistingTimelineData = existingTimelineData.length > 0;
      
      if (hasExistingTimelineData && silentUpdate) {
        logger.debug(`[DataContext] Using existing in-memory timeline (${existingTimelineData.length} items) for ${interactionId}`, "data_timeline");
        // We already have data, don't show loading for background refresh
        // Just continue with background API fetch
      }

      // STEP 1: Try to load from local SQLite first for instant display (only if no memory data or forced refresh)
      if ((await messageRepository.isSQLiteAvailable()) && (!hasExistingTimelineData || forceRefresh)) {
        logger.debug(`[DataContext] Loading timeline from local cache: ${interactionId}`, "data_timeline");
        try {
          const localTimeline = await timelineRepository.getTimelineForInteraction(interactionId, 100, {
            includeMessages: true,
            includeTransactions: true
          });
          
          if (localTimeline && localTimeline.length > 0) {
            // Add date separators to local timeline
            const timelineWithDates = timelineRepository.addDateSeparators(localTimeline);
            
            setInteractionTimeline(timelineWithDates);
            interactionTimelineRef.current = timelineWithDates;
            localTimelineLoadedSuccessfully = true;
            initialTimelineSetFromLocal = true;
            logger.info(`[DataContext] Local timeline loaded for ${interactionId}: ${localTimeline.length} items`, "data_timeline");
          }
        } catch (error) {
          logger.error(`[DataContext] Error loading local timeline for ${interactionId}:`, error instanceof Error ? error.message : String(error), "data_timeline");
        }
      }

      // STEP 2: Fetch from API. Only set loading if no data exists anywhere and not a silent update.
      const shouldShowLoading = !hasExistingTimelineData && !initialTimelineSetFromLocal && !silentUpdate;
      
      if (shouldShowLoading) {
        setIsLoadingTimeline(true); // Only show loading if we have nothing to display yet
        logger.debug(`[DataContext] Showing loading indicator for initial timeline fetch of ${interactionId}`, "data_timeline");
      } else {
        logger.debug(`[DataContext] Performing silent background update for ${interactionId}`, "data_timeline");
      }

      try {
        const path = API_PATHS.INTERACTION.TIMELINE(interactionId);
        const params: any = { limit: 100 };
        
        // Add current user entity ID for proper transaction perspective filtering
        if (authContext?.user?.entityId) {
          params.currentUserEntityId = authContext.user.entityId;
          logger.debug(`[DataContext] Adding currentUserEntityId to timeline request: ${authContext.user.entityId}`, 'data_timeline');
        }
        
        const response = await apiClient.get(path, { params });
        
        let fetchedItems: any[] = [];
        const raw = response.data;

        // With the fixed backend, response should be: { items: [...], pagination: {...}, meta: {...} }
        if (Array.isArray(raw?.items)) {
          fetchedItems = raw.items;
        } else if (raw?.data && Array.isArray(raw.data.items)) {
          // Fallback for old format during transition
           fetchedItems = raw.data.items;
        } else {
          logger.warn('Unexpected timeline response format', 'data_timeline', { responseKeys: Object.keys(raw || {}) });
        }
        
        logger.debug(`[DataContext] Retrieved ${fetchedItems.length} API timeline items for ${interactionId}`, "data_timeline");

        if (fetchedItems.length > 0) {
          // Add date separators to API timeline
          const timelineWithDates = timelineRepository.addDateSeparators(fetchedItems);
          
          setInteractionTimeline(timelineWithDates);
          interactionTimelineRef.current = timelineWithDates;
          logger.info(`[DataContext] API timeline loaded for ${interactionId}: ${fetchedItems.length} items`, "data_timeline");

          if (await messageRepository.isSQLiteAvailable()) {
            // Separate messages and transactions for saving to appropriate repositories
            const messagesToSave = fetchedItems
              .filter(item => (item.type === 'message' || item.itemType === 'message') && item.id && item.interaction_id)
              .map(item => ({
                ...item,
                id: String(item.id),
                interaction_id: String(item.interaction_id),
                itemType: 'message',
                type: 'message',
                sender_entity_id: item.sender_entity_id ? String(item.sender_entity_id) : 'system_or_unknown',
                created_at: typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : String(item.createdAt || item.timestamp),
                metadata: { ...item.metadata, isOptimistic: false } // Mark as not optimistic from API
              }));
              
            const transactionsToSave = fetchedItems
              .filter(item => (item.type === 'transaction' || item.itemType === 'transaction') && item.id && item.interaction_id)
              .map(item => ({
                ...item,
                id: String(item.id),
                interaction_id: String(item.interaction_id),
                itemType: 'transaction',
                type: 'transaction',
                from_account_id: item.from_account_id || item.from_entity_id,
                to_account_id: item.to_account_id || item.to_entity_id,
                created_at: typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : String(item.createdAt || item.timestamp),
                status: item.status || 'completed',
                transaction_type: item.transaction_type || 'transfer',
                entry_type: item.entry_type,
                metadata: { ...item.metadata, isOptimistic: false } // Mark as not optimistic from API
              }));

            // Save to respective repositories in the background
            if (messagesToSave.length > 0) {
              logger.debug(`[DataContext] Saving ${messagesToSave.length} API messages to local DB for ${interactionId}`, "data_timeline");
              messageRepository.saveMessages(messagesToSave).catch((err: any) => {
                logger.warn('[DataContext] Error saving API messages to local DB', 'data_timeline', { error: String(err) });
              });
            }
            
            if (transactionsToSave.length > 0) {
              logger.debug(`[DataContext] Saving ${transactionsToSave.length} API transactions to local DB for ${interactionId}`, "data_timeline");
              transactionRepository.saveTransactions(transactionsToSave).catch((err: any) => {
                logger.warn('[DataContext] Error saving API transactions to local DB', 'data_timeline', { error: String(err) });
              });
            }
          }
                } else {
          // No API data, but keep local data if we had any
          if (!localTimelineLoadedSuccessfully && !hasExistingTimelineData) {
          setInteractionTimeline([]);
          }
        }
        // If fetchedItems is empty but localTimeline was loaded, we keep the local ones.
        
      } catch (apiError) {
        logger.error(`Failed to fetch API timeline for ${interactionId}`, apiError, "data_timeline");
        if (!localTimelineLoadedSuccessfully && !hasExistingTimelineData) {
          // Critical error and no local data to show
          setInteractionTimeline([]);
        }
        // If local data was shown, we don't wipe it on API error.
      } finally {
        setIsLoadingTimeline(false); // Always set to false after API attempt
      }
    },
    [MOCK_USER_ENABLED, user] 
  );

  // Function to add a new message (received via WebSocket) to the timeline state
  const addMessageToTimeline = useCallback(async (interactionIdToAdd: string, newMessageData: Partial<MessageTimelineItem> & { interaction_id: string; sender_entity_id?: string; metadata?: any; content?: string; message_type?: APIMessageType; created_at?: string; status?: MessageStatus; id?: string; }) => {
    const logDetails = { msgId: newMessageData.id || 'N/A', contentPreview: newMessageData.content?.substring(0,20) };
    logger.debug(`[DataContext] addMessageToTimeline for ${interactionIdToAdd}`, 'data_timeline', logDetails);

    const messageId = newMessageData.id || `new-msg-${Date.now()}`;
    const senderId = newMessageData.sender_entity_id || user?.entityId || 'system_or_unknown';
    const createdAt = newMessageData.created_at ? 
      (typeof newMessageData.created_at === 'string' ? new Date(newMessageData.created_at) : newMessageData.created_at) : 
      new Date();
    const createdAtString = createdAt.toISOString();
    const isOptimistic = newMessageData.metadata?.isOptimistic === true;
    const optimisticIdFromPayload = newMessageData.metadata?.optimisticId as string | undefined;
    const idempotencyKey = newMessageData.metadata?.idempotency_key as string | undefined;

    console.log(`📨 [DEBUG] addMessageToTimeline: ${isOptimistic ? 'OPTIMISTIC' : 'AUTHORITATIVE'} message`);
    console.log(`📨 [DEBUG] Message details: id="${messageId}", content="${newMessageData.content}", optimisticId="${optimisticIdFromPayload}", idempotencyKey="${idempotencyKey}"`);

    setInteractionTimeline((prevTimeline) => {
      // Use Map for more efficient lookups by ID
      const messageMap = new Map<string, TimelineItem>();
      let itemReplaced = false;
      let replacedOptimisticId = '';

      // First, populate the map with all existing messages
      for (const item of prevTimeline) {
        messageMap.set(item.id, item);
      }

      // Remove optimistic message if this is its authoritative version
      if (optimisticIdFromPayload && messageMap.has(optimisticIdFromPayload) && messageMap.get(optimisticIdFromPayload)?.metadata?.isOptimistic) {
        logger.debug(`[DataContext] Replacing optimistic message ${optimisticIdFromPayload} with authoritative message ${messageId}`, 'data_timeline');
        console.log(`📨 [DEBUG] ✅ Replacing optimistic message ${optimisticIdFromPayload} with authoritative ${messageId}`);
        messageMap.delete(optimisticIdFromPayload);
        itemReplaced = true;
        replacedOptimisticId = optimisticIdFromPayload;
      }
      
      // Fallback: try to match by idempotency_key if no optimisticId match
      if (!itemReplaced && idempotencyKey && !isOptimistic) {
        const optimisticWithSameKey = Array.from(messageMap.values()).find(item => 
          item.metadata?.isOptimistic === true && 
          item.metadata?.idempotency_key === idempotencyKey
        );
        if (optimisticWithSameKey) {
          console.log(`📨 [DEBUG] ✅ Replacing optimistic message ${optimisticWithSameKey.id} by idempotency_key ${idempotencyKey} with authoritative ${messageId}`);
          messageMap.delete(optimisticWithSameKey.id);
          itemReplaced = true;
          replacedOptimisticId = optimisticWithSameKey.id;
        }
      }
      
      // Fallback: try to match by content and timestamp if no other match
      if (!itemReplaced && !isOptimistic && newMessageData.content) {
        const matchingOptimistic = Array.from(messageMap.values()).find(item => {
          if (item.itemType !== 'message' || !item.metadata?.isOptimistic) return false;
          const msgItem = item as MessageTimelineItem;
          // Match by content and sender, within 30 seconds
          const timeDiff = Math.abs(new Date(msgItem.createdAt || 0).getTime() - new Date(createdAtString).getTime());
          return msgItem.content === newMessageData.content && 
                 msgItem.sender_entity_id === senderId &&
                 timeDiff < 30000; // 30 seconds tolerance
        });
        if (matchingOptimistic) {
          console.log(`📨 [DEBUG] ✅ Replacing optimistic message ${matchingOptimistic.id} by content match with authoritative ${messageId}`);
          messageMap.delete(matchingOptimistic.id);
          itemReplaced = true;
          replacedOptimisticId = matchingOptimistic.id;
        }
      }
      
      // If the message with this ID already exists and it's not optimistic, check whether to update
      if (messageMap.has(messageId)) {
        const existingMsg = messageMap.get(messageId) as MessageTimelineItem;
        
        // If the existing message is not optimistic but our new one is, keep the existing one
        if (!existingMsg.metadata?.isOptimistic && isOptimistic) {
          logger.debug(`[DataContext] Keeping existing authoritative message ${messageId} instead of optimistic update`, 'data_timeline');
          console.log(`📨 [DEBUG] ⚠️ Keeping existing authoritative message ${messageId}, ignoring optimistic update`);
          return prevTimeline; // No change needed
        }
        
        // If both are authoritative or both are optimistic, use the newer one based on createdAt
        if ((existingMsg.metadata?.isOptimistic === isOptimistic) && 
            (new Date(existingMsg.createdAt || 0) > new Date(createdAtString))) {
          logger.debug(`[DataContext] Keeping more recent existing message ${messageId}`, 'data_timeline');
          console.log(`📨 [DEBUG] ⚠️ Keeping more recent existing message ${messageId}`);
          return prevTimeline; // No change needed
        }
        
        // Otherwise, we're replacing the existing message with this one
        logger.debug(`[DataContext] Updating existing message ${messageId}`, 'data_timeline');
        console.log(`📨 [DEBUG] 🔄 Updating existing message ${messageId}`);
        itemReplaced = true;
      }
      
      // Construct the new/updated item
      const effectiveStatus = (newMessageData.status || 
        (isOptimistic ? 'sending' : 'sent')) as MessageTimelineItem['status'];
      
      const newItem: MessageTimelineItem = {
        id: messageId,
        interaction_id: newMessageData.interaction_id || interactionIdToAdd,
        type: 'message',
        itemType: 'message',
        createdAt: createdAtString,
        timestamp: createdAtString,
        content: newMessageData.content || '',
        sender_entity_id: senderId,
        message_type: newMessageData.message_type || APIMessageType.TEXT,
        metadata: { 
          ...newMessageData.metadata, 
          isOptimistic: isOptimistic && !itemReplaced,
          // Preserve the original optimistic ID for better tracking
          originalOptimisticId: replacedOptimisticId || newMessageData.metadata?.originalOptimisticId
        },
        status: effectiveStatus,
      };
      
      console.log(`📨 [DEBUG] Adding/updating message: id="${newItem.id}", isOptimistic=${newItem.metadata?.isOptimistic}, content="${newItem.content}"`);
      
      // Add our updated/new message to the map
      messageMap.set(messageId, newItem);
      
      // Convert back to array and sort by timestamp
      const newTimeline = Array.from(messageMap.values()).sort((a, b) => 
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
      
      // Log current optimistic messages for debugging
      const currentOptimistic = newTimeline.filter(item => item.metadata?.isOptimistic === true);
      if (currentOptimistic.length > 0) {
        console.log(`📨 [DEBUG] Current optimistic messages: ${currentOptimistic.length}`);
        currentOptimistic.forEach(item => {
          console.log(`📨 [DEBUG] - Optimistic: ${item.id}, content: "${(item as any).content}"`);
        });
      }
      
      return newTimeline;
    });

    // Only save non-optimistic or successful messages to SQLite
    if ((await messageRepository.isSQLiteAvailable()) && (!isOptimistic || newMessageData.status === 'sent')) {
      const dbRec = {
        id: messageId,
        interaction_id: newMessageData.interaction_id || interactionIdToAdd,
        sender_entity_id: senderId,
        content: newMessageData.content || '',
        message_type: String(newMessageData.message_type || APIMessageType.TEXT) as any,
        created_at: createdAtString,
        metadata: { 
          ...newMessageData.metadata, 
          isOptimistic: newMessageData.metadata?.isOptimistic && !optimisticIdFromPayload, 
          status: newMessageData.status,
        },
      };
      
      logger.debug("[DataContext] Saving to SQLite in addMsgTimeline", 'data_timeline', 
        { msgId: dbRec.id, optimistic: dbRec.metadata.isOptimistic });
      
      // Use messageRepository to save the message instead of old insertMessageDb
      messageRepository.saveMessages([{
        ...dbRec,
        itemType: 'message' as any,
        type: 'message' as any,
        timestamp: dbRec.created_at,
        createdAt: dbRec.created_at
      } as any]).catch((err: any) => 
        logger.warn('[DataContext] Failed save/update SQLite in addMsgTimeline', 'data_timeline', 
          { error: String(err), msgId: messageId })
      );
    }
  }, [user]);

  const addTransactionToTimeline = useCallback(async (interactionId: string, tx: any) => {
    console.log(`💰 [DEBUG] addTransactionToTimeline called for interaction ${interactionId}`);
    console.log(`💰 [DEBUG] Transaction data:`, {
      id: tx.id,
      amount: tx.amount,
      description: tx.description,
      created_at: tx.created_at,
      timestamp: tx.timestamp,
      status: tx.status
    });
    
    logger.debug(`Adding transaction to timeline for ${interactionId}: ${tx.id}`); 
    const createdAtDate = tx.created_at instanceof Date ? tx.created_at : new Date(tx.created_at || Date.now());
    const newTransactionItem: TransactionTimelineItem = {
      id: tx.id, type: 'transaction', itemType: 'transaction', interaction_id: interactionId, 
      createdAt: createdAtDate.toISOString(), timestamp: createdAtDate.toISOString(), 
      amount: parseFloat(tx.amount), 
      currency_code: tx.currency_code || tx.currency_id || tx.currency, // Prioritize currency_code, then currency_id, then currency
      status: tx.status || 'pending', description: tx.description,
      from_entity_id: tx.from_entity_id || tx.from_account_id, // Prefer from_entity_id for alignment logic
      to_entity_id: tx.to_entity_id || tx.to_account_id, // Prefer to_entity_id for alignment logic
      transaction_type: tx.transaction_type,
      metadata: {
        ...tx.metadata,
        entry_type: tx.entry_type // Include entry_type in metadata for filtering
      }
    };
    
    console.log(`💰 [DEBUG] Created TransactionTimelineItem:`, newTransactionItem);
    
    setInteractionTimeline(prev => {
      console.log(`💰 [DEBUG] Current timeline has ${prev.length} items before adding transaction`);
      const map = new Map<string, TimelineItem>(); 
      prev.forEach(i=>map.set(i.id,i)); 
      map.set(newTransactionItem.id,newTransactionItem); 
      const newTimeline = Array.from(map.values()).sort((a,b)=>new Date(a.createdAt||0).getTime()-new Date(b.createdAt||0).getTime());
      console.log(`💰 [DEBUG] New timeline has ${newTimeline.length} items after adding transaction`);
      
      // Log the most recent few items for debugging
      const recent = newTimeline.slice(-3);
      console.log(`💰 [DEBUG] Most recent 3 timeline items:`);
      recent.forEach((item, idx) => {
        console.log(`💰 [DEBUG]   ${idx}: type=${item.itemType}, id=${item.id}, time=${item.timestamp || item.createdAt}`);
      });
      
      return newTimeline;
    });

    // Save the transaction to SQLite if available
    if (await messageRepository.isSQLiteAvailable()) {
      // Create a properly typed transaction object for SQLite storage
      const dbRec: Transaction = {
        id: tx.id,
        interaction_id: interactionId,
        from_account_id: tx.from_account_id || tx.from_entity_id || 'unknown',
        to_account_id: tx.to_account_id || tx.to_entity_id,
        amount: parseFloat(tx.amount),
        currency_id: tx.currency_code || tx.currency_id || tx.currency,
        status: tx.status || 'pending',
        created_at: createdAtDate.toISOString(),
        transaction_type: tx.transaction_type || TransactionType.TRANSFER,
        description: tx.description,
        metadata: tx.metadata || {},
        processed_by_type: ProcessedByType.SYSTEM,
        entry_type: tx.entry_type // Include entry_type for SQLite storage
      } as any; // Cast to any since Transaction type might not have entry_type
      
      logger.debug("[DataContext] Saving transaction to SQLite", 'data_timeline', { txId: dbRec.id });
      
      // Use the TransactionRepository to save the transaction
      transactionRepository.saveTransactions([dbRec]).catch((err: any) => 
        logger.warn('[DataContext] Failed to save transaction to SQLite', 'data_timeline', 
          { error: String(err), txId: tx.id })
      );
    }
  }, []);

  // Search entities by query string using the new unified backend search
  const searchAll = useCallback(async (
    query: string, 
  ): Promise<EntitySearchResult[]> => {
    if (!query || query.trim().length < 2) {
      setEntitySearchResults([]);
      return [];
    }
    if (!isAuthenticated || isAuthLoading || !user?.entityId) {
      logger.debug("Skipping entity search: not authenticated, still loading, or no entity ID", "data");
      return [];
    }

    // Immediate loading feedback for better UX
    setIsLoadingEntitySearch(true);
    setEntitySearchResults([]); // Clear previous results immediately
    
    try {
      logger.debug(`Fast unified search with query: ${query}`, "data");
      // Pass the current user's entity ID to exclude them from results
      // Use optimized query parameters for faster response
      const response = await apiClient.get(`${API_PATHS.SEARCH.ALL}?query=${encodeURIComponent(query.trim())}&currentUserEntityId=${user.entityId}&limit=15`);
        
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        const backendResults: Array<{ id: string; name: string; type: string; avatarUrl?: string; secondaryText?: string }> = response.data.data;

        const mappedEntities: EntitySearchResult[] = backendResults.map((item) => ({
          id: item.id, 
          entity_type: item.type, 
          reference_id: item.id, 
          display_name: item.name,
          avatar_url: item.avatarUrl,
                is_active: true,
          metadata: { secondaryText: item.secondaryText }, 
        }));
            
              setEntitySearchResults(mappedEntities);
        logger.debug(`Fast unified search found ${mappedEntities.length} items for query "${query}"`, "data");
              return mappedEntities;
            } else {
        logger.debug(`Unified search response didn't contain usable data array for query "${query}"`, "data", response.data);
          setEntitySearchResults([]);
          return [];
      }
    } catch (error) {
      logger.error(`Error searching all types for query "${query}"`, error, "data");
      setEntitySearchResults([]);
      return [];
    } finally {
      setIsLoadingEntitySearch(false);
    }
  }, [isAuthenticated, isAuthLoading, user?.entityId]);

  // Get or create a direct interaction ID
  const getOrCreateDirectInteraction = useCallback(async (contactProfileId: string): Promise<string | null> => {
    if (!isAuthenticated || isAuthLoading) {
      logger.debug("Skipping interaction fetch: not authenticated or loading", "data");
      return null;
    }
    
    logger.debug(`Getting/creating direct interaction with contact: ${contactProfileId}`, "data");
    try {
      const response = await apiClient.get(API_PATHS.INTERACTION.DIRECT(contactProfileId));
      
      // Check if we got interaction data and an ID
      if (response.data?.data?.id) {
        const interactionId = response.data.data.id;
        logger.debug(`Found/Created direct interaction ID: ${interactionId}`, "data");
        return interactionId;
      } else {
        // Log unexpected response structure
        logger.warn(`Unexpected response structure from direct interaction endpoint for contact ${contactProfileId}`, "data", response.data);
        return null;
      }
    } catch (error: any) {
      // Handle 404 specifically (no interaction exists, maybe create implicitly? Backend handles this)
      if (error.response?.status === 404) {
         logger.debug(`No direct interaction found for contact ${contactProfileId}. Backend might create one on first message.`, "data");
      } else {
        logger.error(`Error fetching/creating direct interaction with ${contactProfileId}`, error, "data");
      }
      return null;
    }
  }, [isAuthenticated, isAuthLoading]);

  // Public methods for refreshing data - moved after fetchUserData declaration
  const refreshBalancesCb = useCallback(async () => {
    if (MOCK_USER_ENABLED) { /* ... */ return; }
    await fetchBalances(true);
  }, [fetchBalances]);
  
  const refreshInteractionsCb = useCallback(async () => {
    if (MOCK_USER_ENABLED) { /* ... */ return; }
    await fetchInteractions(true);
  }, [fetchInteractions]);

  const refreshRecentConversationsCb = useCallback(async () => {
    if (MOCK_USER_ENABLED) { 
      return; 
    }
    await fetchRecentConversations(true);
  }, [fetchRecentConversations]);

  const refreshUserDataCb = useCallback(async () => {
    if (MOCK_USER_ENABLED) { 
      return; 
    }
    // Simple implementation - just clear and reload basic data
    // Use safe state updates to prevent rapid changes during transition
    safeStateUpdate(() => setKycStatus(null), false);
    safeStateUpdate(() => setPersonalInfo(null), false);
    safeStateUpdate(() => setVerificationStatus(null), false);
    safeStateUpdate(() => setUserProfile(null), false);
  }, []);

  const refreshAllCb = useCallback(async () => {
    if (MOCK_USER_ENABLED) { /* ... */ return; }
    try {
      await Promise.all([
        fetchBalances(true),
        fetchInteractions(true),
        refreshRecentConversationsCb()
      ]);
      await refreshUserDataCb();
    } finally {}
  }, [fetchBalances, fetchInteractions, refreshRecentConversationsCb, refreshUserDataCb]);

  // Send a message
  const sendMessage = useCallback(async (messageData: SendMessageRequest & { recipient_id: string; idempotency_key: string, interaction_id: string }) => {
    const optimisticId = messageData.metadata?.optimisticId;
    logger.debug('[DataContext] sendMessageCb', 'data_timeline', { optimisticId: optimisticId, contentPreview: messageData.content?.substring(0,20)});
    
    if (!isAuthenticated || isAuthLoading || !user) {
      logger.warn("[DataContext] sendMessageCb: Not authenticated or loading.");
      return null;
    }

    try {
      // Use the MessageManager to send the message instead of directly calling the API
      // Since the MessageManager requires sender_entity_id but it's not in our type,
      // we'll create a new object with all the properties we need
      const messageToSend = {
        ...messageData,
        // Add any missing properties that MessageManager needs but aren't in our type
        sender_entity_id: user.entityId,
        metadata: {
          ...messageData.metadata,
          optimisticId: optimisticId || `opt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        },
      };
      
      // Cast to any to avoid type issues with the extra properties needed by MessageManager
      const result = await messageManager.sendMessage(messageToSend as any);
      
      // The MessageManager handles optimistic updates internally and emits events
      // No need to manually add message to timeline here
      
      // After successfully sending a message, refresh the interactions list to update the last message snippet
      if (result) {
        refreshInteractionsCb().catch(err => 
          logger.warn("[DataContext] Error refreshing interactions after sending message", String(err))
        );
      }
      
      return result;
    } catch (error) {
      logger.error("[DataContext] sendMessageCb: Error sending message via MessageManager", String(error), 'data_timeline');
      // MessageManager already handles failed messages and their status updates
      throw error; 
    }
  }, [isAuthenticated, isAuthLoading, user, refreshInteractionsCb]);

  const sendDirectTransaction = useCallback(async (dto: import('../types/transaction.types').CreateDirectTransactionDto) => {
    if (!isAuthenticated || isAuthLoading || !user) return null;
    try {
      // Create a properly formed transaction request with the current user's entity ID
      const transactionToSend = {
        ...dto,
        sender_entity_id: user.entityId,
        metadata: {
          ...(dto.metadata || {}),
          // TransactionManager will handle generating idempotency key if not provided
        }
      };
      
      // Use the TransactionManager to send the transaction
      const result = await transactionManager.createTransaction(transactionToSend);
      
      // No need to manually add to timeline - TransactionManager emits events that are handled in the useEffect
      
      // After successfully sending a transaction, refresh interactions and balances
      if (result) {
        refreshInteractionsCb().catch(err => 
          logger.warn("[DataContext] Error refreshing interactions after sending transaction", String(err))
        );
        
        // Also refresh balances after a short delay
        setTimeout(() => {
          refreshBalancesCb().catch(err => 
            logger.warn("[DataContext] Error refreshing balances after sending transaction", String(err))
          );
        }, 1000);
      }
      
      return result;
    } catch (e) {
      logger.error('Error sending direct transaction', e, 'data');
      // TransactionManager already handles failed transactions and their status updates
      return null;
    }
  }, [isAuthenticated, isAuthLoading, user, refreshInteractionsCb, refreshBalancesCb]);

  // 🚀 Professional Timeline Preloading with Request Deduplication and Throttling
  const [lastPreloadTime, setLastPreloadTime] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  
  const preloadRecentTimelines = useCallback(async () => {
    try {
      if (!isAuthenticated || !user?.entityId) {
        console.log('🔄 [DataContext] 🚫 Skipping timeline preload - not authenticated');
        return;
      }

      // Professional throttling to prevent duplicate preload calls
      const now = Date.now();
      const timeSinceLastPreload = now - lastPreloadTime;
      const PRELOAD_THROTTLE_MS = 10000; // 10 seconds minimum between preloads

      if (isPreloading) {
        console.log('🔄 [DataContext] ⏱️ Preload already in progress, skipping');
        return;
      }

      if (timeSinceLastPreload < PRELOAD_THROTTLE_MS) {
        console.log(`🔄 [DataContext] ⏱️ Preload throttled (${timeSinceLastPreload}ms < ${PRELOAD_THROTTLE_MS}ms)`);
        return;
      }

      setIsPreloading(true);
      setLastPreloadTime(now);
      console.log('🔄 [DataContext] 🚀 Starting proactive timeline preload...');
      
      // Get recent interactions from local cache
      const recentInteractions = await interactionRepository.getInteractions(5); // Top 5 recent
      
      console.log(`🔄 [DataContext] 📱 Found ${recentInteractions.length} recent interactions to preload`);
      
      // Preload timeline for each recent interaction
      for (const interaction of recentInteractions) {
        try {
          // Check if timeline already cached locally
          const cachedTimeline = await timelineRepository.getTimelineForInteraction(interaction.id, 20);
          
          if (cachedTimeline.length === 0) {
            console.log(`🔄 [DataContext] 📡 Preloading timeline for interaction: ${interaction.id}`);
            
            // Use the existing deduplicated fetchInteractionTimeline function for professional request management
            try {
              await fetchInteractionTimeline(interaction.id, { 
                silentUpdate: true,  // Don't show loading indicators during preload
                forceRefresh: false  // Use cache if available
              });
              console.log(`🔄 [DataContext] ✅ Timeline preload completed for: ${interaction.id}`);
            } catch (preloadError) {
              console.log(`🔄 [DataContext] ⚠️ Timeline preload failed for ${interaction.id}:`, preloadError);
            }
          } else {
            console.log(`🔄 [DataContext] ✅ Timeline already cached for: ${interaction.id} (${cachedTimeline.length} items)`);
          }
        } catch (error) {
          console.log(`🔄 [DataContext] ⚠️ Failed to preload timeline for ${interaction.id}:`, error);
          // Continue with other interactions
        }
      }
      
      console.log('🔄 [DataContext] ✅ Proactive timeline preload completed');
    } catch (error) {
      console.log('🔄 [DataContext] ❌ Timeline preload failed:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [isAuthenticated, user?.entityId, fetchInteractionTimeline, lastPreloadTime, isPreloading]);

  // Helper function to update interaction preview from timeline (can be called from anywhere)
  const updateInteractionPreviewFromTimelineHelper = useCallback(async (interactionId: string) => {
    try {
      console.log(`🔍 [DEBUG] Starting updateInteractionPreviewFromTimelineHelper for interaction: ${interactionId}`);
      
      // Check both in-memory timeline state AND database for the most recent item
      let lastTimelineItem: TimelineItem | null = null;
      
      // First, check the current in-memory timeline for this interaction
      // Apply user perspective filtering to in-memory items as well
      const currentUserEntityId = user?.entityId;
      const memoryTimelineItems = interactionTimelineRef.current.filter(item => {
        if ((item as any).interaction_id !== interactionId || item.type === 'date') {
          return false;
        }
        
        // Apply user perspective filtering for transactions in memory
        if (item.itemType === 'transaction' && currentUserEntityId) {
          const txItem = item as TransactionTimelineItem;
          const metadata = txItem.metadata || {};
          const entryType = metadata.entry_type;
          
          // For double-entry transactions, show both CREDIT and DEBIT entries:
          // - CREDIT entries represent outgoing transactions (sender's view)
          // - DEBIT entries represent incoming transactions (receiver's view)
          // Both are relevant for interaction previews
          if (!entryType || entryType === '') {
            return true; // Show all if no entry_type (backward compatibility)
          }
          return entryType === 'CREDIT' || entryType === 'DEBIT'; // Show both entry types for previews
        }
        
        return true; // Show all messages and other timeline items
      });
      
      console.log(`🔍 [DEBUG] Found ${memoryTimelineItems.length} items in memory for interaction ${interactionId} (after user filtering)`);
      if (memoryTimelineItems.length > 0) {
        memoryTimelineItems.forEach((item, index) => {
          console.log(`🔍 [DEBUG] Memory item ${index}: type=${item.itemType}, id=${item.id}, time=${item.timestamp || item.createdAt}`);
          if (item.itemType === 'transaction') {
            const txItem = item as TransactionTimelineItem;
            console.log(`🔍 [DEBUG] Transaction details: amount=${txItem.amount}, description=${txItem.description}, entryType=${txItem.metadata?.entry_type}`);
          } else if (item.itemType === 'message') {
            const msgItem = item as MessageTimelineItem;
            console.log(`🔍 [DEBUG] Message details: content="${msgItem.content}"`);
          }
        });
      }
      
      // Get the most recent item from memory
      const mostRecentFromMemory = memoryTimelineItems.length > 0 
        ? memoryTimelineItems.sort((a, b) => 
            new Date(b.timestamp || b.createdAt || 0).getTime() - 
            new Date(a.timestamp || a.createdAt || 0).getTime()
          )[0]
        : null;
      
      if (mostRecentFromMemory) {
        console.log(`🔍 [DEBUG] Most recent from memory: type=${mostRecentFromMemory.itemType}, id=${mostRecentFromMemory.id}, time=${mostRecentFromMemory.timestamp || mostRecentFromMemory.createdAt}`);
      } else {
        console.log(`🔍 [DEBUG] No recent item found in memory`);
      }
      
      // Also check the database with user perspective filtering
      console.log(`🔍 [DEBUG] Checking database for interaction ${interactionId} with user filtering for: ${currentUserEntityId || 'none'}...`);
      const mostRecentFromDatabase = await timelineRepository.getLastTimelineItemForInteraction(interactionId, currentUserEntityId);
      
      if (mostRecentFromDatabase) {
        console.log(`🔍 [DEBUG] Most recent from DB: type=${mostRecentFromDatabase.itemType}, id=${mostRecentFromDatabase.id}, time=${mostRecentFromDatabase.timestamp || mostRecentFromDatabase.createdAt}`);
        if (mostRecentFromDatabase.itemType === 'transaction') {
          const txItem = mostRecentFromDatabase as TransactionTimelineItem;
          console.log(`🔍 [DEBUG] DB Transaction details: amount=${txItem.amount}, description=${txItem.description}, entryType=${txItem.metadata?.entry_type}`);
        } else if (mostRecentFromDatabase.itemType === 'message') {
          const msgItem = mostRecentFromDatabase as MessageTimelineItem;
          console.log(`🔍 [DEBUG] DB Message details: content="${msgItem.content}"`);
        }
      } else {
        console.log(`🔍 [DEBUG] No recent item found in database`);
      }
      
      // Compare timestamps and use the most recent
      if (mostRecentFromMemory && mostRecentFromDatabase) {
        const memoryTime = new Date(mostRecentFromMemory.timestamp || mostRecentFromMemory.createdAt || 0).getTime();
        const dbTime = new Date(mostRecentFromDatabase.timestamp || mostRecentFromDatabase.createdAt || 0).getTime();
        lastTimelineItem = memoryTime > dbTime ? mostRecentFromMemory : mostRecentFromDatabase;
        console.log(`🔍 [DEBUG] Using most recent item from ${memoryTime > dbTime ? 'MEMORY' : 'DATABASE'}`);
        console.log(`🔍 [DEBUG] Memory time: ${new Date(memoryTime).toISOString()}, DB time: ${new Date(dbTime).toISOString()}`);
      } else if (mostRecentFromMemory) {
        lastTimelineItem = mostRecentFromMemory;
        console.log(`🔍 [DEBUG] Using item from MEMORY only`);
      } else if (mostRecentFromDatabase) {
        lastTimelineItem = mostRecentFromDatabase;
        console.log(`🔍 [DEBUG] Using item from DATABASE only`);
      }
      
      if (!lastTimelineItem) {
        console.log(`🔍 [DEBUG] ❌ NO timeline items found for interaction ${interactionId}`);
        return;
      }

      console.log(`🔍 [DEBUG] Selected last timeline item: type=${lastTimelineItem.itemType}, id=${lastTimelineItem.id}`);

      let snippet: string;
      let senderId: string;
      let timestamp: string;

      if (lastTimelineItem.itemType === 'message') {
        // Handle message timeline items
        const messageItem = lastTimelineItem as MessageTimelineItem;
        snippet = messageItem.content || 'New message';
        senderId = messageItem.sender_entity_id;
        timestamp = messageItem.createdAt || messageItem.timestamp || new Date().toISOString();
        console.log(`🔍 [DEBUG] 📧 MESSAGE preview: "${snippet}"`);
      } else if (lastTimelineItem.itemType === 'transaction') {
        // Handle transaction timeline items
        const transactionItem = lastTimelineItem as TransactionTimelineItem;
        snippet = `💰 $${transactionItem.amount || '0'} ${transactionItem.description || 'transaction'}`.trim();
        senderId = transactionItem.from_entity_id || user?.entityId || 'unknown';
        timestamp = transactionItem.createdAt || transactionItem.timestamp || new Date().toISOString();
        console.log(`🔍 [DEBUG] 💰 TRANSACTION preview: "${snippet}"`);
      } else {
        console.log(`🔍 [DEBUG] ❌ Unknown timeline item type: ${lastTimelineItem.itemType}`);
        return;
      }

      console.log(`🔍 [DEBUG] Final preview data: snippet="${snippet}", senderId="${senderId}", timestamp="${timestamp}"`);

      // Update the interactions list with the correct preview
      console.log(`🔍 [DEBUG] Updating interactions list...`);
      setInteractionsList((prevList) => {
        console.log(`🔍 [DEBUG] Current interactions list has ${prevList.length} items`);
        const interactionIndex = prevList.findIndex((it) => it.id === interactionId);
        
        if (interactionIndex === -1) {
          console.log(`🔍 [DEBUG] ❌ Interaction ${interactionId} NOT FOUND in list`);
          prevList.forEach((item, idx) => {
            console.log(`🔍 [DEBUG] List item ${idx}: id=${item.id}, snippet="${item.last_message_snippet}"`);
          });
          return prevList;
        }

        console.log(`🔍 [DEBUG] ✅ Found interaction at index ${interactionIndex}, updating preview`);
        const updatedList = [...prevList];
        updatedList[interactionIndex] = {
          ...updatedList[interactionIndex],
          last_message_snippet: snippet,
          last_message_sender_id: senderId,
          last_message_at: timestamp,
          updated_at: timestamp
        };
        
        console.log(`🔍 [DEBUG] ✅ Updated interaction preview: "${snippet}"`);
        return updatedList;
      });

    } catch (error) {
      console.log(`🔍 [DEBUG] ❌ Error updating interaction preview: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [user]);

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
              // Background sync without blocking UI
              fetchBalances(false).catch((err: any) => logger.warn('[DataContext] Background balance sync failed:', err));
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
  }, [isAuthenticated, user, fetchBalances]);





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
    isLoadingUserData,
    isInitialLoadComplete,
    
    // Professional loading state
    loadingState,
    
    // Data loading completion tracking
    hasLoadedInteractions,
    hasLoadedBalances,
    hasLoadedUserData,
    hasLoadedRecentConversations,

    // Actions
    refreshBalances: refreshBalancesCb,
    refreshInteractions: refreshInteractionsCb,
    refreshRecentConversations: refreshRecentConversationsCb,
    refreshUserData: refreshUserDataCb,
    refreshAll: refreshAllCb,
    searchAll: searchAll,
    getOrCreateDirectInteraction: getOrCreateDirectInteraction,
    sendMessage,
    sendDirectTransaction,
    fetchInteractionTimeline,
    addMessageToTimeline: addMessageToTimeline,
    addTransactionToTimeline: addTransactionToTimeline,
    updateInteractionPreviewFromTimeline: updateInteractionPreviewFromTimelineHelper,
    clearAllTimelineState: clearAllTimelineState,
    clearRefreshThrottling,
    
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