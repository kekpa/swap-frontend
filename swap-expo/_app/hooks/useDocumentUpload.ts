// Created: Added useDocumentUpload hook for KYC document uploads - 2025-06-03
// Updated: Fixed document ID parsing from nested JSON response structure - 2025-01-08
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import apiClient from '../_api/apiClient';
import { API_PATHS } from '../_api/apiPaths';
import logger from '../utils/logger';

export type DocumentType = 'passport' | 'national_id' | 'drivers_license';

export interface DocumentUploadResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

export interface UseDocumentUploadReturn {
  uploading: boolean;
  uploadProgress: number;
  captureDocument: (documentType: DocumentType) => Promise<ImagePicker.ImagePickerResult>;
  uploadDocument: (documentType: DocumentType, imageUri: string, documentSide?: 'front' | 'back' | 'single') => Promise<DocumentUploadResult>;
  pickFromLibrary: (documentType: DocumentType) => Promise<ImagePicker.ImagePickerResult>;
}

export const useDocumentUpload = (): UseDocumentUploadReturn => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const requestPermissions = useCallback(async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
        logger.warn('[useDocumentUpload] Camera or library permissions not granted');
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('[useDocumentUpload] Error requesting permissions:', error);
      return false;
    }
  }, []);

  const captureDocument = useCallback(async (documentType: DocumentType): Promise<ImagePicker.ImagePickerResult> => {
    try {
      logger.debug(`[useDocumentUpload] Capturing ${documentType} document`);
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        throw new Error('Camera permission required');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      logger.debug(`[useDocumentUpload] Camera result:`, JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      logger.error('[useDocumentUpload] Error capturing document:', error);
      throw error;
    }
  }, [requestPermissions]);

  const pickFromLibrary = useCallback(async (documentType: DocumentType): Promise<ImagePicker.ImagePickerResult> => {
    try {
      logger.debug(`[useDocumentUpload] Picking ${documentType} from library`);
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        throw new Error('Library permission required');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      logger.debug(`[useDocumentUpload] Library result:`, JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      logger.error('[useDocumentUpload] Error picking from library:', error);
      throw error;
    }
  }, [requestPermissions]);

  const uploadDocument = useCallback(async (
    documentType: DocumentType, 
    imageUri: string,
    documentSide: 'front' | 'back' | 'single' = 'single'
  ): Promise<DocumentUploadResult> => {
    try {
      setUploading(true);
      setUploadProgress(0);
      
      logger.debug(`[useDocumentUpload] Starting upload for ${documentType}`);
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      logger.debug(`[useDocumentUpload] File info:`, JSON.stringify(fileInfo, null, 2));
      setUploadProgress(25);

      // Create FormData for upload
      const formData = new FormData();
      
      // Add the file
      const filename = `${documentType}_${Date.now()}.jpg`;
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      } as any);
      
      // Add document type and side
      formData.append('documentType', documentType);
      formData.append('documentSide', documentSide);
      
      setUploadProgress(50);
      
      logger.debug(`[useDocumentUpload] Uploading to ${API_PATHS.KYC.UPLOAD}`);
      
      // Upload to backend
      const response = await apiClient.post(API_PATHS.KYC.UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setUploadProgress(100);
      
      logger.debug(`[useDocumentUpload] Upload successful:`, response.data);
      
      // Parse the nested JSON response from backend
      let documentData;
      if (typeof response.data.data === 'string') {
        // Backend sends nested JSON as string
        documentData = JSON.parse(response.data.data);
      } else {
        // Direct object response
        documentData = response.data.data || response.data;
      }
      
      return {
        success: true,
        documentId: documentData?.id || documentData?.documentId,
      };
      
    } catch (error: any) {
      logger.error('[useDocumentUpload] Upload failed:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Upload failed',
      };
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  return {
    uploading,
    uploadProgress,
    captureDocument,
    uploadDocument,
    pickFromLibrary,
  };
}; 