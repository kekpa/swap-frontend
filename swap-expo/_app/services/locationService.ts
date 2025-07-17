// Updated: Fixed type errors in location service - 2023-06-26
// Updated: Enhanced location service with better error handling for mobile - 2024-06-27
// Updated: Added custom Haiti location when simulator detected - 2024-06-27
// Updated: Improved actual location detection - 2024-06-27

import * as Location from 'expo-location';
import { LocationData, Coordinate } from '../types/map';
import { Platform } from 'react-native';

// Haiti coordinates (Petion-Ville area)
const HAITI_LOCATION = {
  latitude: 18.5944,
  longitude: -72.3074
};

// Check if coordinates are default simulator coordinates
const isSimulatorLocation = (coords: {latitude: number, longitude: number}): boolean => {
  // Check if location is close to Apple's default San Francisco location
  const isSanFrancisco = 
    coords.latitude > 37.78 && coords.latitude < 37.79 && 
    coords.longitude > -122.41 && coords.longitude < -122.40;
    
  // Check if using default simulator coords or "0,0" which sometimes happens
  return isSanFrancisco || 
    (coords.latitude === 0 && coords.longitude === 0) ||
    (coords.latitude === 37.785834 && coords.longitude === -122.406417);
};

// Request location permissions from the user with better explanation
export const requestLocationPermissions = async (): Promise<boolean> => {
  console.log('[LocationService] Requesting precise location permissions...');
  
  // First request foreground permissions
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  
  if (foregroundStatus !== 'granted') {
    console.error('[LocationService] Foreground location permission denied');
    return false;
  }
  
  console.log('[LocationService] Foreground location permission granted');
  return true;
};

// Get the user's current location with improved accuracy
export const getCurrentLocation = async (): Promise<LocationData> => {
  try {
    const hasPermission = await requestLocationPermissions();
    
    if (!hasPermission) {
      console.error('[LocationService] Location permission not granted');
      throw new Error('Location permission not granted');
    }
    
    console.log('[LocationService] Getting current position with high accuracy...');
    
    // Use better settings for more accurate location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation, // Highest possible accuracy
      mayShowUserSettingsDialog: true,
      timeInterval: 2000, // More frequent updates
    });
    
    console.log(`[LocationService] Raw position acquired: ${location.coords.latitude}, ${location.coords.longitude}`);
    
    // Verify that this looks like a valid location
    if (location.coords.latitude === 0 && location.coords.longitude === 0) {
      console.error('[LocationService] Invalid coordinates (0,0) received from location API');
      throw new Error('Invalid location data received');
    }
    
    // Return the actual coordinates
    return {
      coordinate: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy || undefined,
    };
  } catch (error) {
    console.error('[LocationService] Error getting location:', error);
    if (error instanceof Error) {
      throw new Error(`Location error: ${error.message}`);
    }
    throw new Error('Failed to get current location');
  }
};

// Start watching the user's location (for real-time updates)
export const watchUserLocation = async (
  onLocationChange: (location: LocationData) => void,
  onError?: (error: any) => void
): Promise<() => void> => {
  try {
    const hasPermission = await requestLocationPermissions();
    
    if (!hasPermission) {
      throw new Error('Location permission not granted');
    }
    
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 10, // Update every 10 meters
        timeInterval: 5000, // Update every 5 seconds
      },
      (location) => {
        onLocationChange({
          coordinate: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          timestamp: location.timestamp,
          accuracy: location.coords.accuracy || undefined,
        });
      }
    );
    
    // Return a cleanup function
    return () => {
      subscription.remove();
    };
  } catch (error) {
    if (onError) {
      onError(error);
    }
    // Return a no-op cleanup function
    return () => {};
  }
};

// Calculate distance between two coordinates (in meters)
export const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
  // Haversine formula to calculate distance between two points on Earth
  const toRad = (value: number) => (value * Math.PI) / 180;
  
  const R = 6371e3; // Earth's radius in meters
  const φ1 = toRad(coord1.latitude);
  const φ2 = toRad(coord2.latitude);
  const Δφ = toRad(coord2.latitude - coord1.latitude);
  const Δλ = toRad(coord2.longitude - coord1.longitude);
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}; 