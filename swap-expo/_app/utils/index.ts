/**
 * Utils Barrel Exports
 * 
 * Centralized exports for utility functions to enable cleaner imports.
 * Instead of: import logger from '../../../utils/logger'
 * Use: import { logger } from '@/utils'
 */

// Logging utilities
export { default as logger, LogLevel, setLogLevel, setLogCategory } from './logger';

// Error handling utilities
export * from './errorHandler';

// Token storage is now in services/token module
// import { tokenManager, saveAccessToken, getAccessToken, etc. } from '../services/token';

// Cache utilities
export { default as cacheService } from './cacheService';

// Avatar utilities  
export * from './avatarUtils';

// Event emitter utilities
export * from './eventEmitter';

// Auth manager utilities
export * from './authManager';

// Local storage polyfill
export * from './localStoragePolyfill';

// Pin user storage
export * from './pinUserStorage';

// Refresh manager
export * from './refreshManager';

// Default export for logger (most common usage)
export { default } from './logger';