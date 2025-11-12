// Created: BusinessRegistrationDocuments component for uploading business registration documents - 2025-11-11

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import apiClient from '../../../../_api/apiClient';
import * as DocumentPicker from 'expo-document-picker';
import { useKycCompletion } from '../../../../hooks-actions/useKycCompletion';
import { BUSINESS_DOCUMENT_TYPES, DocumentTypeConfig } from '../../../../constants/kycDocuments';

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
  const { completeStep } = useKycCompletion();

  const documentTypes = BUSINESS_DOCUMENT_TYPES;

  const [documents, setDocuments] = useState<DocumentUpload[]>(
    documentTypes.map(type => ({
      documentTypeId: type.id,
      status: 'pending' as UploadStatus,
    }))
  );

  const handleUploadDocument = async (documentTypeId: string) => {
    try {
      // Open document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('[BusinessRegistrationDocuments] Document picker canceled');
        return;
      }

      // Update status to uploading
      setDocuments(prev =>
        prev.map(doc =>
          doc.documentTypeId === documentTypeId ? { ...doc, status: 'uploading' } : doc
        )
      );

      // Get the selected file
      const file = result.assets[0];
      const documentType = documentTypes.find(type => type.id === documentTypeId);
      const documentLabel = documentType?.label || 'Document';

      console.log('[BusinessRegistrationDocuments] Uploading:', documentLabel);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);
      formData.append('document_type', documentTypeId);
      formData.append('is_required', documentType?.required ? 'true' : 'false');

      // Upload to backend
      const response = await apiClient.post('/kyc/business/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update status to uploaded
      setDocuments(prev =>
        prev.map(doc =>
          doc.documentTypeId === documentTypeId
            ? { ...doc, status: 'uploaded', documentUrl: response.data.document_url }
            : doc
        )
      );

      console.log('[BusinessRegistrationDocuments] Document uploaded successfully:', documentLabel);
      Alert.alert('Success', `${documentLabel} uploaded successfully`);
    } catch (error: any) {
      console.error('[BusinessRegistrationDocuments] Upload failed:', error);
      setDocuments(prev =>
        prev.map(doc =>
          doc.documentTypeId === documentTypeId
            ? { ...doc, status: 'error', errorMessage: 'Upload failed' }
            : doc
        )
      );
      Alert.alert('Upload Failed', error.response?.data?.message || 'Unable to upload document. Please try again.');
    }
  };

  const handleRetryUpload = (documentTypeId: string) => {
    handleUploadDocument(documentTypeId);
  };

  const requiredDocumentsUploaded = documentTypes
    .filter(type => type.required)
    .every(type => {
      const doc = documents.find(d => d.documentTypeId === type.id);
      return doc?.status === 'uploaded';
    });

  const handleContinue = async () => {
    if (!requiredDocumentsUploaded) {
      Alert.alert('Required Documents', 'Please upload all required business documents.');
      return;
    }

    try {
      // Complete the business_documents step
      await completeStep('business_documents', {
        documents_count: documents.filter(d => d.status === 'uploaded').length,
        required_documents_count: documentTypes.filter(t => t.required).length
      }, {
        returnToTimeline: false,
        sourceRoute,
        showSuccessAlert: false,
      });

      console.log('[BusinessRegistrationDocuments] KYC step completed: business_documents');

      // Navigate to business security (Passcode) - Skip BusinessVerification
      navigation.navigate('Passcode', {
        isKycFlow: true,
        isBusiness: true,
        returnToTimeline,
      });
    } catch (error) {
      console.error('[BusinessRegistrationDocuments] Failed to complete KYC step:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
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
    content: { flex: 1, padding: theme.spacing.lg },
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
    documentLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs / 2,
    },
    documentLabel: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    requiredBadge: {
      backgroundColor: '#FEF3C7',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
      borderRadius: theme.borderRadius.sm,
    },
    requiredText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: '700',
      color: '#F59E0B',
      letterSpacing: 0.5,
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
    progressContainer: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    progressText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  }), [theme]);

  const renderDocumentCard = (documentType: DocumentType) => {
    const document = documents.find(doc => doc.documentTypeId === documentType.id);
    if (!document) return null;

    const isUploading = document.status === 'uploading';
    const isUploaded = document.status === 'uploaded';
    const isError = document.status === 'error';

    return (
      <View key={documentType.id} style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <View style={styles.documentLabelRow}>
            <Text style={styles.documentLabel}>{documentType.label}</Text>
            {documentType.required && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>REQUIRED</Text>
              </View>
            )}
          </View>
          <Text style={styles.documentDescription}>{documentType.description}</Text>
        </View>

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

          {isUploaded && (
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Documents</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Upload Business Documents</Text>
          <Text style={styles.subtitle}>
            Please upload your business registration documents. Required documents must be provided to complete verification.
          </Text>

          {documentTypes.map(type => renderDocumentCard(type))}

          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {uploadedRequiredCount} of {requiredCount} required documents uploaded
              {'\n'}
              {uploadedCount} of {documentTypes.length} total documents uploaded
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !requiredDocumentsUploaded && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!requiredDocumentsUploaded}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BusinessRegistrationDocuments;
