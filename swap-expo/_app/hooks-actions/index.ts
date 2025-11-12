/**
 * Action Hooks - Business Logic & Operations
 *
 * These hooks handle user actions, mutations, and side effects.
 * Use these when you need to DO something (POST, PUT, DELETE).
 *
 * For data fetching hooks, see /hooks-data/index.ts
 */

// Authentication hooks
export * from './useAuth';

// Document and file upload hooks
export * from './useDocumentUpload';

// KYC and profile hooks
export * from './usePersonalInfoLoad';
export * from './usePersonalInfoSave';
export * from './useKycCompletion';
export * from './useBeneficialOwners';

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
 * For data fetching hooks with TanStack Query, see `/hooks-data/index.ts`
 */