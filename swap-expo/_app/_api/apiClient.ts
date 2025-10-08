import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  getAccessToken,
  saveAccessToken,
  saveRefreshToken,
  getRefreshToken,
  clearTokens,
  refreshAccessToken,
} from "../utils/tokenStorage";
import { IS_DEVELOPMENT } from "../config/env"; // Assuming env is moved here
import logger from "../utils/logger";
import cacheService, { DEFAULT_CACHE_TTL } from "../utils/cacheService";
import Constants from "expo-constants";
import { 
  CacheConfig, 
  QueuedRequest, 
  AUTH_EVENTS, 
  EventEmitter,
  CachedEntry
} from "../types/api.types";
import { jwtDecode } from "jwt-decode";


// Define the interface for the call history
interface ApiCallInfo {
  url: string | undefined;
  method: string | undefined;
  timestamp: string;
}

// Extend the global namespace to include our apiCallHistory
declare global {
  var apiCallHistory: ApiCallInfo[];
}

// Simple custom event emitter implementation for React Native
class SimpleEventEmitter implements EventEmitter {
  private listeners: Record<string, Function[]> = {};

  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (cb) => cb !== callback
    );
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => {
      try {
        callback(...args);
      } catch (error) {
        logger.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

// Create a global event emitter for auth events
export const authEvents = new SimpleEventEmitter();

// Extend AxiosResponse to include our cached property
declare module "axios" {
  interface AxiosResponse {
    cached?: boolean;
  }
}

// Track if we're currently refreshing the token
let isRefreshingToken = false;
// Queue of requests to retry after token refresh
let failedRequestsQueue: QueuedRequest[] = [];

// Track rate-limited endpoints to avoid hammering them
const rateLimitedEndpoints = new Map<string, number>();

// Cache configuration
const CACHE_CONFIG: CacheConfig = {
  cacheable: {
    // User data
    "/auth/me": DEFAULT_CACHE_TTL.PROFILE, // 1 hour
    "/auth/verify-token": DEFAULT_CACHE_TTL.DEFAULT, // 5 minutes

    // Financial data
    "/accounts/:id/balance": DEFAULT_CACHE_TTL.BALANCES, // 15 minutes
    "/transactions": DEFAULT_CACHE_TTL.TRANSACTIONS, // 30 minutes

    // App configuration
    "/app/config": DEFAULT_CACHE_TTL.APP_CONFIG, // 24 hours
  },
  defaultTTL: DEFAULT_CACHE_TTL.DEFAULT, // 5 minutes
};

// Helper to generate a cache key from request config
const getCacheKey = (config: AxiosRequestConfig): string => {
  const { url, method, params } = config;
  return `api:${method || "GET"}-${url}-${JSON.stringify(params || {})}`;
};

// Helper to check if a request is cacheable
const isCacheable = (config: AxiosRequestConfig): boolean => {
  if (config.method && config.method.toLowerCase() !== "get") {
    return false;
  }

  const url = config.url || "";
  return Object.keys(CACHE_CONFIG.cacheable).some((endpoint) =>
    url.includes(endpoint.replace(":id", "[^/]+"))
  );
};

// Helper to get the TTL for a URL
const getCacheTTL = (url: string): number => {
  const matchingEndpoint = Object.keys(CACHE_CONFIG.cacheable).find(
    (endpoint) => url.includes(endpoint.replace(":id", "[^/]+"))
  );
  
  if (matchingEndpoint) {
    return CACHE_CONFIG.cacheable[matchingEndpoint];
  }
  
  return CACHE_CONFIG.defaultTTL;
};


// Base URL construction
const baseURL = Constants.expoConfig?.extra?.EXPO_PUBLIC_NEST_API_URL || 'http://localhost:3000';

// Create API client instance
const apiClient = axios.create({
  baseURL: baseURL + '/api/v1',
  timeout: 50000,
  headers: {
    "Content-Type": "application/json",
  },
});


// Add an advice function to help developers avoid the api prefix issue
const logApiWarning = () => {
  if (IS_DEVELOPMENT) {
    console.warn(
      `
⚠️ API USAGE WARNING ⚠️
Do not include '/api/' in your endpoint paths when using apiClient.
The client already includes '/api/v1' in the baseURL.

INCORRECT: apiClient.get('/api/users/profile')
CORRECT:   apiClient.get('/users/profile')
      `
    );
  }
};

// Log the warning once on application startup
logApiWarning();



// Add a request interceptor for URL debugging
apiClient.interceptors.request.use(
  async (config) => {
    // Before sending request, check if there's a double /api/v1 prefix in the URL
    if (config.url) {
      // Remove any leading /api/v1 from the URL if it exists
      if (config.url.startsWith('/api/v1')) {
        config.url = config.url.substring(7); // Remove '/api/v1'
        logger.debug(`Fixed API URL by removing duplicate prefix: ${config.url}`, "api");
      } else if (config.url.startsWith('api/v1')) {
        config.url = config.url.substring(6); // Remove 'api/v1'
        logger.debug(`Fixed API URL by removing duplicate prefix: ${config.url}`, "api");
      }
      
    }
    
    // Track API call frequency for debugging refresh cycles
    const timestamp = new Date().toISOString();
    const callInfo: ApiCallInfo = { url: config.url, method: config.method, timestamp };
    
    // Keep a log of recent API calls to help diagnose excessive refreshing
    if (!global.apiCallHistory) {
      global.apiCallHistory = [];
    }
    
    global.apiCallHistory.push(callInfo);
    // Keep only the last 20 calls in memory
    if (global.apiCallHistory.length > 20) {
      global.apiCallHistory.shift();
    }
    
    // If we see multiple calls to the same endpoint within a short time, log a warning
    const recentCalls = global.apiCallHistory.filter(
      (call: ApiCallInfo) => call.url === config.url && 
      new Date().getTime() - new Date(call.timestamp).getTime() < 5000
    );
    
    if (recentCalls.length > 2) {
      console.log(`⚠️ Potential refresh loop detected! ${recentCalls.length} calls to ${config.url} in the last 5 seconds`);
      logger.warn(`Potential refresh loop: ${recentCalls.length} calls to ${config.url} in 5 seconds`, "api");
    }
    
    // Log the API request with headers but without token
    const sanitizedHeaders = { ...config.headers };
    if (sanitizedHeaders.Authorization) {
      sanitizedHeaders.Authorization = 'Bearer [REDACTED]';
    }
    logger.debug(
      `API Request ${JSON.stringify({
        method: config.method,
        url: config.url,
        headers: sanitizedHeaders,
      })}`,
      "api"
    );
    
    return config;
  },
  (error) => {
    logger.error(`API Request Error ${error.message}`, "api");
    return Promise.reject(error);
  }
);

// Add a request interceptor to fix transaction field names
apiClient.interceptors.request.use(
  (config) => {
    if (
      config.method === "post" &&
      config.url === "/transactions" &&
      config.data
    ) {
      const data = config.data;
      if (data.amount !== undefined && data.amountFiat === undefined) {
        data.amountFiat = data.amount;
        delete data.amount;
      }
      if (data.currency !== undefined && data.currencyCode === undefined) {
        data.currencyCode = data.currency;
        delete data.currency;
      }
      config.data = data;
      console.log("Fixed transaction request data:", data);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Function to process the queue of failed requests
const processQueue = (token: string | null, isError = false): void => {
  failedRequestsQueue.forEach(({ resolve, reject, config }) => {
    if (isError || !token) {
      reject(new Error('Failed to refresh token'));
      return;
    }

    // Update Authorization header with new token
    config.headers.Authorization = `Bearer ${token}`;
    
    // Retry the request
    resolve(axios(config));
  });
  
  // Clear the queue
  failedRequestsQueue = [];
};

// Function to check token expiration
const isTokenExpired = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token);
    // Check if token is expired or will expire in the next 5 seconds (was 60)
    const currentTime = Date.now() / 1000;
    return !decoded.exp || decoded.exp - currentTime < 5; 
  } catch (error) {
    logger.error('Error decoding token:', error);
    return true;
  }
};

// Helper to check if a token is valid but about to expire (e.g., within 5 seconds)
const isTokenAboutToExpire = (token: string): boolean => {
  try {
    const decoded = jwtDecode(token) as any;
    const currentTime = Math.floor(Date.now() / 1000);
    // Token is valid but expires in less than 5 seconds (was 30)
    // For now, let's make this less aggressive or even disable it to break loops.
    // return decoded.exp && decoded.exp > currentTime && decoded.exp - currentTime < 5;
    return false; // Temporarily disable proactive refresh to stabilize
  } catch (error) {
    logger.error('Error checking token expiration:', error);
    return false;
  }
};

// Add a request interceptor for token and caching
apiClient.interceptors.request.use(
  async (config) => {
    
    const endpoint = config.url || "";
    const rateLimitExpiry = rateLimitedEndpoints.get(endpoint);

    if (rateLimitExpiry && Date.now() < rateLimitExpiry) {
      const waitTime = Math.ceil((rateLimitExpiry - Date.now()) / 1000);
      logger.warn(
        `Endpoint ${endpoint} is rate limited. Waiting ${waitTime}s before retrying.`,
        "api"
      );
      await new Promise((resolve) =>
        setTimeout(resolve, rateLimitExpiry - Date.now())
      );
      rateLimitedEndpoints.delete(endpoint);
    }

    if (isCacheable(config)) {
      const cacheControl = config.headers?.["Cache-Control"] || "";
      if (cacheControl === "no-cache") {
        logger.debug(
          `Skipping cache for: ${config.url} (Cache-Control: no-cache)`,
          "api"
        );
        return config;
      }

      const cacheKey = getCacheKey(config);
      const cachedEntry = await cacheService.getFromCache(cacheKey);

      if (cachedEntry) {
        logger.debug(`Using cached response for: ${config.url}`, "api", {
          expiresIn:
            Math.round((cachedEntry.expiresAt - Date.now()) / 1000) + "s",
        });
        return {
          ...config,
          adapter: () => {
            return Promise.resolve({
              data: cachedEntry.data,
              status: 200,
              statusText: "OK",
              headers: {},
              config: config,
              cached: true,
            });
          },
        };
      }
    }

    try {
      const token = await getAccessToken();
      
      if (token) {
        // Check if this is an auth endpoint (logout, refresh, etc.)
        const isAuthPath = endpoint.includes('/auth/logout') || 
                          endpoint.includes('/auth/refresh') ||
                          endpoint.includes('/auth/me');
        
        // For non-critical paths like navigation and UI, don't block on token refresh
        const isUiPath = endpoint.includes('/interactions') || 
                          endpoint.includes('/profiles') || 
                          endpoint.includes('/accounts');
        
        // For auth paths (like logout), always try to refresh expired tokens
        if (isTokenExpired(token) && (isAuthPath || !isUiPath)) {
          logger.debug('Token is expired, refreshing...', 'auth');
          
          // Only refresh once at a time to prevent multiple simultaneous refreshes
          if (!isRefreshingToken) {
            isRefreshingToken = true;
            
            try {
              const newToken = await refreshAccessToken();
              isRefreshingToken = false;
              
              if (newToken) {
                config.headers.Authorization = `Bearer ${newToken}`;
                
                // Process any queued requests with the new token
                processQueue(newToken);
              } else {
                // If refresh failed, process queue with error but don't fail UI requests
                processQueue(null, true);
                
                // Use existing token for UI paths even if refresh failed
                if (isUiPath && !isAuthPath) {
                  config.headers.Authorization = `Bearer ${token}`;
                  logger.debug('Using existing token for UI path despite refresh failure', 'auth');
                } else {
                  // Emit auth error event for non-UI paths or auth paths
                  authEvents.emit(AUTH_EVENTS.AUTH_ERROR, 'Token refresh failed');
                }
              }
            } catch (error) {
              isRefreshingToken = false;
              processQueue(null, true);
              
              // Use existing token for UI paths despite errors (but not auth paths)
              if (isUiPath && !isAuthPath) {
                config.headers.Authorization = `Bearer ${token}`;
                logger.debug('Using existing token for UI path despite refresh error', 'auth');
              } else {
                logger.error('Error refreshing token:', error);
                authEvents.emit(AUTH_EVENTS.AUTH_ERROR, 'Token refresh error');
              }
            }
          } else {
            // If already refreshing, queue auth requests and use current token for UI paths
            if (isAuthPath) {
              // Queue auth requests to wait for refresh completion
              return new Promise<InternalAxiosRequestConfig>((resolve, reject) => {
                failedRequestsQueue.push({
                  resolve: (response: AxiosResponse) => resolve(response.config as InternalAxiosRequestConfig),
                  reject,
                  config
                });
              });
            } else if (isUiPath) {
              config.headers.Authorization = `Bearer ${token}`;
              logger.debug('Using existing token while refresh in progress (UI path)', 'auth');
            }
          }
        } else if (isTokenAboutToExpire(token)) {
          // Token valid but expiring soon, use it for this request
          config.headers.Authorization = `Bearer ${token}`;
          
          // Trigger background refresh if not already refreshing
          if (!isRefreshingToken) {
            isRefreshingToken = true;
            refreshAccessToken()
              .then(newToken => {
                isRefreshingToken = false;
                if (newToken) {
                  // Successfully refreshed in background
                  logger.debug('Background token refresh successful', 'auth');
                }
              })
              .catch(error => {
                isRefreshingToken = false;
                logger.error('Background token refresh failed:', error);
              });
          }
        } else {
          // Use existing valid token
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      
      // Always use the profile ID from apiClient.defaults if available
      const profileId = apiClient.defaults.headers.common["X-Profile-ID"];
      if (profileId) {
        config.headers["X-Profile-ID"] = profileId;
        logger.trace(`Including X-Profile-ID: ${profileId} in request`, "api");
      } else {
        // Use a default value so the header is always present, just with a clear indicator it's missing
        config.headers["X-Profile-ID"] = "none";
        logger.trace("No Profile ID available, using fallback value", "api");
      }
    } catch (error) {
      logger.error('Error in request interceptor:', error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for caching and error handling
apiClient.interceptors.response.use(
  async (response) => {
    
    
    // Cache successful GET responses that are cacheable
    if (
      response.config.method?.toLowerCase() === "get" &&
      !response.cached &&
      isCacheable(response.config)
    ) {
      const cacheKey = getCacheKey(response.config);
      const url = response.config.url || "";
      
      // Use the helper function to get TTL
      const ttl = getCacheTTL(url);
      
      // Cache the response
      logger.debug(`Caching response for: ${url}`, "api");
      await cacheService.saveToCache(cacheKey, response.data, ttl);
    }
    
    // Log API response
    logger.debug(
      `API Response ${JSON.stringify({
        status: response.status,
        url: response.config.url,
        size: response.data ? (typeof response.data === 'string' ? response.data.length : 'object') : 0,
      })}`,
      "api"
    );

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Skip retry for requests that already have a retry flag
    if (!originalRequest) return Promise.reject(error);
    
    // Check if this is an auth endpoint (logout, refresh, etc.)
    const isAuthPath = originalRequest.url?.includes('/auth/logout') || 
                       originalRequest.url?.includes('/auth/refresh') ||
                       originalRequest.url?.includes('/auth/me');
    
    // For UI paths like navigation, don't aggressively reject on auth errors
    const isUiPath = originalRequest.url?.includes('/interactions') || 
                     originalRequest.url?.includes('/profiles') || 
                     originalRequest.url?.includes('/accounts');
    
    // Handle unauthorized errors (401)
    if (error.response?.status === 401) {
      logger.warn('[WARN] [auth] Authentication error detected. Token may be invalid or expired.');
      
      // For auth paths, don't use cached data - these need fresh auth
      if (!isAuthPath && isUiPath && !originalRequest._retry) {
        try {
          const cacheKey = getCacheKey(originalRequest);
          const cachedEntry = await cacheService.getFromCache(cacheKey);
          
          if (cachedEntry) {
            logger.debug(`Using cached data for failed auth on UI path: ${originalRequest.url}`, "api");
            return Promise.resolve({
              data: cachedEntry.data,
              status: 200,
              statusText: "OK (from cache)",
              headers: {},
              config: originalRequest,
              cached: true
            });
          }
        } catch (cacheError) {
          logger.debug(`No cache available for UI path: ${originalRequest.url}`, "api");
        }
      }
      
      // Check if we're already refreshing the token
      if (isRefreshingToken) {
        // If we're already refreshing, queue this request
        logger.debug('Token refresh in progress, queueing request');
        
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedRequestsQueue.push({
            resolve,
            reject,
            config: originalRequest
          });
        });
      }
      
      // Mark this request as a retry
      originalRequest._retry = true;
      isRefreshingToken = true;
      
      try {
        // Try to refresh the token
        const newToken = await refreshAccessToken();
        isRefreshingToken = false;
        
        if (newToken) {
          // Update header with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Process any queued requests
          processQueue(newToken);
          
          // Retry the original request with new token
          logger.debug(`Retrying ${originalRequest.url} with refreshed token`, 'auth');
          return axios(originalRequest);
        } else {
          // Handle failed refresh
          processQueue(null, true);
          
          // For auth paths, always fail if token refresh failed
          if (isAuthPath) {
            logger.debug(`Token refresh failed for auth path: ${originalRequest.url}, rejecting request`, "api");
            authEvents.emit(AUTH_EVENTS.AUTH_ERROR, 'Token refresh failed');
            return Promise.reject(error);
          }
          
          // For UI paths, try to return a graceful failure rather than rejecting
          if (isUiPath) {
            logger.debug(`Token refresh failed for UI path: ${originalRequest.url}, returning empty result`, "api");
            return Promise.resolve({
              data: [], // Return empty array or object based on expected response
              status: 200,
              statusText: "OK (empty due to auth failure)",
              headers: {},
              config: originalRequest,
              cached: false
            });
          }
          
          // Emit auth error event
          authEvents.emit(AUTH_EVENTS.AUTH_ERROR, 'Token refresh failed');
          
          return Promise.reject(error);
        }
      } catch (refreshError) {
        isRefreshingToken = false;
        
        // Process queued requests with error
        processQueue(null, true);
        
        // For auth paths, always fail if token refresh failed
        if (isAuthPath) {
          logger.debug(`Token refresh error for auth path: ${originalRequest.url}, rejecting request`, "api");
          authEvents.emit(AUTH_EVENTS.AUTH_ERROR, 'Token refresh error');
          return Promise.reject(refreshError);
        }
        
        // For UI paths, try to return a graceful failure
        if (isUiPath) {
          logger.debug(`Token refresh error for UI path: ${originalRequest.url}, returning empty result`, "api");
          return Promise.resolve({
            data: [], // Return empty array or object 
            status: 200,
            statusText: "OK (empty due to auth error)",
            headers: {},
            config: originalRequest,
            cached: false
          });
        }
        
        // Emit auth error
        authEvents.emit(AUTH_EVENTS.AUTH_ERROR, 'Token refresh error');
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle rate limiting (429)
    if (error.response?.status === 429) {
      const endpoint = originalRequest.url || "";
      const retryAfter = parseInt(error.response.headers["retry-after"] || "30", 10);
      const retryTime = Date.now() + retryAfter * 1000;
      
      rateLimitedEndpoints.set(endpoint, retryTime);
      logger.warn(`Rate limited for endpoint ${endpoint}. Retry after ${retryAfter}s`, "api");
    }
    
    // Log API error
    if (error.response) {
      // Skip logging for expected errors: 404s on direct interactions, 401s on token verification, and 401s on login endpoints (auto-detection)
      const isExpectedError = 
        (error.response.status === 404 && error.config?.url?.includes('/interactions/direct/')) || 
        (error.response.status === 401 && error.config?.url?.includes('/auth/verify-token')) ||
        (error.response.status === 401 && (error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/business/login')));
        
      if (!isExpectedError) {
        logger.error(
          `API Error ${JSON.stringify({
            status: error.response.status,
            url: error.config?.url,
            message: error.message,
            data: error.response.data,
          })}`,
          "api"
        );
      } else {
        // Log at debug level instead for expected errors
        logger.debug(
          `Expected API status: ${error.response.status} for ${error.config?.url}`,
          "api"
        );
      }
    } else {
      logger.error(
        `API Network Error ${JSON.stringify({
          url: error.config?.url,
          message: error.message,
        })}`,
        "api"
      );
    }
    
    return Promise.reject(error);
  }
);

// Log requests in development mode
if (IS_DEVELOPMENT) {
  apiClient.interceptors.request.use((request) => {
    logger.debug("API Request", "api", {
      method: request.method,
      url: request.url,
      headers: request.headers
        ? {
            Authorization: request.headers.Authorization
              ? "Bearer [REDACTED]"
              : "none",
            "X-Profile-ID": request.headers["X-Profile-ID"] || "none",
          }
        : "none",
    });
    return request;
  });

  apiClient.interceptors.response.use(
    (response) => {
      logger.debug("API Response", "api", {
        status: response.status,
        url: response.config.url,
        size: response.data ? (typeof response.data === 'string' ? response.data.length : 'object') : 0,
      });
      return response;
    },
    (error) => {
      // Skip logging 401 errors for login endpoints (these are expected during auto-detection)
      const isLoginEndpoint = error.config?.url?.includes('/auth/login') || 
                             error.config?.url?.includes('/auth/business/login');
      const is401Error = error.response?.status === 401;
      
      if (isLoginEndpoint && is401Error) {
        logger.debug("Expected auth failure during login auto-detection", "api", {
          status: error.response?.status,
          url: error.config?.url,
        });
      } else {
        logger.error("API Error", error, "api", {
          status: error.response?.status || "Network Error",
          url: error.config?.url,
        });
      }
      return Promise.reject(error);
    }
  );
}

// Add utility methods to clear cache
const clearCache = async () => {
  await cacheService.clearCache();
  logger.info("API cache cleared", "api");
};

const clearUserCache = async () => {
  await cacheService.clearCacheCategory("api:GET-/auth/profile");
  logger.info("User cache cleared", "api");
};

const clearFinancialCache = async () => {
  await cacheService.clearCacheCategory("api:GET-/accounts/:id/balance");
  await cacheService.clearCacheCategory("api:GET-/transactions");
  logger.info("Financial cache cleared", "api");
};

// Function to set profile ID in request headers
const setProfileId = (profileId: string | null) => {
  if (profileId) {
    apiClient.defaults.headers.common["X-Profile-ID"] = profileId;
    logger.debug(`Set X-Profile-ID header to ${profileId}`, "api");
  } else {
    delete apiClient.defaults.headers.common["X-Profile-ID"];
    logger.debug("Removed X-Profile-ID header", "api");
  }
};

// Update the post method with custom timeout
const post = async (url: string, data?: any, config?: AxiosRequestConfig) => {

  const requestConfig = {
    timeout: url.includes("/transactions") ? 60000 : 30000,
    ...config,
  };
  try {
    const response = await apiClient.post(url, data, requestConfig);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
      logger.error(
        `Request timeout for ${url} after ${requestConfig.timeout}ms`,
        "api"
      );
    }
    throw error;
  }
};

// Override the get method
const get = async (url: string, config?: AxiosRequestConfig) => {
  
  return apiClient.get(url, config);
};

// Override the put method
const put = async (url: string, data?: any, config?: AxiosRequestConfig) => {
  
  return apiClient.put(url, data, config);
};

// Override the delete method to handle mock mode
const del = async (url: string, config?: AxiosRequestConfig) => {
  
  return apiClient.delete(url, config);
};

// Override the patch method to handle mock mode
const patch = async (url: string, data?: any, config?: AxiosRequestConfig) => {
  
  return apiClient.patch(url, data, config);
};

// Export the API client with additional methods
const enhancedApiClient = {
  ...apiClient,
  get: get,
  post: post,
  put: put,
  delete: del,
  patch: patch,
  clearCache,
  clearUserCache,
  clearFinancialCache,
  setProfileId,
  
  // Add token management functions
  refreshToken: async () => {
    // Skip token refresh in mock mode
    
    try {
      const token = await refreshAccessToken();
      if (token) {
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Error refreshing token:", error);
      return false;
    }
  },
  
  isAuthTokenValid: async () => {
    // Always return true in mock mode
    
    const token = await getAccessToken();
    return token && !isTokenExpired(token);
  }
};

export default enhancedApiClient;
