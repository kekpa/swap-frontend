import { createNavigationContainerRef } from '@react-navigation/native';

// Create a ref to access navigation from outside React components
// Used for navigation after profile switches
export const navigationRef = createNavigationContainerRef();

export function navigate(name: string, params?: Record<string, unknown>) {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as (name: string, params?: Record<string, unknown>) => void)(name, params);
  }
}
