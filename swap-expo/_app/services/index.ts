/**
 * Services Barrel Exports
 *
 * Centralized exports for service modules to enable cleaner imports.
 * Instead of: import { contactsService } from '../../../services/ContactsService'
 * Use: import { contactsService } from '@/services'
 */

// App lifecycle management
export { default as appLifecycleManager } from './AppLifecycleManager';

// Network services
export { networkService } from './NetworkService';

// WebSocket services
export { default as webSocketHandler } from './WebSocketHandler';
export { websocketService } from './websocketService';

// Contact services
export { contactsService } from './ContactsService';

// LOCAL-FIRST: Unified timeline services
export { unifiedTimelineService } from './UnifiedTimelineService';
export { backgroundSyncService } from './BackgroundSyncService';
export { timelineSyncService } from './TimelineSyncService';

// Wallet services
export { walletManager } from './WalletManager';

// Timeline cache (in-memory per interaction)
export { getInteractionTimelineCache } from './InteractionTimelineCache';
// @deprecated Use getInteractionTimelineCache instead - will be removed in future version
export { getTimelineManager } from './InteractionTimelineCache';

// Interactions management
export { getInteractionsManager } from './InteractionsManager';

// Profile management
export { profileContextManager } from './ProfileContextManager';
export { profileSwitchOrchestrator } from './ProfileSwitchOrchestrator';
export { userStateManager } from './UserStateManager';
export { default as accountSwitchAuditLogger } from './AccountSwitchAuditLogger';

// Account management
export { default as accountsManager } from './AccountsManager';

// Security services
export { appLockService } from './AppLockService';

// KYC services
export { KycService } from './KycService';
export { kycOfflineQueue } from './KycOfflineQueue';

// Transaction services
export { transactionPollingManager } from './TransactionPollingManager';
export { deliveryConfirmationManager } from './DeliveryConfirmationManager';

// Notification services
export { smartNotificationHandler } from './SmartNotificationHandler';
export { pushNotificationService } from './PushNotificationService';

// Map services
export * from './MapApiService';
export * from './gridService';
export * from './locationService';