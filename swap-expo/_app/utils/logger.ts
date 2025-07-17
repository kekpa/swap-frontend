/**
 * Created: Added unified logger utility for consistent logging across the app - 2025-03-06
 *
 * This file provides a centralized logging utility with support for different log levels
 * and contextual information. It automatically handles environment-specific behavior
 * (development vs production) and provides a clean API for logging.
 */

export enum LogLevel {
  ERROR = 0, // Always log errors
  WARN = 1, // Important warnings
  INFO = 2, // Significant events
  DEBUG = 3, // Detailed debugging information
  TRACE = 4, // Very verbose tracing information
}

// Default to INFO in dev, WARN in prod
const DEFAULT_LEVEL = __DEV__ ? LogLevel.DEBUG : LogLevel.WARN;

// Current log level - can be changed at runtime
let currentLogLevel = DEFAULT_LEVEL;

// Optional category filtering
const enabledCategories: Record<string, boolean> = {
  api: true, // API requests/responses
  auth: true, // Authentication operations
  data: true, // Data loading/caching
  navigation: true, // Navigation events
  performance: true, // Performance measurements
};

/**
 * Set the global log level
 */
export const setLogLevel = (level: LogLevel) => {
  currentLogLevel = level;
};

/**
 * Enable or disable a specific logging category
 */
export const setLogCategory = (category: string, enabled: boolean) => {
  enabledCategories[category] = enabled;
};

/**
 * Format a log message with optional category and metadata
 */
const formatMessage = (
  level: string,
  message: string,
  category?: string,
  metadata?: Record<string, any>
): string => {
  const categoryStr = category ? `[${category}] ` : "";
  const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : "";
  return `[${level}] ${categoryStr}${message}${metadataStr}`;
};

/**
 * Check if logging is enabled for the given level and category
 */
const shouldLog = (level: LogLevel, category?: string): boolean => {
  if (level > currentLogLevel) return false;
  if (category && enabledCategories[category] === false) return false;
  return true;
};

/**
 * The logger object with methods for each log level
 */
export const logger = {
  /**
   * Log an error (always logged)
   */
  error: (
    message: string,
    error?: any,
    category?: string,
    metadata?: Record<string, any>
  ) => {
    if (shouldLog(LogLevel.ERROR, category)) {
      if (error) {
        const errorInfo = error.stack || error.message || JSON.stringify(error);
        console.error(
          formatMessage("ERROR", message, category, metadata),
          errorInfo
        );
      } else {
        console.error(formatMessage("ERROR", message, category, metadata));
      }
    }
  },

  /**
   * Log a warning
   */
  warn: (
    message: string,
    category?: string,
    metadata?: Record<string, any>
  ) => {
    if (shouldLog(LogLevel.WARN, category)) {
      console.warn(formatMessage("WARN", message, category, metadata));
    }
  },

  /**
   * Log informational message
   */
  info: (
    message: string,
    category?: string,
    metadata?: Record<string, any>
  ) => {
    if (shouldLog(LogLevel.INFO, category)) {
      console.log(formatMessage("INFO", message, category, metadata));
    }
  },

  /**
   * Log debug message (development only by default)
   */
  debug: (
    message: string,
    category?: string,
    metadata?: Record<string, any>
  ) => {
    if (shouldLog(LogLevel.DEBUG, category)) {
      console.log(formatMessage("DEBUG", message, category, metadata));
    }
  },

  /**
   * Log trace message (very verbose, development only)
   */
  trace: (
    message: string,
    category?: string,
    metadata?: Record<string, any>
  ) => {
    if (shouldLog(LogLevel.TRACE, category)) {
      console.log(formatMessage("TRACE", message, category, metadata));
    }
  },
};

// Export default for convenience
export default logger;
