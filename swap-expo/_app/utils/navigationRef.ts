import { createNavigationContainerRef } from '@react-navigation/native';

// Create a ref to access navigation from outside React components
// Used for navigation after profile switches
export const navigationRef = createNavigationContainerRef();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  }
}
