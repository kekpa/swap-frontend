import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';

const BiometricSetup = () => {
  const navigation = useNavigation();
  const authContext = useAuthContext();

  const navigateToMainApp = () => {
    // Instead of reset navigation, use authContext to set authenticated state
    // This will trigger the conditional rendering in RootNavigator to show App screens
    if (authContext) {
      // Set authenticated to true which should cause the App navigator to show
      authContext.setIsAuthenticated(true);
    } else {
      // Fallback to simple navigation if no auth context
      navigation.navigate('App' as never);
    }
  };

  const handleEnableBiometrics = async () => {
    // Here you would implement the biometric authentication setup
    // This would typically involve checking if the device supports biometrics
    // and then requesting permission to use them

    // For this demo, we'll just navigate to the next screen after a brief delay
    setTimeout(() => {
      navigateToMainApp();
    }, 500);
  };

  const handleSkip = () => {
    // Skip biometric setup and go directly to App
    navigateToMainApp();
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
            name="scan-circle-outline" 
            size={140} 
            color="#8b14fd" 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            Instant and secure login with Face ID
          </Text>
          <Text style={styles.subtitle}>
            You can instantly and securely log in to your account using biometric data
          </Text>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleEnableBiometrics}
        >
          <Text style={styles.buttonText}>
            Enable
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipContainer}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>
            Skip
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
    paddingHorizontal: 20,
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

export default BiometricSetup; 