/**
 * API related types for the frontend
 */

// Generic API response
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// API error type
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
}

// API request options
export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  withCredentials?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  timeout?: number;
}

// API client specific types
export interface CacheConfig {
  cacheable: Record<string, number>;
  defaultTTL: number;
}

export interface CachedEntry<T> {
  data: T;
  expiresAt: number;
}

export interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  config: any;
}

// Auth events
export const AUTH_EVENTS = {
  UNAUTHORIZED: "unauthorized",
  SESSION_EXPIRED: "session_expired",
  LOGIN_REQUIRED: "login_required",
  AUTH_ERROR: "auth_error",
};

// Simple custom event emitter implementation
export interface EventEmitter {
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
  emit(event: string, ...args: any[]): void;
} 