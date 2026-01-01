/**
 * API Paths Module
 * 
 * This module defines all API endpoints used in the application.
 * - DO NOT include 'api/' or '/api/' at the beginning of paths
 * - DO NOT include 'v1/' or '/v1/' at the beginning of paths
 * - The apiClient already adds the base URL with '/api/v1/' automatically
 * - All paths in this file should start directly with the resource name
 * 
 * CORRECT:   '/auth/login'
 * INCORRECT: '/api/auth/login' or '/api/v1/auth/login'
 */

/**
 * Authentication endpoints
 */
export const AUTH_PATHS = {
  LOGIN: '/auth/login',
  PIN_LOGIN: '/auth/pin-login',
  BUSINESS_LOGIN: '/auth/business/login',
  BUSINESS_REGISTER: '/auth/business/register',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  PROFILE: '/auth/profile',
  ME: '/auth/me',
  VERIFY: '/auth/verify-token',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  PHONE_SIGNIN: '/auth/phone-signin',
  VERIFY_PHONE: '/auth/verify-phone',
  REGISTER_PHONE: '/auth/register-phone',
  CHECK_PHONE: '/auth/check-phone',
  CHECK_USERNAME: '/auth/check-username',
  COMPLETE_PROFILE: '/auth/complete-profile',
  COMPLETE_BUSINESS_PROFILE: '/auth/complete-business-profile',
  STORE_PASSCODE: '/auth/store-passcode',
  // Email verification disabled for Haiti market - keeping for future use
  // VERIFY_EMAIL: '/auth/verify-email',
  // RESEND_EMAIL_CODE: '/auth/resend-email-code',
  VERIFY_RESET_CODE: '/auth/verify-reset-code',
  // Multi-account management (Instagram-style)
  AVAILABLE_PROFILES: '/auth/available-profiles',
  SWITCH_PROFILE: '/auth/switch-profile',
  // Generic PIN check for any profile type (personal or business)
  CHECK_PROFILE_PIN: (profileId: string) => `/auth/profiles/${profileId}/check-pin`,
  // Session management (Active Devices)
  SESSIONS: '/auth/sessions',
  SESSION_REVOKE: (sessionId: string) => `/auth/sessions/${sessionId}`,
  SESSIONS_REVOKE_ALL: '/auth/sessions',
  // Biometric authentication (secure device-based login)
  BIOMETRIC_ENABLE: '/auth/biometric/enable',
  BIOMETRIC_LOGIN: '/auth/biometric/login',
  BIOMETRIC_DISABLE: '/auth/biometric',
  BIOMETRIC_STATUS: '/auth/biometric/status',
  BIOMETRIC_DEVICES: '/auth/biometric/devices',
};

/**
 * User management endpoints
 */
export const USER_PATHS = {
  PROFILE: (id: string) => `/profiles/${id}`,
  SEARCH: '/users/search',
  DISCOVER: '/users/discover',
  PREFERENCES: '/users/preferences',
};

/**
 * KYC (Know Your Customer) endpoints
 * Professional RESTful design following Fortune 500 standards
 */
export const KYC_PATHS = {
  STATUS: '/kyc/verification-status',
  REQUIREMENTS: '/kyc/verification-requirements',

  // Clean RESTful Document Management Endpoints
  DOCUMENTS: '/kyc/documents',                              // POST - Upload documents, GET - List documents
  DOCUMENT_DETAILS: (documentId: string) => `/kyc/documents/${documentId}`,  // GET - Get specific document
  DOCUMENT_UPDATE: (documentId: string) => `/kyc/documents/${documentId}`,   // PUT - Update/replace document

  // Clean RESTful Selfie Endpoints
  SELFIE: '/kyc/selfie',                                    // POST - Upload selfie, GET - Get selfie

  // Other KYC endpoints with hyphen convention
  VERIFY_PHONE: '/kyc/phone-verify',
  // VERIFY_EMAIL: '/kyc/email-verify', // Email verification disabled for Haiti market
  // BIOMETRIC_SETUP: removed - biometric is local-only, not tracked in backend
  REQUEST_PHONE_CHANGE: '/kyc/phone-request-change',
  ADMIN: {
    PENDING: '/kyc/admin/pending',
    DOCUMENT: (id: string) => `/kyc/admin/documents/${id}`,
    REVIEW: (id: string) => `/kyc/admin/documents/${id}/review`,
  },
};

/**
 * Reference data endpoints
 */
export const REFERENCE_DATA_PATHS = {
  COUNTRIES: '/countries',
  CURRENCIES: '/currencies',
};

/**
 * Account management endpoints
 */
export const ACCOUNT_PATHS = {
  LIST: '/accounts',
  BALANCES: '/accounts/balances',
  DETAILS: (id: string) => `/accounts/${id}`,
  UPDATE: (id: string) => `/accounts/${id}`,
  SET_PRIMARY: (id: string) => `/accounts/${id}`,
  BALANCE: (id: string) => `/accounts/${id}/balance`,
  STATEMENT: (id: string) => `/accounts/${id}/statement`,
  BY_ENTITY: (entityId: string | null | undefined) => 
    entityId ? `/accounts/entity/${entityId}` : '/accounts',
};

/**
 * Transaction endpoints
 */
export const TRANSACTION_PATHS = {
  LIST: '/transactions',
  DETAILS: (id: string) => `/transactions/${id}`,
  CREATE: '/transactions',
  INTERACTION: (interactionId: string) => `/transactions/interaction/${interactionId}`,
  ACCOUNTS: '/transactions/accounts',
  ACCOUNT_DETAILS: (id: string) => `/transactions/accounts/${id}`,
  CURRENCIES: '/transactions/currencies',
  CURRENCY_DETAILS: (id: string) => `/transactions/currencies/${id}`,
  REQUESTS: '/transactions/requests',
  REQUEST_DETAILS: (id: string) => `/transactions/requests/${id}`,
  TOTAL_SENT: (fromEntityId: string, toEntityId: string) => `/transactions/total-sent/${fromEntityId}/${toEntityId}`,
  DIRECT: '/transactions/direct',
};

/**
 * Wallet endpoints (NEW - replaces account balance endpoints)
 */
export const WALLET_PATHS = {
  // Get wallets by account (replaces account balances)
  BY_ACCOUNT: (accountId: string) => `/wallets/account/${accountId}`,
  
  // Get wallets by entity (user/business)
  BY_ENTITY: (entityId: string) => `/wallets/entity/${entityId}`,
  
  // Individual wallet operations
  DETAILS: (walletId: string) => `/wallets/${walletId}`,
  CREDIT: (walletId: string) => `/wallets/${walletId}/credit`,
  DEBIT: (walletId: string) => `/wallets/${walletId}/debit`,
  
  // Get or create wallet for specific account and currency
  GET_OR_CREATE: (accountId: string, currencyId: string) => `/wallets/account/${accountId}/currency/${currencyId}`,
};

/**
 * Interaction endpoints
 */
export const INTERACTION_PATHS = {
  LIST: '/interactions',
  RECENT: '/interactions/recent',
  ARCHIVED: '/interactions/archived',
  DETAILS: (id: string) => `/interactions/${id}`,
  DELETE: (id: string) => `/interactions/${id}`,
  UNARCHIVE: (id: string) => `/interactions/${id}/unarchive`,
  CREATE: '/interactions',
  DIRECT: (profileId: string) => `/interactions/direct/${profileId}`,
  MESSAGES: (interactionId: string) => `/interactions/${interactionId}/messages`,
  TIMELINE: (interactionId: string) => `/interactions/${interactionId}/timeline`,
};

/**
 * Business endpoints
 */
export const BUSINESS_PATHS = {
  PROFILES: '/business/profiles',
  PROFILE_DETAILS: (id: string) => `/business/profiles/${id}`,
  LOCATIONS: '/business/locations',
  LOCATION_DETAILS: (id: string) => `/business/locations/${id}`,
  TEAM: '/business/team',
  TEAM_MEMBER: (id: string) => `/business/team/${id}`,
  OFFERS: '/business/offers',
  OFFER_DETAILS: (id: string) => `/business/offers/${id}`,
  // Business access PIN endpoints
  CHECK_PIN: (businessId: string) => `/businesses/${businessId}/check-pin`,
  SET_PIN: (businessId: string) => `/businesses/${businessId}/set-pin`,
  REMOVE_PIN: (businessId: string) => `/businesses/${businessId}/pin`,
};

/**
 * Notification endpoints
 */
export const NOTIFICATION_PATHS = {
  LIST: '/notifications',
  DETAILS: (id: string) => `/notifications/${id}`,
  PREFERENCES: '/notifications/preferences',
  DEVICES: '/notifications/devices',
};

/**
 * Entity endpoints
 */
export const ENTITY_PATHS = {
  LIST: '/entities',
  GET: (id: string) => `/entities/${id}`,
  BY_REFERENCE: (type: 'profile' | 'business' | 'system', id: string) => `/entities/reference/${type}/${id}`,
  RESOLVE: (id: string) => `/entities/resolve/${id}`,
  SEARCH: '/entities/search',
  UPDATE: (id: string) => `/entities/${id}`,
};

/**
 * Message endpoints
 */
export const MESSAGE_PATHS = {
  CREATE: '/messages/direct',
  LIST_FOR_INTERACTION: (interactionId: string) => `/interactions/${interactionId}/messages`,
};

/**
 * Unified Search endpoints
 */
export const SEARCH_PATHS = {
  ALL: '/search', // GET /api/v1/search?query=...
};

/**
 * Rosca (Sol) endpoints - Pool-based savings system
 */
export const ROSCA_PATHS = {
  // Pools
  POOLS: '/rosca/pools',
  POOL_DETAILS: (poolId: string) => `/rosca/pools/${poolId}`,

  // Enrollments
  ENROLLMENTS: '/rosca/enrollments',
  ENROLLMENT_DETAILS: (enrollmentId: string) => `/rosca/enrollments/${enrollmentId}`,

  // Payments
  PAYMENTS: '/rosca/payments',
  ENROLLMENT_PAYMENTS: (enrollmentId: string) => `/rosca/enrollments/${enrollmentId}/payments`,

  // Friends in pool
  ENROLLMENT_FRIENDS: (enrollmentId: string) => `/rosca/enrollments/${enrollmentId}/friends`,
};

/**
 * Combined export of all API paths
 */
export const API_PATHS = {
  AUTH: AUTH_PATHS,
  USER: USER_PATHS,
  KYC: KYC_PATHS,
  REFERENCE_DATA: REFERENCE_DATA_PATHS,
  ACCOUNT: ACCOUNT_PATHS,
  WALLET: WALLET_PATHS,
  TRANSACTION: TRANSACTION_PATHS,
  INTERACTION: INTERACTION_PATHS,
  MESSAGE: MESSAGE_PATHS,
  BUSINESS: BUSINESS_PATHS,
  NOTIFICATION: NOTIFICATION_PATHS,
  ENTITIES: ENTITY_PATHS,
  SEARCH: SEARCH_PATHS,
  ROSCA: ROSCA_PATHS,
};

export default API_PATHS; 