import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';

// Updated categories based on map-markers-design.html
type BaseCategory = 
  | 'hospitals' | 'pharmacies' | 'clinics' | 'schools' | 'libraries'
  | 'shopping' | 'banks' | 'professional_services' | 'parks_recreation' 
  | 'transportation' | 'government_public_services' | 'accommodation' | 'other';

// Updated status modifiers
type StatusModifier = {
  isFavorite?: boolean;
  hasSwapIntegration?: boolean;
  isSearchResult?: boolean;
};

interface LocationMarkerProps {
  location: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    description?: string;
    baseCategory?: BaseCategory;
    statusModifiers?: StatusModifier;
  };
  isUserLocation?: boolean;
  zoomLevel: number;
  onPress?: (location: any) => void;
}

const LocationMarker: React.FC<LocationMarkerProps> = React.memo(({
  location,
  isUserLocation = false,
  zoomLevel,
  onPress
}) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(location);
  };

  // Maps category ID to color and display name from the design system
  const getBaseCategoryStyle = (category: BaseCategory) => {
    switch (category) {
      case 'hospitals': return { backgroundColor: '#dc3545', name: 'Hospitals' };
      case 'pharmacies': return { backgroundColor: '#28a745', name: 'Pharmacies' };
      case 'clinics': return { backgroundColor: '#20c997', name: 'Clinics' };
      case 'schools': return { backgroundColor: '#6f42c1', name: 'Schools' };
      case 'libraries': return { backgroundColor: '#8B4513', name: 'Libraries' };
      case 'shopping': return { backgroundColor: '#fd7e14', name: 'Shopping' };
      case 'banks': return { backgroundColor: '#007bff', name: 'Banks' };
      case 'professional_services': return { backgroundColor: '#17a2b8', name: 'Professional Services' };
      case 'parks_recreation': return { backgroundColor: '#198754', name: 'Parks & Recreation' };
      case 'transportation': return { backgroundColor: '#000000', name: 'Transportation' };
      case 'government_public_services': return { backgroundColor: '#6c757d', name: 'Government & Public Services' };
      case 'accommodation': return { backgroundColor: '#e83e8c', name: 'Accommodation' };
      default: return { backgroundColor: '#adb5bd', name: 'Other' };
    }
  };

  // Determines if a location is "popular" to decide its size at different zoom levels.
  const isLocationPopular = (): boolean => {
    if (isUserLocation) return true; // User location is always treated as popular for sizing.
    
    const baseCategory = location.baseCategory || 'other';
    const modifiers = location.statusModifiers || {};
    
    let score = 3;
    
    // Importance based on category type
    switch (baseCategory) {
      case 'hospitals':
      case 'schools':
      case 'government_public_services':
      case 'transportation':
        score = 8;
        break;
      case 'banks':
      case 'pharmacies':
      case 'accommodation':
        score = 6;
        break;
      case 'shopping':
      case 'professional_services':
        score = 5;
        break;
      case 'parks_recreation':
        score = 4;
        break;
      default:
        score = 3;
    }
    
    if (modifiers.hasSwapIntegration) score += 2;
    if (modifiers.isFavorite) score += 3;
    
    return score >= 6; // Locations with a score of 6 or higher are considered "popular".
  };

  // Calculates the final marker style based on the design system logic.
  const getMarkerStyle = () => {
    if (isUserLocation) {
      return {
        size: 20,
        backgroundColor: '#007AFF',
        borderColor: '#FFFFFF',
        borderWidth: 2,
        icon: null,
        categoryName: 'Your Location'
      };
    }

    const isPopular = isLocationPopular();
    const baseCategory = location.baseCategory || 'other';
    const modifiers = location.statusModifiers || {};
    const baseCategoryStyle = getBaseCategoryStyle(baseCategory);

    // Dynamic sizing based on zoom and popularity from the design file.
    const size = zoomLevel > 15 
        ? (isPopular ? 24 : 20) 
        : (isPopular ? 24 : 8);

    // Dynamic border width. Note: The 3px border for popular items creates a visual hierarchy.
    const borderWidth = zoomLevel <= 15 && !isPopular 
        ? 1 
        : (isPopular ? 3 : 2);

    let finalColor = baseCategoryStyle.backgroundColor;
    let icon = null;

    // Status modifiers override base colors and icons.
    if (modifiers.isFavorite) {
      finalColor = '#FFD60A';
      icon = '★';
    } else if (modifiers.hasSwapIntegration) {
      finalColor = '#8b14fd';
      icon = 'S';
    } else if (modifiers.isSearchResult) {
      finalColor = '#8b14fd';
      icon = null; // Search results use Swap purple but no icon.
    }

    // Tiny 8px markers do not display icons to avoid clutter.
    if (size === 8) {
        icon = null;
    }

    return {
      size: size,
      backgroundColor: finalColor,
      borderColor: '#FFFFFF',
      borderWidth: borderWidth,
      icon: icon,
      categoryName: baseCategoryStyle.name
    };
  };

  const markerStyle = getMarkerStyle();

  return (
    <Marker
      coordinate={{
        latitude: location.latitude,
        longitude: location.longitude,
      }}
      onPress={handlePress}
      tracksViewChanges={false} // Critical performance optimization
    >
      <View style={[
        styles.marker,
        {
          width: markerStyle.size,
          height: markerStyle.size,
          backgroundColor: markerStyle.backgroundColor,
          borderRadius: markerStyle.size / 2,
          borderWidth: markerStyle.borderWidth,
          borderColor: markerStyle.borderColor,
        }
      ]}>
        {markerStyle.icon && (
          <Text style={styles.iconText}>{markerStyle.icon}</Text>
        )}
      </View>
    </Marker>
  );
}, (prevProps, nextProps) => {
  // Memoization comparison to prevent unnecessary re-renders.
  return (
    prevProps.location.id === nextProps.location.id &&
    prevProps.isUserLocation === nextProps.isUserLocation &&
    prevProps.zoomLevel === nextProps.zoomLevel &&
    prevProps.location.baseCategory === nextProps.location.baseCategory &&
    JSON.stringify(prevProps.location.statusModifiers) === JSON.stringify(nextProps.location.statusModifiers)
  );
});

const styles = StyleSheet.create({
  marker: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  iconText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default LocationMarker; 