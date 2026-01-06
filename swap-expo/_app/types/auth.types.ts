/**
 * Authentication related types for the frontend
 */

// Authentication Levels for Progressive Access
export enum AuthLevel {
  GUEST = 0,           // Public browsing (Map)
  AUTHENTICATED = 1,   // Personal features (Interactions, Profile)  
  WALLET_VERIFIED = 2  // Financial operations (Wallet, Payments)
}

// Basic user information kept in AuthContext
export interface User {
  id: string;
  profileId: string;
  entityId: string;  // Required - universal backend identifier (entities.id)
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  // Professional profile fields
  profileType?: 'personal' | 'business';
  businessName?: string;
}

// Auth error class
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Response from authentication endpoints
export interface AuthResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  userId: string;
  profileId?: string;
  error?: string;
  message?: string;
}

// Token data stored locally
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  userId?: string;
  profileId?: string;
}

// Phone verification data (after OTP is verified)
export interface PhoneVerification {
  phoneNumber: string;
  setupToken: string; // Setup token from verify-otp endpoint, required for complete-registration
  accessToken?: string; // Only set after account creation
  profileId?: string | null; // Only set after account creation
}

// User data for registration
export interface UserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

// Progressive Auth Context interface - WhatsApp style
export interface AuthContextType {
  // Core Authentication State
  authLevel: AuthLevel;
  isAuthenticated: boolean;
  isGuestMode: boolean;
  isLoading: boolean;
  user: User | null;

  // Computed convenience properties (derived from user)
  currentProfileId: string | null; // user?.profileId - single source of truth

  // Initialization State (blocks UI until session check completes)
  isInitialized: boolean;

  // Session Management
  hasPersistedSession: boolean;

  // KYC Operation Tracking removed - handled by TanStack Query

  // Wallet Security
  isWalletUnlocked: boolean;
  lastWalletUnlock: number | null;
  
  // Authentication Methods
  // NOTE: login() and loginBusiness() removed - use unifiedLogin() which auto-detects user type
  loginWithPin: (identifier: string, pin: string) => Promise<{ success: boolean; message?: string }>;
  unifiedLogin: (identifier: string, password: string, skipStore?: boolean) => Promise<{ success: boolean; message?: string; user_type?: string }>;
  logout: () => Promise<void>;

  // Multi-account Management (Instagram-style)
  availableAccounts: any[]; // Account[] from AccountsManager
  switchAccount: (userId: string) => Promise<boolean>;
  saveCurrentAccountToManager: () => Promise<void>;
  loadAvailableAccounts: () => Promise<void>;
  removeAccount: (userId: string) => Promise<boolean>;

  // Profile Switch State (prevents stale queries during switch)
  isProfileSwitching: boolean;
  setIsProfileSwitching: (switching: boolean) => void;

  // Progressive Authentication
  upgradeToAuthenticated: () => Promise<boolean>;
  requestWalletAccess: () => Promise<boolean>;
  lockWallet: () => void;
  
  // Biometric & Security
  loginWithBiometric: () => Promise<{ success: boolean; message?: string }>;
  setupBiometricLogin: (identifier: string, password: string) => Promise<void>;
  
  // Session Management
  checkSession: () => Promise<void>;
  completeProfileSwitch: (newProfileId: string) => Promise<boolean>;
  getAccessToken: () => Promise<string | null>;
  
  // Legacy Support (keep for backward compatibility)
  showConfirmationModal: boolean;
  setShowConfirmationModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleSignUp: (userData: UserData) => Promise<any>;
  checkEmailConfirmation: (email: string) => Promise<boolean>;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  needsLogin: boolean;
  setNeedsLogin: React.Dispatch<React.SetStateAction<boolean>>;
  forceLogout: () => Promise<void>;
  rememberMe: boolean;
  setRememberMe: React.Dispatch<React.SetStateAction<boolean>>;
  loadCredentials: () => Promise<{ email?: string; password?: string } | null>;
  justLoggedOut?: boolean;
  setJustLoggedOut?: React.Dispatch<React.SetStateAction<boolean>>;
  setPhoneVerified: (data: PhoneVerification) => void;
  phoneVerification: PhoneVerification | null;
  getLastUserForPin: () => Promise<string | null>;
  clearPinUser: () => Promise<void>;
  hasPinUserStored: () => Promise<boolean>;
  getBiometricCredentials: () => Promise<{ identifier: string; password: string } | null>;
  enableGuestMode: () => Promise<void>;
  requireAuthentication: () => Promise<boolean>;
  persistentAuthEnabled: boolean;
  setPersistentAuthEnabled: (enabled: boolean) => void;

  // DEVELOPMENT HELPERS
  emergencyCleanupForDev: () => Promise<void>;
}