/**
 * Auth Services - Centralized Authentication Module
 *
 * This module consolidates all authentication-related functionality:
 * - SessionManager: Session validation, restoration, cleanup
 * - LoginService: All login methods (unified, PIN, biometric)
 * - AccountSwitcher: Multi-account management
 * - WalletSecurity: Wallet-level security and access control
 *
 * Usage:
 * import { sessionManager, loginService, accountSwitcher, walletSecurity } from '@/services/auth';
 *
 * @author Swap Team
 * @version 1.0.0
 */

export { sessionManager, SessionData, SessionValidationResult } from './SessionManager';
export { loginService, LoginResult, LoginCredentials } from './LoginService';
export { accountSwitcher, AccountSwitchResult } from './AccountSwitcher';
export { walletSecurity, WalletSecurityState, WalletAccessResult } from './WalletSecurity';
