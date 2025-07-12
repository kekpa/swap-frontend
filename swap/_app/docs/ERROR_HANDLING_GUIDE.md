# Error Handling Standardization Guide

## Overview
This guide documents the standardized error handling patterns implemented across the Swap app to ensure consistent, user-friendly error management.

## Core Utilities

### `errorHandler.ts`
Central error handling utility providing:
- `AppError` interface with categories and severity levels
- `normalizeError()` for converting unknown errors to standard format
- `logError()` for consistent error logging
- `createRetryFunction()` for TanStack Query retry logic
- `getUserErrorMessage()` for user-friendly error messages

### `useStandardQuery.ts`
Standardized TanStack Query hook factory with:
- Pre-configured retry logic and caching strategies
- Consistent error handling across all queries
- Standard response format with loading/error states

## Usage Patterns

### 1. TanStack Query Hooks
```typescript
import { useStandardQuery, createQueryResponse } from './useStandardQuery';

export const useCountries = () => {
  const queryResult = useStandardQuery(
    queryKeys.countries,
    fetchCountries,
    'reference', // Preset: realtime, standard, reference, critical
    {
      meta: { errorMessage: 'Failed to load countries' }
    }
  );

  return createQueryResponse(queryResult, defaultValue);
};
```

### 2. Storage Operations
```typescript
import { handleStorageError } from './errorHandler';

try {
  await SecureStore.setItemAsync(key, value);
} catch (error) {
  handleStorageError(error, 'save token');
  // Error is logged, continue execution
}
```

### 3. Auth Operations  
```typescript
import { handleAuthError, getUserErrorMessage } from './errorHandler';

try {
  const response = await signUp(userData);
  return response;
} catch (err) {
  const authError = handleAuthError(err, 'signup');
  setError(getUserErrorMessage(authError));
  throw authError;
}
```

### 4. API Operations
```typescript
import { safeAsync, ErrorCategory } from './errorHandler';

const fetchData = () => safeAsync(
  () => apiClient.get('/data'),
  ErrorCategory.API,
  'fetch user data'
);
```

## Query Presets

### `realtime`
- **Use for**: Live data, user actions
- **Stale time**: 30 seconds
- **Cache time**: 5 minutes
- **Retries**: 1

### `standard`  
- **Use for**: User profiles, settings
- **Stale time**: 5 minutes
- **Cache time**: 30 minutes
- **Retries**: 2

### `reference`
- **Use for**: Countries, currencies, static data
- **Stale time**: 24 hours
- **Cache time**: 7 days
- **Retries**: 2

### `critical`
- **Use for**: Balances, transactions
- **Stale time**: 1 minute
- **Cache time**: 15 minutes
- **Retries**: 3

## Error Categories

- `AUTH` - Authentication/authorization errors
- `API` - HTTP/network API errors
- `NETWORK` - Connectivity issues
- `STORAGE` - Local storage operations
- `VALIDATION` - Input validation errors
- `PERMISSION` - Device permission errors
- `UNKNOWN` - Unclassified errors

## Error Severity Levels

- `LOW` - Non-critical, can continue
- `MEDIUM` - Important but recoverable
- `HIGH` - Critical, affects core functionality  
- `CRITICAL` - App-breaking, requires immediate attention

## Migration Guide

### Before (Inconsistent)
```typescript
// Different error handling patterns
try {
  const data = await api.get('/users');
} catch (error) {
  console.error('Error:', error);
  setError(error.message || 'Failed');
}

// Inconsistent retry logic
retry: (count, error) => {
  if (error?.status >= 400 && error?.status < 500) {
    return false;
  }
  return count < 2;
}
```

### After (Standardized)
```typescript
// Consistent error handling
const queryResult = useStandardQuery(
  ['users'],
  () => api.get('/users'),
  'standard'
);

// Automatic retry logic and error formatting
return createQueryResponse(queryResult);
```

## Benefits

1. **Consistency**: All errors handled the same way across the app
2. **User Experience**: Friendly error messages for users
3. **Developer Experience**: Less boilerplate, easier debugging
4. **Monitoring**: Structured error logging for better insights
5. **Reliability**: Smart retry logic and proper error categorization

## Files Updated

- ✅ `utils/errorHandler.ts` - Core error handling utilities
- ✅ `query/hooks/useStandardQuery.ts` - Standardized query factory
- ✅ `utils/tokenStorage.ts` - Storage error handling
- ✅ `features/auth/hooks/useAuth.ts` - Auth error handling
- ✅ `query/hooks/useCountries.ts` - Example query migration
- ✅ `query/hooks/useUserProfile.ts` - Retry function standardization

## Next Steps

1. Migrate remaining query hooks to use `useStandardQuery`
2. Update components to use standardized error responses
3. Add error boundary components for unhandled errors
4. Implement global error reporting for production monitoring