// Created: BusinessAddress component for business location KYC - 2025-06-28

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import apiClient from '../../../../_api/apiClient';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

const BusinessAddress: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BusinessAddress'>>();
  const { theme } = useTheme();

  const [address, setAddress] = useState({
    street: '',
    city: '',
    country: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  const handleSave = async () => {
    if (!address.street.trim() || !address.city.trim()) {
      Alert.alert('Required Fields', 'Please fill in the address details.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/kyc/business-address', address);
      
      if (returnToTimeline) {
        navigation.navigate('VerifyYourIdentity', { sourceRoute });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Save Error', 'Unable to save address information.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (returnToTimeline) {
      navigation.navigate('VerifyYourIdentity', { sourceRoute });
    } else {
      navigation.goBack();
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: '600', color: theme.colors.textPrimary },
    saveButton: { 
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    saveButtonText: { 
      color: theme.colors.primary, 
      fontSize: theme.typography.fontSize.md, 
      fontWeight: '600' 
    },
    content: { padding: theme.spacing.lg },
    inputGroup: { marginBottom: theme.spacing.lg },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.card,
    },
    continueButton: {
      ...theme.commonStyles.primaryButton,
      marginTop: theme.spacing.xl,
    },
    continueButtonText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
    },
  }), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.name.includes('dark') ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Address</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              value={address.street}
              onChangeText={(text) => setAddress(prev => ({ ...prev, street: text }))}
              placeholder="Enter business address"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={address.city}
              onChangeText={(text) => setAddress(prev => ({ ...prev, city: text }))}
              placeholder="Enter city"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              value={address.country}
              onChangeText={(text) => setAddress(prev => ({ ...prev, country: text }))}
              placeholder="Enter country"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BusinessAddress; 