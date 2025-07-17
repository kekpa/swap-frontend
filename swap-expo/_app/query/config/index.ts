/**
 * Query Configuration Exports
 * 
 * Central exports for all TanStack Query configuration utilities.
 */

export {
  calculateStaleTime,
  getStaleTimeForQuery,
  staleTimeManager,
  StaleTimeUtils,
  STALE_TIME_PRESETS,
  DynamicStaleTimeManager,
  type DataType,
  type UserBehavior,
} from './staleTimeConfig';

export type { DataType as QueryDataType, UserBehavior as QueryUserBehavior } from './staleTimeConfig';