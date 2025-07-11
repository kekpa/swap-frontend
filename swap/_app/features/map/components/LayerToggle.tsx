// Updated: Repositioned LayerToggle back to bottom right - 2023-06-27
// Updated: Improved LayerToggle position for simplified mobile UI - 2024-06-27
// Updated: Simplified to icon-only design for mobile - 2024-06-27
// Updated: Direct toggle without modal for mobile - 2024-06-27
// Updated: Integrated theme system for consistent styling - 2024-12-30

import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { MapLayerType } from '../../../constants/mapConstants';

interface LayerToggleProps {
  currentLayer: 'standard' | 'satellite';
  onToggle: (type: 'standard' | 'satellite') => void;
  style?: any;
}

const LayerToggle: React.FC<LayerToggleProps> = ({ 
  currentLayer, 
  onToggle,
  style 
}) => {
  const { theme } = useTheme();
  
  // Check if device is a tablet/mobile
  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;
  
  // Create themed styles
  const styles = useMemo(() => StyleSheet.create({
    container: {
      position: 'absolute',
      zIndex: 10,
    },
    desktopPosition: {
      right: 76,
      bottom: theme.spacing.md,
    },
    mobileButton: {
      position: 'absolute',
      right: theme.spacing.md,
      bottom: 96,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 20,
      // Apply theme-based shadows
      ...theme.shadows.medium,
      // Add subtle border for definition
      borderWidth: Platform.OS === 'ios' ? 0.5 : 0,
      borderColor: theme.colors.border,
    },
    toggleContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      // Apply theme-based shadows
      ...theme.shadows.medium,
      // Add subtle border for definition
      borderWidth: Platform.OS === 'ios' ? 0.5 : 0,
      borderColor: theme.colors.border,
    },
    option: {
      marginVertical: theme.spacing.xs,
      paddingVertical: 2,
    },
    radioContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    radioOuter: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: theme.colors.grayLight,
      marginRight: theme.spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioOuterSelected: {
      borderColor: theme.colors.primary,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    selectedLabel: {
      color: theme.colors.textPrimary,
      fontWeight: '600',
    }
  }), [theme]);
  
  // For mobile, render a simple icon button that toggles directly
  if (isMobile) {
    const handlePress = () => {
      // Toggle to the opposite layer type
      if (currentLayer === MapLayerType.STANDARD) {
        onToggle(MapLayerType.SATELLITE);
      } else {
        onToggle(MapLayerType.STANDARD);
      }
    };
    
    return (
      <TouchableOpacity 
        style={[styles.mobileButton, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={currentLayer === MapLayerType.STANDARD ? "map-outline" : "map"}
          size={24} 
          color={theme.colors.textSecondary} 
        />
      </TouchableOpacity>
    );
  }
  
  // For desktop, keep the original design
  return (
    <View style={[
      styles.container, 
      styles.desktopPosition,
      style
    ]}>
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={styles.option}
          onPress={() => onToggle(MapLayerType.STANDARD)}
          accessibilityLabel="Standard map layer"
        >
          <View style={styles.radioContainer}>
            <View style={[
              styles.radioOuter,
              currentLayer === MapLayerType.STANDARD && styles.radioOuterSelected
            ]}>
              {currentLayer === MapLayerType.STANDARD && (
                <View style={styles.radioInner} />
              )}
            </View>
            <Text style={[
              styles.label,
              currentLayer === MapLayerType.STANDARD && styles.selectedLabel
            ]}>Standard</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.option}
          onPress={() => onToggle(MapLayerType.SATELLITE)}
          accessibilityLabel="Satellite map layer"
        >
          <View style={styles.radioContainer}>
            <View style={[
              styles.radioOuter,
              currentLayer === MapLayerType.SATELLITE && styles.radioOuterSelected
            ]}>
              {currentLayer === MapLayerType.SATELLITE && (
                <View style={styles.radioInner} />
              )}
            </View>
            <Text style={[
              styles.label,
              currentLayer === MapLayerType.SATELLITE && styles.selectedLabel
            ]}>Satellite</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default React.memo(LayerToggle); 