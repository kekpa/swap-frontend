// ErrorUtils.ts - Utility for handling errors in React Native
import logger from './logger';

/**
 * A simple wrapper around the React Native global ErrorUtils
 * to provide a more consistent error handling interface.
 */

// Define the type for the React Native ErrorUtils
interface RNErrorUtils {
  setGlobalHandler: (callback: (error: Error, isFatal?: boolean) => void) => void;
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
}

// Default handler just logs to console
const defaultHandler = (error: Error, isFatal?: boolean) => {
  logger.error("Unhandled error", error, "app");

  // Log additional details for debugging
  if (isFatal) {
    logger.error("This is a fatal error that could crash the app", null, "app");
  }

  // In development, we want to see the full stack trace
  if (__DEV__) {
    logger.error("Error stack", error, "app", { stack: error.stack });
  }
};

// Store the current global handler
let currentHandler = defaultHandler;

// Access the global ErrorUtils from React Native, with proper type casting
const nativeErrorUtils = (global as any).ErrorUtils as RNErrorUtils || {
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => {
    currentHandler = handler;
  },
  getGlobalHandler: () => currentHandler,
};

// Our custom wrapper
const ErrorUtils = {
  /**
   * Set a global error handler for unhandled JavaScript errors
   * @param handler The error handler function
   * @returns The previous handler
   */
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void): (() => void) => {
    const previousHandler = nativeErrorUtils.getGlobalHandler();
    nativeErrorUtils.setGlobalHandler(handler);
    
    // Return a function to restore the previous handler (for cleanup)
    return () => {
      nativeErrorUtils.setGlobalHandler(previousHandler);
    };
  },
  
  /**
   * Get the current global error handler
   */
  getGlobalHandler: () => nativeErrorUtils.getGlobalHandler(),
  
  /**
   * The default error handler
   */
  _defaultHandler: defaultHandler,
};

export default ErrorUtils; 