/**
 * Re-export useAvailableProfiles from auth hooks
 *
 * This file provides a centralized location for the useAvailableProfiles hook,
 * maintaining consistency with other data hooks in the hooks-data directory.
 */

export { useAvailableProfiles, type AvailableProfile } from '../features/auth/hooks/useAvailableProfiles';
export { default } from '../features/auth/hooks/useAvailableProfiles';
