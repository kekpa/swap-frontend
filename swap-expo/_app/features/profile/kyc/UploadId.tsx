// Created: Added UploadId component for KYC document upload - 2025-06-03
// Updated: Added document status pre-population to show which documents have already been uploaded with status indicators - 2025-06-07
// Updated: Implemented active document logic - only shows checkmark for most recent upload, allows easy switching between document types - 2025-06-07
// Updated: Implemented front/back document capture for proper KYC verification - 2025-01-08
// Updated: Restored preview functionality for previously uploaded documents with Continue/Re-upload options - 2025-01-08
// Updated: Fixed dual image upload - now properly uploads both front and back images for national_id and drivers_license - 2025-01-08
// Updated: Enhanced preview to show BOTH front and back images for dual-sided documents with proper side labels - 2025-01-08
// Updated: Replaced DocumentCamera with unified CameraCapture component that works for both documents and selfies - 2025-01-08
// Updated: Added context-aware navigation for better UX when updating vs first-time KYC - 2025-01-26
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../navigation/profileNavigator';
import { useTheme } from '../../../theme/ThemeContext';
import { Theme } from '../../../theme/theme';
import { useDocumentUpload, DocumentType } from '../../../hooks-actions/useDocumentUpload';
import { invalidateQueries } from '../../../tanstack-query/queryClient';
import { useKycStatus } from '../../../hooks-data/useKycQuery';
import CameraCapture from '../../../components2/CameraCapture';
import logger from '../../../utils/logger';
import UploadOptionsSheet from '../../../components/UploadOptionsSheet';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;
// type UploadIdRouteProp = RouteProp<ProfileStackParamList, 'UploadId'>; // For typed route params

// Define the states of the ID verification flow
type UploadIdState = 'select_type' | 'upload_front' | 'upload_back' | 'review' | 'camera';

// Define which side of document is being captured
type DocumentSide = 'front' | 'back';

const UploadIdScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'UploadId'>>();
  const { theme } = useTheme();
  
  // Extract navigation context from route params
  const sourceRoute = route.params?.sourceRoute;
  const returnToTimeline = route.params?.returnToTimeline;

  console.log(`[UploadIdScreen] Mounted/Focused. sourceRoute: ${sourceRoute}, returnToTimeline: ${returnToTimeline}`);

  const [uploadState, setUploadState] = useState<UploadIdState>('select_type');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [frontImageUri, setFrontImageUri] = useState<string | null>(null);
  const [backImageUri, setBackImageUri] = useState<string | null>(null);
  const [currentSide, setCurrentSide] = useState<DocumentSide>('front');
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [forceReupload, setForceReupload] = useState<boolean>(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  // Enterprise-grade image loading states (expo-image)
  const [frontImageLoading, setFrontImageLoading] = useState(false);
  const [backImageLoading, setBackImageLoading] = useState(false);
  const [frontImageError, setFrontImageError] = useState(false);
  const [backImageError, setBackImageError] = useState(false);

  const { uploading, uploadProgress, captureDocument, uploadDocument, pickFromLibrary } = useDocumentUpload();
  const { data: kycStatus, isLoading: kycLoading } = useKycStatus();

  // Helper function to determine if document needs both sides
  const needsBothSides = (docType: DocumentType): boolean => {
    return docType === 'drivers_license' || docType === 'national_id';
  };

  // Helper function to get document status with active document logic
  const getDocumentStatus = (docType: DocumentType) => {
    if (!kycStatus) return { status: 'not_submitted', isUploaded: false, isActive: false };

    // Check if document is uploaded based on documents array
    const isUploaded = kycStatus.documents && kycStatus.documents.some(doc => doc.document_type === docType);
    const isActive = kycStatus.active_document_type === docType; // Check if this is the active document
    
    return {
      status: isUploaded ? 'submitted' : 'not_submitted',
      isUploaded,
      isActive,
      submittedAt: isUploaded ? new Date().toISOString() : undefined
    };
  };

  // Helper function to get the active document type
  const getActiveDocumentType = (): DocumentType | null => {
    if (!kycStatus || !kycStatus.active_document_type) return null;

    // Validate that the active document type is a valid DocumentType
    const validTypes: DocumentType[] = ['passport', 'drivers_license', 'national_id'];
    const activeType = kycStatus.active_document_type;

    if (validTypes.includes(activeType as DocumentType)) {
      return activeType as DocumentType;
    }

    return null;
  };

  // Effect to pre-select the active document type AND auto-navigate to preview (enterprise UX)
  useEffect(() => {
    if (!kycLoading && kycStatus && uploadState === 'select_type' && !selectedDocType) {
      // Pre-select the active document if one exists
      const activeDocType = getActiveDocumentType();

      if (activeDocType) {
        const documentStatus = getDocumentStatus(activeDocType);

        setSelectedDocType(activeDocType as DocumentType);
        console.log(`[UploadIdScreen] Pre-selected active document: ${activeDocType}`);

        // Enterprise UX: Auto-navigate to preview if document already uploaded
        // This provides instant preview like Google/Stripe/Banking apps
        if (documentStatus.isUploaded) {
          setUploadState('upload_front');
          console.log(`[UploadIdScreen] Auto-navigating to preview (document already uploaded)`);
        }
      } else {
        // If no active document, don't pre-select anything (let user choose)
        console.log('[UploadIdScreen] No active document found, user can choose any document type');
      }
    }
  }, [kycLoading, kycStatus, uploadState, selectedDocType]);

  const handleBack = () => {
    console.log(`[UploadIdScreen] handleBack called. Current uploadState: ${uploadState}, returnToTimeline: ${returnToTimeline}, sourceRoute: ${sourceRoute}`);
    if (uploadState === 'camera') {
      handleCameraCancel();
    } else if (uploadState === 'upload_front') {
      setUploadState('select_type');
      setFrontImageUri(null);
      setBackImageUri(null);
      setCurrentSide('front');
      setForceReupload(false);
    } else if (uploadState === 'upload_back') {
      setUploadState('upload_front');
      setBackImageUri(null);
      setCurrentSide('front');
    } else if (uploadState === 'review') {
      if (needsBothSides(selectedDocType!) && backImageUri) {
        setUploadState('upload_back');
        setCurrentSide('back');
      } else {
        setUploadState('upload_front');
        setCurrentSide('front');
      }
    } else {
      // Always return to timeline when in KYC flow
      if (returnToTimeline) {
        console.log(`[UploadIdScreen] Returning to VerifyYourIdentity timeline`);
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

  const handleSelectDocType = (docType: DocumentType) => {
    setSelectedDocType(docType);
    setForceReupload(false);
    setCurrentSide('front');
    setFrontImageUri(null);
    setBackImageUri(null);
    setUploadState('upload_front');
  };

  const handleTakePhoto = async () => {
    if (!selectedDocType) return;
    
    logger.debug(`[UploadIdScreen] Opening custom camera for ${selectedDocType} ${currentSide}`);
    setUploadState('camera');
  };

  const handleCameraCapture = (imageUri: string) => {
    logger.debug(`[UploadIdScreen] ${currentSide} photo captured: ${imageUri}`);
    
    if (currentSide === 'front') {
      setFrontImageUri(imageUri);
      // If document needs both sides, go to back capture
      if (needsBothSides(selectedDocType!)) {
        setCurrentSide('back');
        setUploadState('upload_back');
      } else {
        // Single-sided document, go to review
        setUploadState('review');
      }
    } else {
      // Capturing back side
      setBackImageUri(imageUri);
      setUploadState('review');
    }
  };

  const handleCameraCancel = () => {
    logger.debug(`[UploadIdScreen] Camera cancelled`);
    // Go back to the appropriate upload state
    if (currentSide === 'front') {
      setUploadState('upload_front');
    } else {
      setUploadState('upload_back');
    }
  };

  const handlePickFromLibrary = async () => {
    if (!selectedDocType) return;

    try {
      logger.debug(`[UploadIdScreen] Picking from library for ${selectedDocType} ${currentSide}`);

      const result = await pickFromLibrary(selectedDocType);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;

        if (currentSide === 'front') {
          setFrontImageUri(imageUri);
          // If document needs both sides, go to back capture
          if (needsBothSides(selectedDocType)) {
            setCurrentSide('back');
            setUploadState('upload_back');
          } else {
            // Single-sided document, go to review
            setUploadState('review');
          }
        } else {
          // Capturing back side
          setBackImageUri(imageUri);
    setUploadState('review');
        }

        logger.debug(`[UploadIdScreen] ${currentSide} photo selected: ${imageUri}`);
      }
    } catch (error) {
      logger.error('[UploadIdScreen] Error picking from library:', error);
      Alert.alert(
        'Library Error',
        'Failed to pick photo from library. Please make sure library permissions are granted.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleOpenUploadSheet = () => {
    if (!selectedDocType) return;
    setShowUploadSheet(true);
  };

  const handleFileSelected = async (file: any) => {
    if (!selectedDocType) return;

    try {
      const imageUri = file.uri;
      logger.debug(`[UploadIdScreen] File selected for ${selectedDocType} ${currentSide}: ${imageUri}`);

      if (currentSide === 'front') {
        setFrontImageUri(imageUri);
        // If document needs both sides, go to back capture
        if (needsBothSides(selectedDocType)) {
          setCurrentSide('back');
          setUploadState('upload_back');
        } else {
          // Single-sided document, go to review
          setUploadState('review');
        }
      } else {
        // Capturing back side
        setBackImageUri(imageUri);
        setUploadState('review');
      }
    } catch (error) {
      logger.error('[UploadIdScreen] Error handling file selection:', error);
      Alert.alert(
        'File Selection Error',
        'Failed to process selected file. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

    const handleUploadAndContinue = async () => {
    if (!selectedDocType || !frontImageUri) return;
    
    try {
      logger.debug(`[UploadIdScreen] Uploading ${selectedDocType} document(s)`);
      
      // Upload front image first with correct side designation
      const frontSide = needsBothSides(selectedDocType) ? 'front' : 'single';
      const frontResult = await uploadDocument(selectedDocType, frontImageUri, frontSide);
      
      if (!frontResult.success) {
        logger.error(`[UploadIdScreen] Front upload failed: ${frontResult.error}`);
        Alert.alert(
          'Upload Failed',
          frontResult.error || 'Failed to upload front image. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      logger.debug(`[UploadIdScreen] Front upload successful, document ID: ${frontResult.documentId}`);

      // Initialize backResult outside the conditional block
      let backResult = null;

      // If document needs both sides and we have back image, upload it too
      if (needsBothSides(selectedDocType) && backImageUri) {
        logger.debug(`[UploadIdScreen] Uploading back image for ${selectedDocType}`);

        backResult = await uploadDocument(selectedDocType, backImageUri, 'back');

        if (!backResult.success) {
          logger.error(`[UploadIdScreen] Back upload failed: ${backResult.error}`);
          Alert.alert(
            'Upload Failed',
            `Front image uploaded successfully, but back image failed: ${backResult.error}. Please try uploading the back side again.`,
            [{ text: 'OK' }]
          );
          return;
        }

        logger.debug(`[UploadIdScreen] Back upload successful, document ID: ${backResult.documentId}`);
      }
      
      setUploadedDocumentId(frontResult.documentId || null);
      setForceReupload(false);

      // PROFESSIONAL FIX: Use KYC completion hook for instant checkmark
      logger.debug('[UploadIdScreen] 🎯 Using KYC completion hook for instant cache update');

      // Complete the KYC step with proper cache invalidation
      // Construct verification documents array for /kyc/verification-documents endpoint
      const verificationDocuments = [];


      // Add front document
      if (frontResult.documentUrl) {
        // ROBUST FIX: Always use explicit side values, don't rely on backend response
        const frontDocumentSide = needsBothSides(selectedDocType) ? 'front' : 'single';
        const frontDoc = {
          document_type: selectedDocType,
          document_url: frontResult.documentUrl,
          document_number: frontResult.fullDocumentData?.document_number || undefined,
          document_side: frontDocumentSide, // Use explicit value instead of relying on backend
        };
        verificationDocuments.push(frontDoc);
      }

      // Add back document if exists
      if (backResult?.documentUrl) {
        const backDoc = {
          document_type: selectedDocType,
          document_url: backResult.documentUrl,
          document_number: backResult.fullDocumentData?.document_number || undefined,
          document_side: 'back', // Always 'back' for back side documents
        };
        verificationDocuments.push(backDoc);
      }


      // Backend already marked step as completed, just need to:
      // 1. Invalidate queries for instant UI update
      // 2. Show success alert
      // 3. Navigate to next step or timeline

      logger.debug('[UploadIdScreen] 🔄 Triggering cache invalidation for document upload');

      // Primary KYC cache invalidation (same as useKycCompletion)
      invalidateQueries(['kyc']);
      invalidateQueries(['profile']);

      // Document-specific cache invalidation
      invalidateQueries(['documents', 'verification']);

      logger.debug('[UploadIdScreen] ✅ Cache invalidation completed');

      // Show success alert and navigate
      Alert.alert(
        'Success',
        needsBothSides(selectedDocType) && backImageUri
          ? 'Both sides of your document have been uploaded successfully.'
          : 'Your document has been uploaded successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to timeline or next step
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

      logger.debug('[UploadIdScreen] ✅ Document upload completed with cache invalidation');
      
    } catch (error) {
      logger.error('[UploadIdScreen] Error during upload:', error);
      Alert.alert(
        'Upload Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRetake = () => {
    if (currentSide === 'front') {
      setFrontImageUri(null);
    } else {
      setBackImageUri(null);
    }
    
    if (needsBothSides(selectedDocType!) && currentSide === 'back') {
      setUploadState('upload_back');
    } else {
      setUploadState('upload_front');
    }
  };

  // Get screen title based on current state and selected document type
  const getScreenTitle = () => {
    switch (uploadState) {
      case 'select_type':
        return 'Select ID document';
      case 'upload_front':
        if (selectedDocType === 'passport') return 'Upload Passport';
        if (selectedDocType === 'national_id') return 'Upload National ID - Front';
        if (selectedDocType === 'drivers_license') return "Upload Driver's License - Front";
        return 'Upload Document - Front';
      case 'upload_back':
        if (selectedDocType === 'national_id') return 'Upload National ID - Back';
        if (selectedDocType === 'drivers_license') return "Upload Driver's License - Back";
        return 'Upload Document - Back';
      case 'camera':
        return 'Take Photo';
      case 'review':
        return 'Review Document';
      default:
        return 'Identity Verification';
    }
  };

  // Get current captured image based on current side
  const getCurrentImage = () => {
    if (uploadState === 'review') {
      // In review state, show the last captured image
      return backImageUri || frontImageUri;
    }
    return currentSide === 'front' ? frontImageUri : backImageUri;
  };

  // Styles memoized with theme dependency
  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.card,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    contentContainer: {
      padding: theme.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
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
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
    },
    progressIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.primaryUltraLight,
      borderRadius: theme.borderRadius.md,
    },
    progressTextIndicator: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    documentOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    selectedOption: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryUltraLight,
    },
    documentIconContainer: {
      width: 40,
      height: 40,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    documentInfo: {
      flex: 1,
    },
    documentName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    documentDescription: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    checkContainer: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    continueButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    disabledButton: {
      backgroundColor: theme.colors.border,
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
    },
    uploadArea: {
      width: '100%',
      height: 200,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.inputBackground,
    },
    uploadText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs,
      textAlign: 'center',
    },
    uploadSubtext: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: theme.spacing.lg,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      minHeight: 48,
    },
    primaryActionButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryActionButton: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
    },
    secondaryActionButtonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
    },
    buttonIcon: {
      marginRight: theme.spacing.xs,
    },
    guidelinesContainer: {
      marginTop: theme.spacing.sm,
    },
    guidelineTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    guidelinesList: {
      gap: theme.spacing.sm,
    },
    guidelineItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkIcon: {
      marginRight: theme.spacing.sm,
    },
    guidelineText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    documentPreview: {
      width: '100%',
      height: 250,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.inputBackground,
    },
    documentImage: {
      width: '100%',
      height: '100%',
    },
    previewActions: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: theme.spacing.lg,
    },
    previewRetake: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    previewRetakeText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.textPrimary,
    },
    previewContinue: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    previewContinueText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.white,
      marginLeft: uploading ? theme.spacing.xs : 0,
    },
    infoText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    progressContainer: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
    },
    progressText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
    },
    statusText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    uploadedCheck: {
      backgroundColor: theme.colors.success || theme.colors.primary,
    },
    uploadedDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.textSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), [theme, uploading]);

  // Render the appropriate screen based on the current state
  const renderContent = () => {
    switch (uploadState) {
      case 'select_type':
        return renderSelectDocumentType();
      case 'upload_front':
      case 'upload_back':
        return renderUploadDocument();
      case 'camera':
        return renderDocumentCamera();
      case 'review':
        return renderReviewDocument();
      default:
        return null;
    }
  };

  // Render custom document camera
  const renderDocumentCamera = () => {
    if (!selectedDocType) return null;
    
    const documentSide = needsBothSides(selectedDocType) 
      ? currentSide 
      : 'single' as const;
    
    return (
      <CameraCapture
        mode="document"
        documentType={selectedDocType}
        documentSide={documentSide}
        onCapture={handleCameraCapture}
        onCancel={handleCameraCancel}
      />
    );
  };

  // Select document type screen
  const renderSelectDocumentType = () => {
    return (
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Select your ID document type</Text>
          <Text style={styles.subtitle}>Choose the type of document you want to upload for verification.</Text>

          <TouchableOpacity 
            style={[styles.documentOption, selectedDocType === 'passport' && styles.selectedOption]}
            onPress={() => handleSelectDocType('passport')}
          >
            <View style={styles.documentIconContainer}>
              <Ionicons name="document-text-outline" size={24} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentName}>Passport</Text>
              <Text style={styles.documentDescription}>
                International travel document (front page only)
                {getDocumentStatus('passport').isUploaded && (
                  <Text style={styles.statusText}> • {getDocumentStatus('passport').status}</Text>
                )}
              </Text>
            </View>
            <View style={styles.checkContainer}>
              {getDocumentStatus('passport').isActive ? (
                <View style={[styles.checkCircle, styles.uploadedCheck]}>
                  <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                </View>
              ) : getDocumentStatus('passport').isUploaded ? (
                <View style={styles.uploadedDot}>
                  <Ionicons name="ellipse" size={12} color={theme.colors.textSecondary} />
                </View>
              ) : selectedDocType === 'passport' ? (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                </View>
              ) : (
                <View style={styles.emptyCheck} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.documentOption, selectedDocType === 'national_id' && styles.selectedOption]}
            onPress={() => handleSelectDocType('national_id')}
          >
            <View style={styles.documentIconContainer}>
              <Ionicons name="card-outline" size={24} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentName}>National ID card</Text>
              <Text style={styles.documentDescription}>
                Government issued identity card (front + back required)
                {getDocumentStatus('national_id').isUploaded && (
                  <Text style={styles.statusText}> • {getDocumentStatus('national_id').status}</Text>
                )}
              </Text>
            </View>
            <View style={styles.checkContainer}>
              {getDocumentStatus('national_id').isActive ? (
                <View style={[styles.checkCircle, styles.uploadedCheck]}>
                  <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                </View>
              ) : getDocumentStatus('national_id').isUploaded ? (
                <View style={styles.uploadedDot}>
                  <Ionicons name="ellipse" size={12} color={theme.colors.textSecondary} />
                </View>
              ) : selectedDocType === 'national_id' ? (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                </View>
              ) : (
                <View style={styles.emptyCheck} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.documentOption, selectedDocType === 'drivers_license' && styles.selectedOption]}
            onPress={() => handleSelectDocType('drivers_license')}
          >
            <View style={styles.documentIconContainer}>
              <Ionicons name="person-outline" size={24} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentName}>Driver's license</Text>
              <Text style={styles.documentDescription}>
                Driver's permit with photo (front + back required)
                {getDocumentStatus('drivers_license').isUploaded && (
                  <Text style={styles.statusText}> • {getDocumentStatus('drivers_license').status}</Text>
                )}
              </Text>
            </View>
            <View style={styles.checkContainer}>
              {getDocumentStatus('drivers_license').isActive ? (
                <View style={[styles.checkCircle, styles.uploadedCheck]}>
                  <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                </View>
              ) : getDocumentStatus('drivers_license').isUploaded ? (
                <View style={styles.uploadedDot}>
                  <Ionicons name="ellipse" size={12} color={theme.colors.textSecondary} />
                </View>
              ) : selectedDocType === 'drivers_license' ? (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                </View>
              ) : (
                <View style={styles.emptyCheck} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.continueButton, !selectedDocType && styles.disabledButton]}
            onPress={() => selectedDocType ? setUploadState('upload_front') : null}
            disabled={!selectedDocType}
          >
            <Text style={styles.continueButtonText}>
              {selectedDocType && getDocumentStatus(selectedDocType).isActive 
                ? 'View Document' 
                : selectedDocType && getDocumentStatus(selectedDocType).isUploaded
                ? `Switch to ${selectedDocType === 'passport' ? 'Passport' : selectedDocType === 'national_id' ? 'National ID' : "Driver's License"}`
                : 'Continue'
              }
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Upload document screen (handles both front and back)
  const renderUploadDocument = () => {
    const docTypeText = selectedDocType === 'passport' ? 'passport' : 
                        selectedDocType === 'national_id' ? 'national ID' : 'driver\'s license';
    
    const sideText = currentSide === 'front' ? 'front' : 'back';
    const currentImage = getCurrentImage();
    
    // Check for existing uploaded document
    const documentStatus = getDocumentStatus(selectedDocType!);
    const hasUploadedDocument = documentStatus.isUploaded;
    
    // Get the document URLs for preview (front and back if needed)
    const getDocumentUrls = () => {
      if (!kycStatus?.documents || !selectedDocType) return { front: null, back: null };
      
      const docs = kycStatus.documents.filter(d => d.document_type === selectedDocType);
      console.log(`[UploadIdScreen] Looking for document type: ${selectedDocType}, found docs:`, docs);
      
      if (needsBothSides(selectedDocType)) {
        // For dual-sided documents, find front and back
        const frontDoc = docs.find(d => d.document_side === 'front');
        const backDoc = docs.find(d => d.document_side === 'back');
        
        return {
          front: frontDoc?.document_url || null,
          back: backDoc?.document_url || null
        };
      } else {
        // For single-sided documents, get the first one (should be 'single' side)
        const doc = docs.find(d => d.document_side === 'single') || docs[0];
        return {
          front: doc?.document_url || null,
          back: null
        };
      }
    };
    
    const documentUrls = getDocumentUrls();
    const canShowPreview = hasUploadedDocument && documentUrls.front && documentUrls.front.trim() !== '' && !forceReupload && !frontImageUri && !backImageUri;
    
    console.log(`[UploadIdScreen] Document preview check - hasUploaded: ${hasUploadedDocument}, frontUrl: ${documentUrls.front}, backUrl: ${documentUrls.back}, canShow: ${canShowPreview}`);
    
    return (
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          {canShowPreview ? (
            // Show preview of uploaded document
            <>
              <Text style={styles.title}>Your uploaded {docTypeText}</Text>
              <Text style={styles.subtitle}>
                Review your uploaded document. You can continue with this document or re-upload a new one.
              </Text>

              {/* Show front image */}
              {documentUrls.front && (
                <View style={styles.documentPreview}>
                  <Image
                    source={{ uri: documentUrls.front }}
                    style={styles.documentImage}
                    contentFit="contain"
                    transition={200}
                    onLoadStart={() => setFrontImageLoading(true)}
                    onLoad={() => {
                      setFrontImageLoading(false);
                      setFrontImageError(false);
                    }}
                    onError={() => {
                      setFrontImageLoading(false);
                      setFrontImageError(true);
                      logger.error('[UploadIdScreen] Front image failed to load:', documentUrls.front);
                    }}
                  />
                  {frontImageLoading && (
                    <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20 }}>
                      <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                  )}
                  {frontImageError && (
                    <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -80, marginTop: -40, alignItems: 'center' }}>
                      <Text style={{ color: theme.colors.error, marginBottom: 8 }}>Failed to load image</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setFrontImageError(false);
                          setFrontImageLoading(true);
                        }}
                        style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.primary, borderRadius: 8 }}
                      >
                        <Text style={{ color: 'white' }}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {needsBothSides(selectedDocType!) && !frontImageLoading && !frontImageError && (
                    <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', padding: 4, borderRadius: 4 }}>
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Front</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Show back image if it exists */}
              {documentUrls.back && needsBothSides(selectedDocType!) && (
                <View style={[styles.documentPreview, { marginBottom: theme.spacing.lg }]}>
                  <Image
                    source={{ uri: documentUrls.back }}
                    style={styles.documentImage}
                    contentFit="contain"
                    transition={200}
                    onLoadStart={() => setBackImageLoading(true)}
                    onLoad={() => {
                      setBackImageLoading(false);
                      setBackImageError(false);
                    }}
                    onError={() => {
                      setBackImageLoading(false);
                      setBackImageError(true);
                      logger.error('[UploadIdScreen] Back image failed to load:', documentUrls.back);
                    }}
                  />
                  {backImageLoading && (
                    <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20 }}>
                      <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                  )}
                  {backImageError && (
                    <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -80, marginTop: -40, alignItems: 'center' }}>
                      <Text style={{ color: theme.colors.error, marginBottom: 8 }}>Failed to load image</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setBackImageError(false);
                          setBackImageLoading(true);
                        }}
                        style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.primary, borderRadius: 8 }}
                      >
                        <Text style={{ color: 'white' }}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {!backImageLoading && !backImageError && (
                    <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', padding: 4, borderRadius: 4 }}>
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Back</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.previewActions}>
                <TouchableOpacity 
                  style={[styles.previewRetake, { flex: 1 }]} 
                  onPress={() => {
                    // Continue with current document
                    console.log(`[UploadIdScreen] Continuing with existing ${selectedDocType} document`);
                    navigation.navigate('TakeSelfie', { sourceRoute });
                  }}
                  disabled={uploading}
                >
                  <Text style={styles.previewRetakeText}>Continue</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.previewContinue, { flex: 1, marginLeft: 10 }]} 
                  onPress={() => {
                    // Force re-upload mode to show upload interface
                    setForceReupload(true);
                    setFrontImageUri(null);
                    setBackImageUri(null);
                    setCurrentSide('front');
                  }}
                  disabled={uploading}
                >
                  <Text style={styles.previewContinueText}>Re-upload</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.infoText}>
                Status: {documentStatus.status.charAt(0).toUpperCase() + documentStatus.status.slice(1)}
                {documentStatus.submittedAt && (
                  <Text style={styles.statusText}>
                    {' • Submitted on ' + new Date(documentStatus.submittedAt).toLocaleString()}
                  </Text>
                )}
              </Text>
            </>
          ) : (
            // Show fresh capture interface
            <>
              {/* Progress indicator for multi-sided documents */}
              {needsBothSides(selectedDocType!) && (
                <View style={styles.progressIndicator}>
                  <Text style={styles.progressTextIndicator}>
                    Step {currentSide === 'front' ? '1' : '2'} of 2: {sideText === 'front' ? 'Front' : 'Back'} side
                  </Text>
                </View>
              )}

              <Text style={styles.title}>
                {needsBothSides(selectedDocType!) 
                  ? `Take photo of ${docTypeText} ${sideText} side`
                  : `Take photo of your ${docTypeText}`
                }
              </Text>
          <Text style={styles.subtitle}>
                {currentSide === 'front' 
                  ? `Make sure your ${docTypeText} is clearly visible and all details are readable.`
                  : `Now capture the back side of your ${docTypeText} with all information visible.`
                }
          </Text>

              {currentImage ? (
                // Show captured image preview
                <View style={styles.documentPreview}>
                  <Image
                    source={{ uri: currentImage }}
                    style={styles.documentImage}
                    contentFit="contain"
                    transition={200}
                  />
                </View>
              ) : (
                // Show upload interface
          <TouchableOpacity 
            style={styles.uploadArea}
                  onPress={handleTakePhoto}
          >
                  <Ionicons name="camera-outline" size={48} color={theme.colors.primary} />
            <Text style={styles.uploadText}>
                    Tap to take a photo
            </Text>
            <Text style={styles.uploadSubtext}>
                    or choose from your options below
            </Text>
            </TouchableOpacity>
              )}

              {currentImage ? (
                // Actions for captured image
                <View style={styles.previewActions}>
                  <TouchableOpacity 
                    style={styles.previewRetake} 
                    onPress={handleRetake}
                    disabled={uploading}
                  >
                    <Text style={styles.previewRetakeText}>Retake</Text>
          </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.previewContinue} 
                    onPress={() => {
                      if (needsBothSides(selectedDocType!) && currentSide === 'front') {
                        // Move to back side capture
                        setCurrentSide('back');
                        setUploadState('upload_back');
                      } else {
                        // Go to review
                        setUploadState('review');
                      }
                    }}
                    disabled={uploading}
                  >
                    <Text style={styles.previewContinueText}>
                      {needsBothSides(selectedDocType!) && currentSide === 'front' ? 'Next: Back Side' : 'Continue'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // Actions for taking photo
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryActionButton]}
                    onPress={handleOpenUploadSheet}
                    disabled={uploading}
                  >
                    <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.white} style={styles.buttonIcon} />
                    <Text style={styles.actionButtonText}>Upload Document</Text>
                  </TouchableOpacity>
                </View>
              )}

              {uploading && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>Processing...</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                  </View>
                </View>
              )}

              <View style={styles.guidelinesContainer}>
                <Text style={styles.guidelineTitle}>Tips for a great photo:</Text>
          <View style={styles.guidelinesList}>
            <View style={styles.guidelineItem}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success || theme.colors.primary} style={styles.checkIcon} />
                    <Text style={styles.guidelineText}>Document is fully visible in frame</Text>
            </View>
            <View style={styles.guidelineItem}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success || theme.colors.primary} style={styles.checkIcon} />
                    <Text style={styles.guidelineText}>All text is clear and readable</Text>
            </View>
            <View style={styles.guidelineItem}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success || theme.colors.primary} style={styles.checkIcon} />
                    <Text style={styles.guidelineText}>No glare or shadows</Text>
            </View>
            <View style={styles.guidelineItem}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success || theme.colors.primary} style={styles.checkIcon} />
                    <Text style={styles.guidelineText}>Photo is not cropped or edited</Text>
                  </View>
            </View>
          </View>
            </>
          )}
        </View>
      </View>
    );
  };

  // Review document screen
  const renderReviewDocument = () => {
    const docTypeText = selectedDocType === 'passport' ? 'passport' : 
                        selectedDocType === 'national_id' ? 'national ID' : 'driver\'s license';
    
    return (
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Review your {docTypeText}</Text>
          <Text style={styles.subtitle}>
            {needsBothSides(selectedDocType!)
              ? `Make sure both sides of your ${docTypeText} are clearly visible and all details are readable.`
              : `Make sure your ${docTypeText} is clearly visible and all details are readable.`
            }
          </Text>

          {/* Show front image */}
          {frontImageUri && (
            <View style={[styles.documentPreview, { marginBottom: needsBothSides(selectedDocType!) ? theme.spacing.md : theme.spacing.lg }]}>
              <Image
                source={{ uri: frontImageUri }}
                style={styles.documentImage}
                contentFit="contain"
                transition={200}
              />
              {needsBothSides(selectedDocType!) && (
                <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', padding: 4, borderRadius: 4 }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Front</Text>
                </View>
              )}
            </View>
          )}

          {/* Show back image if it exists */}
          {backImageUri && needsBothSides(selectedDocType!) && (
            <View style={[styles.documentPreview, { marginBottom: theme.spacing.lg }]}>
              <Image
                source={{ uri: backImageUri }}
                style={styles.documentImage}
                contentFit="contain"
                transition={200}
              />
              <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', padding: 4, borderRadius: 4 }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Back</Text>
              </View>
            </View>
          )}

          <View style={styles.previewActions}>
            <TouchableOpacity 
              style={styles.previewRetake} 
              onPress={handleRetake}
              disabled={uploading}
            >
              <Text style={styles.previewRetakeText}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.previewContinue} 
              onPress={handleUploadAndContinue}
              disabled={uploading || !frontImageUri}
            >
              {uploading && <ActivityIndicator size="small" color={theme.colors.white} />}
              <Text style={styles.previewContinueText}>
                {uploading ? 'Uploading...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>

          {uploading && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>Uploading document... {uploadProgress}%</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
            </View>
          )}

          <Text style={styles.infoText}>
            We'll need to verify your document and confirm your identity. This process typically takes a few minutes but can take up to 24 hours.
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        hidden={uploadState === 'camera'}
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.card}
      />
      
      {/* Header - hidden during camera */}
      {uploadState !== 'camera' && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getScreenTitle()}</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {uploadState === 'camera' ? (
        // Full screen camera - no ScrollView needed
        renderContent()
      ) : kycLoading ? (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.subtitle, { marginTop: theme.spacing.md }]}>
            Loading document status...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderContent()}
        </ScrollView>
      )}

      {/* Upload Options Bottom Sheet */}
      <UploadOptionsSheet
        visible={showUploadSheet}
        onClose={() => setShowUploadSheet(false)}
        onFileSelected={handleFileSelected}
        onCameraTap={() => {
          setShowUploadSheet(false);
          setUploadState('camera');
        }}
        title={`Upload ${currentSide === 'front' ? 'Front' : 'Back'} of ID`}
        allowedTypes="images"
      />
    </SafeAreaView>
  );
};

export default UploadIdScreen; 