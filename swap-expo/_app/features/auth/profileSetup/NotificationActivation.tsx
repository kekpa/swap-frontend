import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';

const NotificationActivation = () => {
  const navigation = useNavigation();
  const authContext = useAuthContext();

  // Complete profile setup and let AppLockHandler show PIN setup
  const completeProfileSetup = () => {
    if (authContext) {
      // Setting authenticated will trigger AppLockHandler in App.tsx
      // which will show AppLockSetupScreen if PIN is not configured
      authContext.setIsAuthenticated(true);
    } else {
      navigation.navigate('App' as never);
    }
  };

  const handleEnableNotifications = () => {
    // Request notification permissions here
    // Then complete profile setup
    completeProfileSetup();
  };

  const handleSkip = () => {
    // Skip notifications and complete profile setup
    completeProfileSetup();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#64748B" />
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <View style={styles.featureImageContainer}>
          <Ionicons 
            name="notifications" 
            size={140} 
            color="#8b14fd" 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            Aktive notifikasyon yo
          </Text>
          <Text style={styles.subtitle}>
            Nou ka fè w konnen lè yon bagay enpòtan rive, tankou alèt sekirite oswa aktivite kont.
          </Text>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleEnableNotifications}
        >
          <Text style={styles.buttonText}>
            Wi, fè m konnen
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipContainer}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>
            Map fè sa pita
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureImageContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1A202C',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    color: '#64748B',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
  },
  primaryButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#8b14fd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  skipContainer: {
    padding: 8,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8b14fd',
  },
});

export default NotificationActivation; 