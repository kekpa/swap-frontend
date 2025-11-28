/**
 * useUploadModal Hook
 *
 * Handles UI state for document upload flow (upload sheet + camera).
 * Provides ready-to-use props for UploadOptionsSheet and CameraCapture components.
 *
 * This hook manages:
 * - Upload sheet visibility
 * - Camera visibility
 * - File selection handling
 * - Camera capture handling
 *
 * Usage:
 * ```typescript
 * const modal = useUploadModal({
 *   onFileSelected: (uri) => handleCapture(uri),
 *   mode: 'document',
 *   documentType: 'passport'
 * });
 *
 * <UploadOptionsSheet {...modal.sheetProps} />
 * {modal.showCamera && <CameraCapture {...modal.cameraProps} />}
 * ```
 */

import { useState, useCallback } from 'react';

export type UploadMode = 'document' | 'selfie';

export interface UseUploadModalConfig {
  /**
   * Callback when user selects a file (from camera, gallery, or file picker)
   */
  onFileSelected: (uri: string) => void;

  /**
   * Camera mode - determines camera UI behavior
   * @default 'document'
   */
  mode?: UploadMode;

  /**
   * Document type for camera overlay guidance
   * @example 'passport', 'national_id', 'business_registration'
   */
  documentType?: string;

  /**
   * Document side for dual-sided documents
   * @example 'front', 'back', 'single'
   */
  documentSide?: 'front' | 'back' | 'single';

  /**
   * Title for upload options sheet
   * @default 'Upload Document'
   */
  sheetTitle?: string;

  /**
   * Allowed file types for upload
   * @default 'all'
   */
  allowedTypes?: 'images' | 'documents' | 'all';
}

export interface UseUploadModalReturn {
  /**
   * Whether camera is currently visible
   */
  showCamera: boolean;

  /**
   * Whether upload sheet is currently visible
   */
  showUploadSheet: boolean;

  /**
   * Open the upload options sheet
   */
  openUploadSheet: () => void;

  /**
   * Close the upload options sheet
   */
  closeUploadSheet: () => void;

  /**
   * Open the camera
   */
  openCamera: () => void;

  /**
   * Close the camera
   */
  closeCamera: () => void;

  /**
   * Reset all state (close everything)
   */
  reset: () => void;

  /**
   * Props ready to spread on UploadOptionsSheet component
   */
  sheetProps: {
    visible: boolean;
    onClose: () => void;
    onFileSelected: (file: any) => void;
    onCameraTap: () => void;
    title: string;
    allowedTypes: 'images' | 'documents' | 'all';
  };

  /**
   * Props ready to spread on CameraCapture component
   */
  cameraProps: {
    mode: UploadMode;
    documentType?: string;
    documentSide?: 'front' | 'back' | 'single';
    onCapture: (uri: string) => void;
    onCancel: () => void;
  };
}

/**
 * Hook for managing upload modal and camera UI state
 */
export const useUploadModal = (config: UseUploadModalConfig): UseUploadModalReturn => {
  const {
    onFileSelected,
    mode = 'document',
    documentType,
    documentSide = 'single',
    sheetTitle = 'Upload Document',
    allowedTypes = 'all',
  } = config;

  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Open upload options sheet
  const openUploadSheet = useCallback(() => {
    setShowUploadSheet(true);
  }, []);

  // Close upload options sheet
  const closeUploadSheet = useCallback(() => {
    setShowUploadSheet(false);
  }, []);

  // Open camera
  const openCamera = useCallback(() => {
    setShowCamera(true);
  }, []);

  // Close camera
  const closeCamera = useCallback(() => {
    setShowCamera(false);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setShowUploadSheet(false);
    setShowCamera(false);
  }, []);

  // Handle file selected from upload sheet (gallery or file picker)
  const handleFileSelected = useCallback((file: any) => {
    const uri = file.uri;
    onFileSelected(uri);
    // Sheet will close via UploadOptionsSheet's internal logic
  }, [onFileSelected]);

  // Handle camera tap from upload sheet
  const handleCameraTap = useCallback(() => {
    closeUploadSheet();
    openCamera();
  }, [closeUploadSheet, openCamera]);

  // Handle camera capture
  const handleCameraCapture = useCallback((uri: string) => {
    closeCamera();
    onFileSelected(uri);
  }, [closeCamera, onFileSelected]);

  // Handle camera cancel
  const handleCameraCancel = useCallback(() => {
    closeCamera();
  }, [closeCamera]);

  // Ready-to-use props for UploadOptionsSheet
  const sheetProps = {
    visible: showUploadSheet,
    onClose: closeUploadSheet,
    onFileSelected: handleFileSelected,
    onCameraTap: handleCameraTap,
    title: sheetTitle,
    allowedTypes,
  };

  // Ready-to-use props for CameraCapture
  const cameraProps = {
    mode,
    documentType,
    documentSide,
    onCapture: handleCameraCapture,
    onCancel: handleCameraCancel,
  };

  return {
    showCamera,
    showUploadSheet,
    openUploadSheet,
    closeUploadSheet,
    openCamera,
    closeCamera,
    reset,
    sheetProps,
    cameraProps,
  };
};

export default useUploadModal;
