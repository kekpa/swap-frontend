import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../theme/ThemeContext';
import apiClient from '../../_api/apiClient';
import logger from '../../utils/logger';

type BusinessProfileViewRouteProp = RouteProp<
  { BusinessProfileView: { businessId: string } },
  'BusinessProfileView'
>;

type NavigationProp = StackNavigationProp<any>;

interface BusinessProfile {
  id: string;
  business_name: string;
  business_type?: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

const BusinessProfileView: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BusinessProfileViewRouteProp>();
  const { theme } = useTheme();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const businessId = route.params?.businessId;

  useEffect(() => {
    if (businessId) {
      fetchBusinessData();
    }
  }, [businessId]);

  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/businesses/${businessId}`);
      setBusiness(response.data);
    } catch (error: any) {
      logger.error('Error fetching business', error, 'business');
      Alert.alert('Error', 'Failed to load business information');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleEditBusiness = () => {
    if (business) {
      navigation.navigate('EditBusiness', { businessId: business.id });
    }
  };

  const formatBusinessType = (type?: string) => {
    if (!type) return 'Not specified';
    // Convert snake_case or camelCase to Title Case
    return type
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm + theme.spacing.xs,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
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
        scrollView: {
          flex: 1,
        },
        infoContainer: {
          padding: theme.spacing.lg,
        },
        sectionTitle: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: '600',
          color: theme.colors.primary,
          marginBottom: theme.spacing.sm + theme.spacing.xs,
          marginTop: theme.spacing.md,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        infoCard: {
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.md,
          overflow: 'hidden',
          ...theme.shadows.small,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: theme.spacing.md,
        },
        infoList: {
          paddingHorizontal: 0,
        },
        infoItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: theme.spacing.sm + theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.divider,
        },
        infoItemLast: {
          borderBottomWidth: 0,
        },
        infoLabel: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          flex: 4,
        },
        infoValue: {
          fontSize: theme.typography.fontSize.sm,
          fontWeight: '500',
          color: theme.colors.textPrimary,
          textAlign: 'right',
          flex: 6,
        },
        infoValueContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 6,
          justifyContent: 'flex-end',
        },
        actionButton: {
          backgroundColor: theme.colors.primaryUltraLight,
          borderRadius: theme.borderRadius.sm,
          paddingVertical: theme.spacing.sm + theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          alignItems: 'center',
          marginTop: theme.spacing.md,
        },
        actionButtonText: {
          color: theme.colors.primary,
          fontWeight: '500',
          fontSize: theme.typography.fontSize.md,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        statusBadge: {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs / 2,
          borderRadius: theme.borderRadius.sm,
          alignSelf: 'flex-start',
        },
        statusActive: {
          backgroundColor: theme.colors.success + '20',
        },
        statusInactive: {
          backgroundColor: theme.colors.textSecondary + '20',
        },
        statusSuspended: {
          backgroundColor: theme.colors.error + '20',
        },
        statusText: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: '600',
          textTransform: 'uppercase',
        },
        statusTextActive: {
          color: theme.colors.success,
        },
        statusTextInactive: {
          color: theme.colors.textSecondary,
        },
        statusTextSuspended: {
          color: theme.colors.error,
        },
      }),
    [theme],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.textSecondary }}>
            Business not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.infoContainer}>
          {/* Business Information */}
          <Text style={styles.sectionTitle}>BUSINESS INFORMATION</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Business Name</Text>
                <Text style={styles.infoValue}>{business.business_name}</Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Business Type</Text>
                <Text style={styles.infoValue}>
                  {formatBusinessType(business.business_type)}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <View
                  style={[
                    styles.statusBadge,
                    business.status === 'active' && styles.statusActive,
                    business.status === 'inactive' && styles.statusInactive,
                    business.status === 'suspended' && styles.statusSuspended,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      business.status === 'active' && styles.statusTextActive,
                      business.status === 'inactive' &&
                        styles.statusTextInactive,
                      business.status === 'suspended' &&
                        styles.statusTextSuspended,
                    ]}
                  >
                    {business.status}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>
                  {formatDate(business.created_at)}
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Business Phone</Text>
                <Text style={styles.infoValue}>
                  {business.business_phone || 'Not provided'}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Business Email</Text>
                <Text style={styles.infoValue}>
                  {business.business_email || 'Not provided'}
                </Text>
              </View>

              <View style={[styles.infoItem, styles.infoItemLast]}>
                <Text style={styles.infoLabel}>Business Address</Text>
                <Text style={styles.infoValue}>
                  {business.business_address || 'Not provided'}
                </Text>
              </View>
            </View>
          </View>

          {/* Description (if provided) */}
          {business.description && (
            <>
              <Text style={styles.sectionTitle}>DESCRIPTION</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoList}>
                  <View style={[styles.infoItem, styles.infoItemLast]}>
                    <Text
                      style={[
                        styles.infoValue,
                        { textAlign: 'left', flex: 1 },
                      ]}
                    >
                      {business.description}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Edit Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleEditBusiness}
          >
            <Text style={styles.actionButtonText}>Edit Business Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BusinessProfileView;
