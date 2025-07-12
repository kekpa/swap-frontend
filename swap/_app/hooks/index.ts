/**
 * Main Hooks Exports
 * 
 * Centralized exports for utility hooks and feature-specific hooks.
 * For data fetching hooks, see /query/hooks/index.ts
 */

// Authentication hooks
export * from './useAuth';

// Document and file upload hooks
export * from './useDocumentUpload';

// KYC and profile hooks
export * from './usePersonalInfoLoad';
export * from './usePersonalInfoSave';

/**
 * Quick reference for common hooks:
 * 
 * **Authentication:**
 * - `useAuth()` - Login, logout, user creation, profile management
 * 
 * **Document Upload:**
 * - `useDocumentUpload()` - Camera capture, file upload for KYC documents
 * 
 * **KYC Personal Info:**
 * - `usePersonalInfoLoad()` - Load saved personal information
 * - `usePersonalInfoSave()` - Save personal information data
 * 
 * **Data Fetching:**
 * For data fetching hooks with TanStack Query, see `/query/hooks/index.ts`
 */