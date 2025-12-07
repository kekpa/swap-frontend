/**
 * Created: Added profile setup screens from HTML template - 2023-07-05
 * Updated: Removed PasscodeSetup and BioSetup - now handled by AppLockSetupScreen
 *
 * This file exports all components for the profile setup flow.
 */

export { default as HowYouHeardAboutUs } from './HowYouHeardAboutUs';
export { default as NotificationActivation } from './NotificationActivation';
// PasscodeSetup and BioSetup removed - handled by AppLockSetupScreen after authentication
export { default as ProfileSetupNavigator } from './ProfileSetupNavigator';
export type { ProfileSetupStackParamList } from './ProfileSetupNavigator';
