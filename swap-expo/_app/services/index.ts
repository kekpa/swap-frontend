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

// Message management
export { messageManager } from './MessageManager';

// Transaction management
export { transactionManager } from './TransactionManager';

// Timeline management
export { TimelineManager } from './TimelineManager';

// Map services
export * from './MapApiService';
export * from './gridService';
export * from './locationService';