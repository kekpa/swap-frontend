// Created: Added unified CameraCapture component for both document and selfie capture - 2025-01-08
// Updated: Improved UI layout with better spacing, fixed text positioning, and resolved icon warnings - 2025-01-08
// Updated: Removed custom permission UI to use native iOS/Android permission dialogs - 2025-01-26
import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../theme/ThemeContext';
import { DocumentType } from '../hooks-actions/useDocumentUpload';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type CaptureMode = 'document' | 'selfie';

interface CameraCaptureProps {
  mode: CaptureMode;
  documentType?: DocumentType;
  documentSide?: 'front' | 'back' | 'single';
  onCapture: (uri: string) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  mode,
  documentType,
  documentSide,
  onCapture,
  onCancel,
}) => {
  const { theme } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>(mode === 'selfie' ? 'front' : 'back');
  const [isCapturing, setIsCapturing] = useState(false);

  // Get display text based on mode
  const getDisplayInfo = () => {
    if (mode === 'selfie') {
      return {
        title: 'Position your face within the oval',
        guidelines: [
          'Face clearly visible',
          'Good lighting',
          'Look directly at camera'
        ]
      };
    }

    // Document mode
    const docTypeText = documentType === 'passport' ? 'passport' : 
                        documentType === 'national_id' ? 'national ID' : 'driver\'s license';
    
    const sideText = documentSide === 'single' ? docTypeText : `${docTypeText} ${documentSide} side`;
    
    return {
      title: `Position your ${sideText} within the rectangle`,
      guidelines: [
        'Document fully visible',
        'No glare or shadows', 
        'All text readable'
      ]
    };
  };

  const displayInfo = getDisplayInfo();

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (photo) {
        onCapture(photo.uri);
      }
    } catch (error) {
      console.error(`Error taking ${mode} photo:`, error);
      Alert.alert(
        'Camera Error',
        'There was an error taking the photo. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraType = () => {
    setFacing((current: CameraType) => 
      current === 'back' ? 'front' : 'back'
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
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
    // Document capture overlay
    documentGuidanceContainer: {
      position: 'relative',
      width: screenWidth * 0.85,
      height: screenWidth * 0.65, // Document aspect ratio (roughly 4:3)
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: -80, // Move the rectangle up
    },
    documentOutline: {
      width: '100%',
      height: '100%',
      borderWidth: 4,
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderRadius: 12,
      position: 'absolute',
    },
    // Selfie capture overlay
    faceGuidanceContainer: {
      position: 'relative',
      width: screenWidth * 0.7,
      height: screenWidth * 1, // Made even taller for better face positioning
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: -80, // Move the oval up
    },
    faceOutline: {
      width: '100%',
      height: '100%',
      borderWidth: 4,
      borderColor: 'rgba(255, 255, 255, 0.8)',
      borderRadius: screenWidth * 0.35, // Oval shape
      position: 'absolute',
    },
    // Top instructions - properly centered
    topInstructions: {
      position: 'absolute',
      top: 120,
      left: 20,
      right: 20,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    instructionText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 25,
      maxWidth: screenWidth * 0.85,
      alignSelf: 'center',
    },
    // Bottom guidelines - positioned completely below capture areas
    bottomGuidelines: {
      position: 'absolute',
      bottom: 180, // Positioned above camera controls but below capture areas
      left: 20,
      right: 20,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    guidelineContainer: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      maxWidth: screenWidth * 0.8,
    },
    guidelineText: {
      color: 'rgba(255, 255, 255, 0.95)',
      fontSize: 12,
      textAlign: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 2,
      minWidth: 120,
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
    backButton: {
      position: 'absolute',
      top: 50, // Moved slightly up for better spacing
      left: 20,
      zIndex: 200,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0, 0, 0, 0.7)', // Slightly more opaque for better visibility
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      color: 'white',
      fontSize: 16,
      textAlign: 'center',
      marginTop: 20,
    },
  }), [theme, screenWidth]);

  // Show loading while requesting permission
  if (permission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            Checking camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // If permission was denied, show option to request again
  if (!permission.granted) {
    const handleRequestPermission = async () => {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is needed to capture photos. Please enable camera permission in your device settings.',
          [
            { text: 'Cancel', onPress: onCancel },
            { text: 'Try Again', onPress: handleRequestPermission }
          ]
        );
      }
    };

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingContainer}>
          <Ionicons name="videocam-off" size={64} color="rgba(255, 255, 255, 0.6)" />
          <Text style={styles.loadingText}>
            Camera permission is required to continue
          </Text>
          <View style={{ flexDirection: 'row', gap: 15, marginTop: 30 }}>
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}
              onPress={onCancel}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
          <TouchableOpacity 
              style={[styles.captureButton, { width: 120, borderRadius: 20 }]}
              onPress={handleRequestPermission}
          >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                Allow Camera
              </Text>
          </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={onCancel}>
        <Ionicons name="chevron-back" size={24} color="white" />
      </TouchableOpacity>

      {/* Top instructions - positioned outside capture area */}
      <View style={styles.topInstructions}>
        <Text style={styles.instructionText}>
          {displayInfo.title}
        </Text>
      </View>

      {/* Camera view */}
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
      />
      
      {/* Camera overlay with capture guidance */}
      <View style={styles.cameraOverlay}>
        {mode === 'document' ? (
          <View style={styles.documentGuidanceContainer}>
            <View style={styles.documentOutline} />
          </View>
        ) : (
          <View style={styles.faceGuidanceContainer}>
            <View style={styles.faceOutline} />
          </View>
        )}
      </View>

      {/* Bottom guidelines - positioned completely below capture areas */}
      <View style={[
        styles.bottomGuidelines,
        mode === 'selfie' && { bottom: 160 } // Moved further down to be below the taller oval
      ]}>
        <View style={styles.guidelineContainer}>
          {displayInfo.guidelines.map((guideline, index) => (
            <Text key={index} style={styles.guidelineText}>
              • {guideline}
            </Text>
          ))}
        </View>
      </View>

      {/* Camera controls */}
      <View style={styles.cameraControls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
          <Ionicons name="camera-reverse" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.captureButton, isCapturing && styles.capturingButton]} 
          onPress={handleCapture}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator size="large" color="white" />
          ) : (
            <Ionicons name="camera" size={32} color="white" />
          )}
        </TouchableOpacity>
        
        <View style={[styles.controlButton, { opacity: 0 }]} />
      </View>
    </SafeAreaView>
  );
};

export default CameraCapture; 