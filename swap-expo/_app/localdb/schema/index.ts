// Local-First Banking Schema Exports - Optimized for Performance & Compliance
// Updated: 2025-01-10 - Removed unnecessary schemas, kept essential ones

// ✅ ESSENTIAL SCHEMAS - Core local-first experience

// 1. Messages & Interactions (WhatsApp-like experience)
export { initializeInteractionSchema } from './interaction-schema';
export { initializeMessageSchema } from './message-schema';
export { initializeTimelineSchema } from './timeline-schema';

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