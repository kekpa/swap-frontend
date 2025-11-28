// Created: Added TakeSelfie component for KYC verification - 2025-03-22
// Updated: Refactored to use global theme system - YYYY-MM-DD
// Updated: Removed ScrollView for fixed layout - 2025-06-03
// Updated: Fixed camera access to use expo-image-picker instead of placeholder image - 2025-06-07
// Updated: Complete redesign with manual camera activation, face guidance overlay, and professional KYC UX - 2025-06-07
// Updated: Integrated with backend API to mark selfie completion in KYC process - 2025-06-07
// Updated: Refactored to use unified CameraCapture component for both document and selfie capture - 2025-01-08
// Updated: Added context-aware navigation for better UX when updating vs first-time KYC - 2025-01-26
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../navigation/profileNavigator';
import { useTheme } from '../../../theme/ThemeContext';
import { Theme } from '../../../theme/theme';
import CameraCapture from '../../../components2/CameraCapture';
import apiClient from '../../../_api/apiClient';
import { invalidateQueries } from '../../../tanstack-query/queryClient';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;
type TakeSelfieRouteProp = RouteProp<ProfileStackParamList, 'TakeSelfie'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Define the states of the selfie verification flow
type SelfieState = 'initial' | 'camera' | 'review' | 'processing';

const TakeSelfieScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TakeSelfieRouteProp>();
  const { theme } = useTheme();

  const [selfieState, setSelfieState] = useState<SelfieState>('initial');
  const [selfieUri, setSelfieUri] = useState<string | null>(null);

  // Extract navigation context from route params
  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  console.log(`[TakeSelfieScreen] Navigation context: returnToTimeline=${returnToTimeline}, sourceRoute=${sourceRoute}`);

  const handleBack = () => {
    if (selfieState === 'camera') {
      setSelfieState('initial');
    } else if (selfieState === 'review') {
      setSelfieState('initial');
      setSelfieUri(null);
    } else if (selfieState === 'processing') {
      setSelfieState('review');
    } else {
      // Always return to timeline when in KYC flow
      if (returnToTimeline) {
        console.log(`[TakeSelfieScreen] Returning to VerifyYourIdentity timeline`);
        navigation.navigate('VerifyYourIdentity', sourceRoute ? { sourceRoute } : undefined);
      } else {
        // Default back behavior for non-KYC usage
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
          navigation.navigate('VerifyYourIdentity', sourceRoute ? { sourceRoute } : undefined);
        }
      }
    }
  };

  const handleOpenCamera = () => {
    setSelfieState('camera');
  };

  const handleCameraCapture = (uri: string) => {
    setSelfieUri(uri);
    setSelfieState('review');
  };

  const handleCameraCancel = () => {
    setSelfieState('initial');
  };

  const handleContinue = async () => {
    if (selfieState === 'review' && selfieUri) {
      setSelfieState('processing');

      console.log(`[TakeSelfieScreen] 🚀 Starting selfie upload and completion...`);

      try {
        // Convert URI to FormData for upload
        const formData = new FormData();
        formData.append('file', {
          uri: selfieUri,
          type: 'image/jpeg',
          name: 'selfie.jpg',
        } as any);

        // Upload selfie using the new clean endpoint
        const response = await apiClient.post('/kyc/selfie', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log(`[TakeSelfieScreen] ✅ Selfie upload successful!`);

        // PROFESSIONAL: Invalidate KYC cache for instant UI update (same pattern as UploadIdScreen)
        console.log('[TakeSelfieScreen] 🔄 Triggering cache invalidation for selfie upload');

        invalidateQueries(['kyc']);       // Primary KYC cache
        invalidateQueries(['profile']);   // Profile cache

        console.log('[TakeSelfieScreen] ✅ Cache invalidation completed');

        // Show success alert
        Alert.alert(
          'Success',
          'Selfie verification completed successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to timeline
                if (returnToTimeline) {
                  navigation.navigate('VerifyYourIdentity', sourceRoute ? { sourceRoute } : undefined);
                } else {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('VerifyYourIdentity');
                  }
                }
              }
            }
          ]
        );
      } catch (error) {
        console.log(`[TakeSelfieScreen] ❌ Selfie upload failed:`, error);
        Alert.alert(
          'Error',
          'Failed to upload selfie. Please try again.',
          [
            {
              text: 'Retry',
              onPress: () => handleContinue()
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setSelfieState('review')
            }
          ]
        );
      }
    }
  };

  const handleRetake = () => {
    setSelfieState('camera');
    setSelfieUri(null);
  };

  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      zIndex: 100,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    
    // Initial screen styles
    initialContainer: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    initialTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    initialSubtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
      lineHeight: 22,
    },
    previewArea: {
      width: '100%',
      height: 350,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
    },
    previewText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    openCameraButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    openCameraButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
    guidelines: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
    },
    guidelinesTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    guidelineItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    guidelineText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.sm,
      flex: 1,
    },

    // Camera screen styles
    cameraContainer: {
      flex: 1,
      backgroundColor: '#000',
    },
    camera: {
      flex: 1,
    },
    cameraOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    faceGuidanceContainer: {
      position: 'relative',
      width: screenWidth * 0.75,
      height: screenWidth * 0.95,
      justifyContent: 'center',
      alignItems: 'center',
    },
    faceOutline: {
      width: '100%',
      height: '100%',
      borderWidth: 4,
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderRadius: screenWidth * 0.375,
      position: 'absolute',
    },
    faceInstructions: {
      position: 'absolute',
      top: -60,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    instructionText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    cameraControls: {
      position: 'absolute',
      bottom: 50,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    controlButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: 'white',
    },
    capturingButton: {
      backgroundColor: theme.colors.success || theme.colors.primary,
    },

    // Review screen styles
    reviewContainer: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    reviewTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    reviewSubtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
    },
    selfiePreview: {
      width: '100%',
      height: 350,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.inputBackground,
    },
    selfieImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    reviewActions: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: theme.spacing.lg,
    },
    retakeButton: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    retakeButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
    },
    continueButton: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    continueButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.white,
    },
    reviewInfo: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },

    // Processing screen styles
    processingContainer: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl * 2,
    },
    spinner: {
      width: 80,
      height: 80,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    processingTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    processingSubtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl * 2,
      lineHeight: 20,
    },
  }), [theme, screenWidth]);



  // Render the appropriate screen based on the current state
  const renderContent = () => {
    switch (selfieState) {
      case 'initial':
        return (
          <View style={styles.initialContainer}>
            <Text style={styles.initialTitle}>Take a selfie</Text>
            <Text style={styles.initialSubtitle}>
              Make sure your features are clearly visible with good lighting.
            </Text>

            <TouchableOpacity style={styles.previewArea} onPress={handleOpenCamera}>
              <Ionicons name="camera" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.previewText}>
                Tap to start camera
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.openCameraButton} onPress={handleOpenCamera}>
              <Ionicons name="camera" size={24} color={theme.colors.white} />
              <Text style={styles.openCameraButtonText}>Open Camera</Text>
            </TouchableOpacity>
          </View>
        );

      case 'camera':
        return (
          <CameraCapture
            mode="selfie"
            onCapture={handleCameraCapture}
            onCancel={handleCameraCancel}
          />
        );

      case 'review':
        return (
          <View style={styles.reviewContainer}>
            <Text style={styles.reviewTitle}>Review your selfie</Text>
            <Text style={styles.reviewSubtitle}>
              Make sure your face is clearly visible and well-lit.
            </Text>

            <View style={styles.selfiePreview}>
              {selfieUri && (
                <Image
                  source={{ uri: selfieUri }}
                  style={styles.selfieImage}
                  contentFit="cover"
                  transition={200}
                />
              )}
            </View>

            <View style={styles.reviewActions}>
              <TouchableOpacity 
                style={styles.retakeButton} 
                onPress={handleRetake}
              >
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.continueButton} 
                onPress={handleContinue}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.reviewInfo}>
              Your selfie will be compared with your ID document to verify your identity.
              This helps us maintain security and comply with regulations.
            </Text>
          </View>
        );

      case 'processing':
        return (
          <View style={styles.processingContainer}>
            <View style={styles.spinner}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
            
            <Text style={styles.processingTitle}>Verifying your identity</Text>
            
            <Text style={styles.processingSubtitle}>
              We're comparing your selfie with your ID document.
              This usually takes less than a minute.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        hidden={selfieState === 'camera'}
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
      />
      
      {selfieState === 'camera' ? (
        // Full screen camera - no header needed, CameraCapture handles everything
        renderContent()
      ) : (
        <>
          {/* Header for non-camera states */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selfieState === 'initial' ? 'Take Selfie' : 
               selfieState === 'review' ? 'Review Selfie' : 'Verifying Identity'}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          {renderContent()}
        </>
      )}
    </SafeAreaView>
  );
};

export default TakeSelfieScreen; 