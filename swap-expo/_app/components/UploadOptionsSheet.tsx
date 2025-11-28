/**
 * UploadOptionsSheet Component
 *
 * Professional bottom sheet for document/photo upload options.
 * Provides consistent UX across all KYC flows with camera, gallery, and file picker options.
 */

import React, { useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../theme/ThemeContext';

interface UploadOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onFileSelected: (file: any) => void;
  onCameraTap?: () => void;
  title?: string;
  allowedTypes?: 'images' | 'documents' | 'all';
}

const UploadOptionsSheet: React.FC<UploadOptionsSheetProps> = ({
  visible,
  onClose,
  onFileSelected,
  onCameraTap,
  title = 'Upload Document',
  allowedTypes = 'all',
}) => {
  const { theme } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Queue actions to execute after close animation completes (using ref for synchronous updates)
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Calculate snap index based on visible prop
  const snapIndex = useMemo(() => (visible ? 0 : -1), [visible]);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleCameraCapture = async () => {
    // If parent provides camera handler, use CameraCapture component
    if (onCameraTap) {
      pendingActionRef.current = onCameraTap;
      bottomSheetRef.current?.close(); // Triggers smooth close animation
      return;
    }

    // Otherwise, use native ImagePicker (backward compatible)
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required to take photos.');
        return;
      }

      // Queue the ImagePicker action
      pendingActionRef.current = async () => {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled) {
          onFileSelected(result.assets[0]);
        }
      };

      bottomSheetRef.current?.close(); // Triggers smooth close animation
    } catch (error) {
      console.error('[UploadOptionsSheet] Camera capture failed:', error);
      Alert.alert('Error', 'Unable to access camera. Please try again.');
    }
  };

  const handleGalleryPick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Photo library access is required to choose photos.');
        return;
      }

      // Queue the gallery picker action
      pendingActionRef.current = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled) {
          onFileSelected(result.assets[0]);
        }
      };

      bottomSheetRef.current?.close(); // Triggers smooth close animation
    } catch (error) {
      console.error('[UploadOptionsSheet] Gallery pick failed:', error);
      Alert.alert('Error', 'Unable to access photo library. Please try again.');
    }
  };

  const handleFilePick = async () => {
    try {
      // Queue the file picker action
      pendingActionRef.current = async () => {
        const result = await DocumentPicker.getDocumentAsync({
          type: allowedTypes === 'images' ? ['image/*'] : ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });

        if (!result.canceled) {
          onFileSelected(result.assets[0]);
        }
      };

      bottomSheetRef.current?.close(); // Triggers smooth close animation
    } catch (error) {
      console.error('[UploadOptionsSheet] File pick failed:', error);
      Alert.alert('Error', 'Unable to select file. Please try again.');
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.card,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.xl,
        },
        optionButton: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md + 2,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        lastOptionButton: {
          borderBottomWidth: 0,
        },
        optionIcon: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.primaryOpacity10,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: theme.spacing.md,
        },
        optionText: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: '500',
          color: theme.colors.textPrimary,
          flex: 1,
        },
      }),
    [theme]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={snapIndex}
      snapPoints={['45%']}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      onChange={(index) => {
        if (index === -1) {
          // Sheet has finished closing animation
          onClose();

          // Execute queued action (if any)
          if (pendingActionRef.current) {
            pendingActionRef.current();
            pendingActionRef.current = null;
          }
        }
      }}
    >
      <BottomSheetView style={styles.container}>
        {/* Camera Option */}
        <TouchableOpacity style={styles.optionButton} onPress={handleCameraCapture}>
          <View style={styles.optionIcon}>
            <Ionicons name="camera" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.optionText}>Take Photo</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Gallery Option */}
        <TouchableOpacity style={styles.optionButton} onPress={handleGalleryPick}>
          <View style={styles.optionIcon}>
            <Ionicons name="images" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.optionText}>Choose from Photos</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* File Browser Option */}
        <TouchableOpacity style={[styles.optionButton, styles.lastOptionButton]} onPress={handleFilePick}>
          <View style={styles.optionIcon}>
            <Ionicons name="document" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.optionText}>Browse Files</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default UploadOptionsSheet;
