// Local-First Banking Schema Exports - Optimized for Performance & Compliance
// Updated: 2025-12-22 - Added unified local_timeline for WhatsApp-grade local-first architecture

// ✅ ESSENTIAL SCHEMAS - Core local-first experience

// 1. Interactions (conversation metadata)
export { initializeInteractionSchema } from './interaction-schema';

// 2. Unified Local Timeline (WhatsApp-grade local-first)
// NOTE: Replaces old message-schema and timeline-schema (VIEW)
export { initializeLocalTimelineSchema } from './local-timeline-schema';
export type {
  LocalTimelineItem,
  SyncStatus,
  MessageLocalStatus,
  TransactionLocalStatus
} from './local-timeline-schema';
export { isProcessingStatus, isTerminalStatus } from './local-timeline-schema';

// 2. User Data & Relationships (Profile & contacts)
export { initializeUserSchema } from './user-schema';
export { initializeUserContactsSchema } from './user-contacts-schema';

// 3. Transaction History (Read-only cache)
export { initializeTransactionSchema } from './transaction-schema';
export { initializeCurrencyWalletsSchema } from './currency-wallets-schema';

// 4. Reference Data (Performance cache)
export { initializeCurrencySchema } from './currency-schema';

// 5. UX Enhancement (Notifications & search)
export { initializeNotificationsSchema } from './notifications-schema';
export { initializeSearchHistorySchema } from './search-history-schema';
export { initializeLocationSchema } from './location-schema';

// Note: Removed schemas for banking compliance & performance:
// - P2P requests (must be online)
// - Accounts (must be online) 
// - Business profiles (unnecessary complexity)
// - Entity schemas (frontend never queries locally, only uses entity_id as foreign key)
// - Exchange rates (banking requires real-time rates, not cached rates)
// - External reference data (account-types, addresses, banks, countries, contact-matches, phone-registry)
// These are handled by API calls for real-time data and banking compliance. 