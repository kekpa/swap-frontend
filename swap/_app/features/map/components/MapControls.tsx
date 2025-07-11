// Updated: Fixed exact alignment with LayerToggle by adjusting margins - 2023-06-27
// Updated: Integrated theme system for consistent styling - 2024-12-30

import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { MapControlProps } from '../../../types/map';

const MapControls: React.FC<MapControlProps> = ({ 
  onZoomIn, 
  onZoomOut, 
  onCurrentLocation,
  style 
}) => {
  const { theme } = useTheme();
  
  // Check if device is a tablet or larger
  const windowWidth = Dimensions.get('window').width;
  const isTabletOrLarger = windowWidth >= 768;
  
  // Create themed styles
  const styles = useMemo(() => StyleSheet.create({
    container: {
      position: 'absolute',
      zIndex: 10,
      flexDirection: 'column',
      gap: theme.spacing.sm,
    },
    tabletPosition: {
      right: theme.spacing.md,
      bottom: theme.spacing.md, // Same level as LayerToggle
    },
    mobilePosition: {
      right: theme.spacing.md,
      bottom: 80, // Same level as LayerToggle with mobile nav
    },
    controlButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.sm, // This creates the gap between buttons
      // Apply theme-based shadows
      ...theme.shadows.medium,
      // Add subtle border for definition
      borderWidth: Platform.OS === 'ios' ? 0.5 : 0,
      borderColor: theme.colors.border,
    },
    lastButton: {
      marginBottom: 0, // Remove bottom margin from last button to align with LayerToggle
    }
  }), [theme]);
  
  return (
    <View style={[
      styles.container, 
      isTabletOrLarger ? styles.tabletPosition : styles.mobilePosition,
      style
    ]}>
      {/* Current Location */}
      <TouchableOpacity 
        style={styles.controlButton} 
        onPress={onCurrentLocation}
        accessibilityLabel="Go to your location"
      >
        <Ionicons name="location" size={22} color={theme.colors.primary} />
      </TouchableOpacity>
      
      {/* Zoom In */}
      <TouchableOpacity 
        style={styles.controlButton} 
        onPress={onZoomIn}
        accessibilityLabel="Zoom in"
      >
        <Ionicons name="add" size={22} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      
      {/* Zoom Out */}
      <TouchableOpacity 
        style={styles.controlButton} 
        onPress={onZoomOut}
        accessibilityLabel="Zoom out"
      >
        <Ionicons name="remove" size={22} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      
      {/* Full-screen/expand - No margin on the last button */}
      <TouchableOpacity 
        style={[styles.controlButton, styles.lastButton]} 
        onPress={() => {
          // On mobile, this would use native APIs
          // For demo purposes, we're just providing the button
        }}
        accessibilityLabel="Toggle fullscreen"
      >
        <Ionicons name="expand" size={22} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

export default MapControls; 