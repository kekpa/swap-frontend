// Updated: Enhanced mobile UI with improved spacing and touch targets - 2024-06-27
// Updated: Made width match SearchBar on small web screens - 2024-06-27
// Updated: Refactored to use global state for expansion - 2024-07-02
// Updated: Changed header to show 3-word address and fixed chevron orientation - 2024-07-02
// Updated: Integrated theme system for consistent styling - 2024-12-30

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMapStore } from '../../../store/mapStore';
import { useTheme } from '../../../theme/ThemeContext';

interface LocationDetailsProps {
  locationName?: string; 
  locationGeohash?: string; // Changed from locationCode for clarity
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isNearBorder?: boolean;
  alternatives?: Array<{
    code: string;
    distance: number;
  }>;
}

const LocationDetails: React.FC<LocationDetailsProps> = ({
  locationName, 
  locationGeohash = 'table.chair.lamp', // Use new prop name
  coordinates = { latitude: 37.7749, longitude: -122.4194 },
  isNearBorder = true,
  alternatives = [
    { code: 'table.chair.book', distance: 15 },
    { code: 'table.spot.lamp', distance: 18 }
  ]
}) => {
  const { theme } = useTheme();
  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;
  const isWeb = Platform.OS === 'web';
  
  // Use global state for expansion
  const { isLocationDetailsExpanded, toggleLocationDetails, setLocationDetailsExpanded } = useMapStore();
  
  // Initialize expanded state based on device
  useEffect(() => {
    // Default to collapsed on mobile, expanded on desktop
    setLocationDetailsExpanded(!isMobile);
  }, [isMobile, setLocationDetailsExpanded]);

  // Create themed styles
  const styles = useMemo(() => StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: theme.spacing.md,
      left: theme.spacing.md,
      width: '90%',
      maxWidth: 400,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      zIndex: 20
    },
    mobileContainer: {
      bottom: theme.spacing.md, // Position at the bottom without accounting for nav bar
      left: '5%', // Center the card better on mobile
      width: '90%', // Take up more width
      maxWidth: undefined, // Allow full mobile width
    },
    smallWebContainer: {
      width: '90%', // Match SearchBar width
      maxWidth: 600, // Match SearchBar maxWidth
      left: '50%', // Center on web
      transform: [{ translateX: '-50%' }], // Proper centering for web
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 18,
      paddingVertical: theme.spacing.md,
      borderTopLeftRadius: theme.borderRadius.md,
      borderTopRightRadius: theme.borderRadius.md,
    },
    headerExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    headerCollapsed: {
      borderBottomLeftRadius: theme.borderRadius.md,
      borderBottomRightRadius: theme.borderRadius.md,
      ...theme.shadows.medium,
    },
    headerText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.white,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Monospace font for 3-word address
    },
    content: {
      padding: 18,
      backgroundColor: theme.colors.card,
    },
    codeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    codeText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
    },
    copyButton: {
      padding: theme.spacing.sm,
      marginLeft: theme.spacing.sm,
    },
    coordinatesContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    iconWrapper: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    coordinatesText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    borderWarning: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.sm,
      backgroundColor: `${theme.colors.warning}20`, // 20% opacity
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.warning,
    },
    warningContent: {
      flex: 1,
    },
    warningTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    warningText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    alternativesContainer: {
      padding: 18,
      backgroundColor: theme.colors.grayUltraLight,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      borderBottomLeftRadius: theme.borderRadius.md,
      borderBottomRightRadius: theme.borderRadius.md,
    },
    alternativesTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 10,
    },
    alternativeItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      padding: 14,
      borderRadius: theme.borderRadius.md,
      marginVertical: 5,
      ...theme.shadows.small,
    },
    alternativeCode: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
    },
    distanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    distanceText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
      marginRight: theme.spacing.sm,
    },
    arrowButton: {
      padding: 5,
      borderRadius: theme.borderRadius.md,
    },
    collapsedContainer: {
      overflow: 'visible',
      ...theme.shadows.medium,
    },
    expandedContainer: {
      overflow: 'visible',
      ...theme.shadows.medium,
    },
  }), [theme]);

  // Dynamic header style
  const headerStyle = [
    styles.header,
    isLocationDetailsExpanded ? styles.headerExpanded : styles.headerCollapsed
  ];

  // Dynamic container style
  const containerStyle = [
    styles.container,
    isMobile && styles.mobileContainer,
    isWeb && isMobile && styles.smallWebContainer,
    !isLocationDetailsExpanded ? styles.collapsedContainer : styles.expandedContainer
  ];

  // Determine the header text: name if available, otherwise @geohash
  const headerText = locationName ? locationName : `@${locationGeohash}`;
  // The text displayed in the body is always the geohash
  const bodyCodeText = locationGeohash;

  return (
    <View style={containerStyle}>
      <TouchableOpacity 
        style={headerStyle}
        onPress={toggleLocationDetails}
        activeOpacity={0.7}
      >
        {/* Display name OR @geohash in header */}
        <Text style={styles.headerText}>{headerText}</Text>
        <Ionicons 
          name={isLocationDetailsExpanded ? 'chevron-down' : 'chevron-up'} 
          size={22} 
          color={theme.colors.white} 
        />
      </TouchableOpacity>

      {isLocationDetailsExpanded && (
        <>
          <View style={styles.content}>
            <View style={styles.codeContainer}>
              {/* Always display geohash in body */}
              <Text style={styles.codeText}>{bodyCodeText}</Text>
              <TouchableOpacity 
                style={styles.copyButton}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="copy-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.coordinatesContainer}>
              <View style={styles.iconWrapper}>
                <Ionicons name="location" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.coordinatesText}>
                {coordinates.latitude.toFixed(4)}° N, {Math.abs(coordinates.longitude).toFixed(4)}° W
              </Text>
            </View>

            {isNearBorder && (
              <View style={styles.borderWarning}>
                <View style={styles.iconWrapper}>
                  <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
                </View>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Near Location Border</Text>
                  <Text style={styles.warningText}>
                    This location is near a boundary. Alternative nearby codes available.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {alternatives.length > 0 && (
            <View style={styles.alternativesContainer}>
              <Text style={styles.alternativesTitle}>Alternative Nearby Codes</Text>
              {alternatives.map((alt, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.alternativeItem}
                  activeOpacity={0.7}
                >
                  <Text style={styles.alternativeCode}>{alt.code}</Text>
                  <View style={styles.distanceContainer}>
                    <Text style={styles.distanceText}>{alt.distance}m</Text>
                    <TouchableOpacity 
                      style={styles.arrowButton}
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                      <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
};

export default LocationDetails; 