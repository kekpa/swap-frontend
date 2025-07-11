import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { networkService } from '../services/NetworkService';

interface OfflineIndicatorProps {
  style?: any;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ style }) => {
  const { theme } = useTheme();
  const [isOffline, setIsOffline] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-50)); // Start off-screen

  useEffect(() => {
    // Get initial network state
    const initialState = networkService.getNetworkState();
    setIsOffline(initialState.isOfflineMode);

    // Listen for network state changes
    const unsubscribe = networkService.onNetworkStateChange((state) => {
      setIsOffline(state.isOfflineMode);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isOffline) {
      // Slide down when going offline
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide up when coming back online
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOffline, slideAnim]);

  if (!isOffline) {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FF6B35',
      paddingVertical: 8,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    icon: {
      marginRight: 8,
    },
    text: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <Ionicons name="wifi-outline" size={16} color="#FFFFFF" style={styles.icon} />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
};

export default OfflineIndicator; 