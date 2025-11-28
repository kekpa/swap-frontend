// Created: Added useDocumentUpload hook for KYC document uploads - 2025-06-03
// Updated: Fixed document ID parsing from nested JSON response structure - 2025-01-08
// Updated: Added endpoint configuration for flexible upload endpoints (personal vs business KYC) - 2025-01-22
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
  documentUrl?: string;
  documentType?: string;
  documentSide?: string;
  fullDocumentData?: any;
  error?: string;
}

export interface UseDocumentUploadConfig {
  /**
   * API endpoint for document upload
   * @default API_PATHS.KYC.DOCUMENTS ('/kyc/documents')
   * @example '/kyc/business/documents' for business KYC
   */
  endpoint?: string;

  /**
   * Custom form data field name for document type
   * @default 'documentType'
   */
  documentTypeField?: string;

  /**
   * Custom form data field name for document side
   * @default 'documentSide'
   */
  documentSideField?: string;
}

export interface UseDocumentUploadReturn {
  uploading: boolean;
  uploadProgress: number;
  captureDocument: (documentType: DocumentType) => Promise<ImagePicker.ImagePickerResult>;
  uploadDocument: (documentType: DocumentType, imageUri: string, documentSide?: 'front' | 'back' | 'single') => Promise<DocumentUploadResult>;
  pickFromLibrary: (documentType: DocumentType) => Promise<ImagePicker.ImagePickerResult>;
}

export const useDocumentUpload = (config?: UseDocumentUploadConfig): UseDocumentUploadReturn => {
  // Default config values (backward compatible)
  const uploadEndpoint = config?.endpoint || API_PATHS.KYC.DOCUMENTS;
  const documentTypeField = config?.documentTypeField || 'documentType';
  const documentSideField = config?.documentSideField || 'documentSide';
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
        mediaTypes: ['images'],
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
        mediaTypes: ['images'],
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
      
      // Add document type and side (using configurable field names)
      formData.append(documentTypeField, documentType);
      formData.append(documentSideField, documentSide);

      setUploadProgress(50);

      logger.debug(`[useDocumentUpload] Uploading to ${uploadEndpoint}`);

      // Upload to backend using professional RESTful endpoint (configurable)
      const response = await apiClient.post(uploadEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setUploadProgress(100);
      
      logger.debug(`[useDocumentUpload] Upload successful:`, response.data);
      
      // Parse the JSON response from backend
      let documentData;
      if (typeof response.data === 'string') {
        // Backend sends JSON as string
        documentData = JSON.parse(response.data);
      } else {
        // Direct object response
        documentData = response.data;
      }
      
      return {
        success: true,
        documentId: documentData?.id || documentData?.documentId,
        documentUrl: documentData?.document_url,
        documentType: documentData?.document_type,
        documentSide: documentData?.document_side,
        fullDocumentData: documentData,
      };
      
    } catch (error: any) {
      logger.error('[useDocumentUpload] Upload failed:', error);

      // Professional error handling with user-friendly messages
      let errorMessage = 'Upload failed';

      if (error.response?.status) {
        switch (error.response.status) {
          case 404:
            errorMessage = 'Document upload service unavailable';
            break;
          case 413:
            errorMessage = 'File too large (max 10MB)';
            break;
          case 415:
            errorMessage = 'Invalid file type (JPG, PNG, PDF only)';
            break;
          case 400:
            errorMessage = 'Invalid document information';
            break;
          default:
            errorMessage = error.response?.data?.message || error.message || 'Upload failed';
        }
      } else {
        errorMessage = error.message || 'Network error occurred';
      }

      return {
        success: false,
        error: errorMessage,
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