// Created: BusinessRegistrationDocuments component for uploading business registration documents - 2025-11-11
// Updated: Integrated useUploadModal and useDocumentUpload hooks for DRY code and camera support - 2025-01-22

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import { BUSINESS_DOCUMENT_TYPES, DocumentTypeConfig } from '../../../../constants/kycDocuments';
import UploadOptionsSheet from '../../../../components/UploadOptionsSheet';
import CameraCapture from '../../../../components2/CameraCapture';
import { useUploadModal } from '../../../../hooks/useUploadModal';
import { useDocumentUpload } from '../../../../hooks-actions/useDocumentUpload';
import { invalidateQueries } from '../../../../tanstack-query/queryClient';
import { useKycStatus } from '../../../../hooks-data/useKycQuery';
import { Image } from 'expo-image';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

interface DocumentUpload {
  documentTypeId: string;
  status: UploadStatus;
  documentUrl?: string;
  errorMessage?: string;
}

const BusinessRegistrationDocuments: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BusinessRegistrationDocuments'>>();
  const { theme } = useTheme();

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  const documentTypes = BUSINESS_DOCUMENT_TYPES;

  // Get KYC status to check for existing documents
  const { data: kycStatus } = useKycStatus();

  // Get existing documents from KYC status (similar to UploadId.tsx pattern)
  const getExistingDocuments = () => {
    if (!kycStatus?.documents) return {};

    const docMap: Record<string, { url: string; status: string; created_at: string }> = {};
    documentTypes.forEach(type => {
      const doc = kycStatus.documents.find(d => d.document_type === type.id);
      if (doc && doc.document_url) {
        docMap[type.id] = {
          url: doc.document_url,
          status: doc.verification_status || 'pending',
          created_at: doc.created_at || '',
        };
      }
    });
    return docMap;
  };

  const existingDocuments = getExistingDocuments();

  const [documents, setDocuments] = useState<DocumentUpload[]>(
    documentTypes.map(type => ({
      documentTypeId: type.id,
      status: existingDocuments[type.id] ? 'uploaded' : 'pending' as UploadStatus,
      documentUrl: existingDocuments[type.id]?.url,
    }))
  );
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<string>('');
  const [reuploadMode, setReuploadMode] = useState<Record<string, boolean>>({});

  // Upload hooks (DRY code, professional pattern)
  const { uploading, uploadDocument } = useDocumentUpload({
    endpoint: '/kyc/documents'
  });

  const uploadModal = useUploadModal({
    onFileSelected: (uri) => handleFileSelected({ uri }),
    mode: 'document',
    sheetTitle: 'Upload Document',
    allowedTypes: 'all',
  });

  const handleUploadDocument = (documentTypeId: string) => {
    setSelectedDocumentTypeId(documentTypeId);
    uploadModal.openUploadSheet();
  };

  const handleFileSelected = async (file: any) => {
    if (selectedDocumentTypeId) {
      await uploadDocumentFile(selectedDocumentTypeId, file);
    }
  };

  const uploadDocumentFile = async (documentTypeId: string, file: any) => {
    try {
      // Update status to uploading
      setDocuments(prev =>
        prev.map(doc =>
          doc.documentTypeId === documentTypeId ? { ...doc, status: 'uploading' } : doc
        )
      );

      const documentType = documentTypes.find(type => type.id === documentTypeId);
      const documentLabel = documentType?.label || 'Document';

      console.log('[BusinessRegistrationDocuments] Uploading:', documentLabel);

      // Use the uploadDocument hook (DRY - handles FormData, API call, and errors)
      const result = await uploadDocument(
        documentTypeId as any, // documentType (business_registration_certificate, etc.)
        file.uri,
        'single'
      );

      if (result.success) {
        // Update status to uploaded
        setDocuments(prev =>
          prev.map(doc =>
            doc.documentTypeId === documentTypeId
              ? { ...doc, status: 'uploaded', documentUrl: result.documentUrl }
              : doc
          )
        );

        console.log('[BusinessRegistrationDocuments] Document uploaded successfully:', documentLabel);
        Alert.alert('Success', `${documentLabel} uploaded successfully`);
      } else {
        // Upload failed (hook returned error)
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('[BusinessRegistrationDocuments] Upload failed:', error);
      setDocuments(prev =>
        prev.map(doc =>
          doc.documentTypeId === documentTypeId
            ? { ...doc, status: 'error', errorMessage: error.message || 'Upload failed' }
            : doc
        )
      );
      Alert.alert('Upload Failed', error.message || 'Unable to upload document. Please try again.');
    }
  };

  const handleRetryUpload = (documentTypeId: string) => {
    handleUploadDocument(documentTypeId);
  };

  // Allow continuing if ANY document uploaded OR if user wants to skip
  const hasAnyDocuments = documents.some(d => d.status === 'uploaded');
  const hasExistingDocuments = Object.keys(existingDocuments).length > 0;
  const canContinue = hasAnyDocuments || hasExistingDocuments;

  const handleContinue = async () => {
    // Backend already marked step as completed when documents were uploaded
    // Just need to invalidate cache and navigate (same pattern as UploadId.tsx)
    console.log('[BusinessRegistrationDocuments] 🔄 Triggering cache invalidation for document upload');

    // Primary KYC cache invalidation (same as UploadId.tsx lines 383-387)
    invalidateQueries(['kyc']);
    invalidateQueries(['profile']);
    invalidateQueries(['documents', 'verification']);

    console.log('[BusinessRegistrationDocuments] ✅ Cache invalidation completed');

    // Navigate to VerificationComplete - business profiles use personal PIN (no separate passcode)
    navigation.navigate('VerificationComplete', {
      returnToTimeline,
    });
  };

  const handleSkip = async () => {
    // Allow skipping document upload entirely for informal economy
    console.log('[BusinessRegistrationDocuments] ⏭️ Skipping document upload');

    // Navigate to VerificationComplete - business profiles use personal PIN (no separate passcode)
    navigation.navigate('VerificationComplete', {
      returnToTimeline,
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.card },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      height: 56,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary },
    content: { flex: 1, padding: theme.spacing.lg, backgroundColor: theme.colors.background },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
    },
    documentCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    documentHeader: {
      marginBottom: theme.spacing.md,
    },
    documentLabel: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    documentDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    uploadSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    uploadButtonDisabled: {
      backgroundColor: theme.colors.border,
    },
    uploadButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    statusText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
    },
    statusPending: {
      color: theme.colors.textTertiary,
    },
    statusUploading: {
      color: theme.colors.primary,
    },
    statusUploaded: {
      color: theme.colors.success,
    },
    statusError: {
      color: theme.colors.error,
    },
    retryButton: {
      marginTop: theme.spacing.sm,
      alignSelf: 'flex-start',
    },
    retryButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.xl,
    },
    skipButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    skipButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
    continueButton: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    continueButtonDisabled: {
      backgroundColor: theme.colors.border,
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    modalBody: {
      padding: theme.spacing.lg,
    },
    infoRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.md,
      alignItems: 'flex-start',
    },
    infoIcon: {
      fontSize: 24,
      marginRight: theme.spacing.sm,
    },
    infoTextContainer: {
      flex: 1,
    },
    infoTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    infoDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    documentPreview: {
      width: '100%',
      height: 200,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.border,
    },
    documentImage: {
      width: '100%',
      height: '100%',
    },
    previewActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    previewButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    previewButtonPrimary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    previewButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    previewButtonTextPrimary: {
      color: theme.colors.white,
    },
  }), [theme]);

  const renderDocumentCard = (documentType: DocumentTypeConfig) => {
    const document = documents.find(doc => doc.documentTypeId === documentType.id);
    if (!document) return null;

    const isUploading = document.status === 'uploading';
    const isUploaded = document.status === 'uploaded';
    const isError = document.status === 'error';
    const existingDoc = existingDocuments[documentType.id];
    const showPreview = (isUploaded || existingDoc) && !reuploadMode[documentType.id];
    const documentUrl = document.documentUrl || existingDoc?.url;

    return (
      <View key={documentType.id} style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <Text style={styles.documentLabel}>{documentType.label}</Text>
          <Text style={styles.documentDescription}>{documentType.description}</Text>
        </View>

        {showPreview && documentUrl ? (
          // Show preview with Continue/Re-upload buttons (like personal flow)
          <>
            <View style={styles.documentPreview}>
              <Image
                source={{ uri: documentUrl }}
                style={styles.documentImage}
                contentFit="contain"
                transition={200}
              />
            </View>
            <View style={styles.statusContainer}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={[styles.statusText, styles.statusUploaded]}>
                Uploaded {existingDoc?.created_at ? `on ${new Date(existingDoc.created_at).toLocaleDateString()}` : ''}
              </Text>
            </View>
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.previewButton, styles.previewButtonPrimary]}
                onPress={() => {
                  setReuploadMode(prev => ({ ...prev, [documentType.id]: true }));
                  handleUploadDocument(documentType.id);
                }}
              >
                <Text style={[styles.previewButtonText, styles.previewButtonTextPrimary]}>Re-upload</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Show upload interface
          <View style={styles.uploadSection}>
            {document.status === 'pending' && (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleUploadDocument(documentType.id)}
              >
                <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.white} />
                <Text style={styles.uploadButtonText}>Upload</Text>
              </TouchableOpacity>
            )}

            {isUploading && (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.statusText, styles.statusUploading]}>Uploading...</Text>
              </View>
            )}

            {isUploaded && !showPreview && (
              <View style={styles.statusContainer}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={[styles.statusText, styles.statusUploaded]}>Uploaded</Text>
              </View>
            )}

            {isError && (
              <View>
                <View style={styles.statusContainer}>
                  <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                  <Text style={[styles.statusText, styles.statusError]}>
                    {document.errorMessage || 'Upload failed'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => handleRetryUpload(documentType.id)}
                >
                  <Text style={styles.retryButtonText}>Retry Upload</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const uploadedCount = documents.filter(doc => doc.status === 'uploaded').length;
  const requiredCount = documentTypes.filter(type => type.required).length;
  const uploadedRequiredCount = documentTypes
    .filter(type => type.required)
    .filter(type => {
      const doc = documents.find(d => d.documentTypeId === type.id);
      return doc?.status === 'uploaded';
    }).length;

  // Full-screen camera mode (render at root level, outside SafeAreaView)
  if (uploadModal.showCamera) {
    return <CameraCapture {...uploadModal.cameraProps} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Documents</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => setShowHelpModal(true)}>
          <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Please upload your business registration documents.
          </Text>

          {documentTypes.map(type => renderDocumentCard(type))}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.continueButton,
                !canContinue && styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!canContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showHelpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHelpModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Document Upload Info</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📄</Text>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Upload Progress</Text>
                  <Text style={styles.infoDescription}>
                    {uploadedCount} of {documentTypes.length} documents uploaded
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>💡</Text>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>About Documents</Text>
                  <Text style={styles.infoDescription}>
                    Upload any available business documents. We understand that informal businesses may not have all documents.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Upload Options Bottom Sheet (uses hook props) */}
      <UploadOptionsSheet {...uploadModal.sheetProps} />
    </SafeAreaView>
  );
};

export default BusinessRegistrationDocuments;
