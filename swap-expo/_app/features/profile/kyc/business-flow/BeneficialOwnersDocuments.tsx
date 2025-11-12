// Created: BeneficialOwnersDocuments component for uploading owner identification documents - 2025-11-11

import React, { useState, useMemo, useEffect } from 'react';
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

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

interface BeneficialOwner {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  idType: string;
}

type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

interface OwnerDocument {
  ownerId: string;
  status: UploadStatus;
  documentUrl?: string;
  errorMessage?: string;
}

const BeneficialOwnersDocuments: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BeneficialOwnersDocuments'>>();
  const { theme } = useTheme();

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  const [owners, setOwners] = useState<BeneficialOwner[]>([]);
  const [documents, setDocuments] = useState<OwnerDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { completeStep } = useKycCompletion();

  // Fetch owners from API on mount
  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/kyc/beneficial-owners');
      console.log('[BeneficialOwnersDocuments] API Response:', response);

      // Ensure ownersData is an array
      const ownersData = Array.isArray(response.data) ? response.data : [];

      // Map API response to component interface
      const mappedOwners: BeneficialOwner[] = ownersData.map((owner: any) => ({
        id: owner.id,
        firstName: owner.first_name,
        middleName: owner.middle_name,
        lastName: owner.last_name,
        idType: owner.id_type,
      }));

      setOwners(mappedOwners);

      // Initialize document state for each owner
      const initialDocuments = mappedOwners.map(owner => ({
        ownerId: owner.id,
        status: 'pending' as UploadStatus,
      }));
      setDocuments(initialDocuments);

      console.log('[BeneficialOwnersDocuments] Fetched owners:', mappedOwners.length);
    } catch (error) {
      console.error('[BeneficialOwnersDocuments] Failed to fetch owners:', error);
      Alert.alert('Error', 'Failed to load beneficial owners. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getIdTypeLabel = (idType: string): string => {
    switch (idType) {
      case 'national_id':
        return 'National ID';
      case 'passport':
        return 'Passport';
      case 'drivers_license':
        return "Driver's License";
      default:
        return 'ID Document';
    }
  };

  const handleUploadDocument = async (ownerId: string) => {
    try {
      // Open document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('[BeneficialOwnersDocuments] Document picker canceled');
        return;
      }

      // Update status to uploading
      setDocuments(prev =>
        prev.map(doc =>
          doc.ownerId === ownerId ? { ...doc, status: 'uploading' } : doc
        )
      );

      // Get the selected file
      const file = result.assets[0];
      const owner = owners.find(o => o.id === ownerId);
      const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : 'Owner';

      console.log('[BeneficialOwnersDocuments] Uploading document for:', ownerName);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);
      formData.append('owner_id', ownerId);
      formData.append('document_type', 'owner_id');

      // Upload to backend
      const response = await apiClient.post('/kyc/beneficial-owners/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update status to uploaded
      setDocuments(prev =>
        prev.map(doc =>
          doc.ownerId === ownerId
            ? { ...doc, status: 'uploaded', documentUrl: response.data.document_url }
            : doc
        )
      );

      console.log('[BeneficialOwnersDocuments] Document uploaded successfully for:', ownerName);
      Alert.alert('Success', `Document uploaded for ${ownerName}`);
    } catch (error: any) {
      console.error('[BeneficialOwnersDocuments] Upload failed:', error);
      setDocuments(prev =>
        prev.map(doc =>
          doc.ownerId === ownerId
            ? { ...doc, status: 'error', errorMessage: 'Upload failed' }
            : doc
        )
      );
      Alert.alert('Upload Failed', error.response?.data?.message || 'Unable to upload document. Please try again.');
    }
  };

  const handleRetryUpload = (ownerId: string) => {
    handleUploadDocument(ownerId);
  };

  const allDocumentsUploaded = documents.every(doc => doc.status === 'uploaded');

  const handleContinue = async () => {
    if (!allDocumentsUploaded) {
      Alert.alert('Documents Required', 'Please upload ID documents for all beneficial owners.');
      return;
    }

    try {
      setIsLoading(true);

      // Complete the beneficial_owners_documents step
      await completeStep('beneficial_owners_documents', {
        documents_count: documents.length,
        owners_count: owners.length
      }, {
        returnToTimeline: false,
        sourceRoute,
        showSuccessAlert: false,
      });

      console.log('[BeneficialOwnersDocuments] KYC step completed: beneficial_owners_documents');

      // Navigate to business info flow
      navigation.navigate('BusinessInfoFlow', {
        returnToTimeline,
        sourceRoute,
      });
    } catch (error) {
      console.error('[BeneficialOwnersDocuments] Failed to complete KYC step:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsLoading(false);
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
    ownerCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    ownerHeader: {
      marginBottom: theme.spacing.md,
    },
    ownerName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs / 2,
    },
    ownerIdType: {
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
    continueButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
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

  const renderOwnerDocument = (owner: BeneficialOwner) => {
    const document = documents.find(doc => doc.ownerId === owner.id);
    if (!document) return null;

    const isUploading = document.status === 'uploading';
    const isUploaded = document.status === 'uploaded';
    const isError = document.status === 'error';

    return (
      <View key={owner.id} style={styles.ownerCard}>
        <View style={styles.ownerHeader}>
          <Text style={styles.ownerName}>
            {owner.firstName} {owner.middleName ? `${owner.middleName} ` : ''}{owner.lastName}
          </Text>
          <Text style={styles.ownerIdType}>
            {getIdTypeLabel(owner.idType)} Required
          </Text>
        </View>

        <View style={styles.uploadSection}>
          {document.status === 'pending' && (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleUploadDocument(owner.id)}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.white} />
              <Text style={styles.uploadButtonText}>Upload Document</Text>
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
                onPress={() => handleRetryUpload(owner.id)}
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
  const totalCount = documents.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Owner Documents</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Upload Owner Documents</Text>
          <Text style={styles.subtitle}>
            Please upload identification documents for each beneficial owner. These documents must match the ID type provided.
          </Text>

          {owners.map(owner => renderOwnerDocument(owner))}

          {totalCount > 0 && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {uploadedCount} of {totalCount} documents uploaded
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.continueButton,
              !allDocumentsUploaded && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!allDocumentsUploaded}
          >
            <Text style={styles.continueButtonText}>
              Continue to Business Information
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BeneficialOwnersDocuments;
