// Created: BeneficialOwnerFlow - Multi-step flow for adding/editing beneficial owners - 2025-11-11

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext';
import apiClient from '../../../../_api/apiClient';

import BeneficialOwnerBasicInfo from './BeneficialOwnerBasicInfo';
import BeneficialOwnerNationality from './BeneficialOwnerNationality';
import BeneficialOwnerRole from './BeneficialOwnerRole';
import BeneficialOwnerContact from './BeneficialOwnerContact';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

export type BeneficialOwnerStep =
  | 'basicInfo'
  | 'nationality'
  | 'role'
  | 'contact';

export interface BeneficialOwnerData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  birthDay?: number;
  birthMonth?: number;
  birthYear?: number;
  nationality?: string;
  position?: string;
  ownershipPercentage?: string;
  email?: string;
  phone?: string;
}

const BeneficialOwnerFlow: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'BeneficialOwnerFlow'>>();
  const { theme } = useTheme();

  const mode = route.params?.mode || 'add';
  const ownerId = route.params?.ownerId;
  const returnToTimeline = route.params?.returnToTimeline;
  const sourceRoute = route.params?.sourceRoute;

  const [step, setStep] = useState<BeneficialOwnerStep>('basicInfo');
  const [ownerData, setOwnerData] = useState<BeneficialOwnerData>({
    nationality: 'HT', // Default to Haiti
  });
  const [isLoading, setIsLoading] = useState(false);

  console.log(`[BeneficialOwnerFlow] Mode: ${mode}, Step: ${step}`);

  // Load existing owner data if editing
  useEffect(() => {
    if (mode === 'edit' && ownerId) {
      fetchOwnerData();
    }
  }, [mode, ownerId]);

  const fetchOwnerData = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/kyc/beneficial-owners/${ownerId}`);
      const owner = response.data;

      // Convert API format to form format
      const convertedData: BeneficialOwnerData = {
        firstName: owner.first_name || '',
        middleName: owner.middle_name || '',
        lastName: owner.last_name || '',
        nationality: owner.nationality || 'HT',
        position: owner.position || '',
        ownershipPercentage: owner.ownership_percentage?.toString() || '',
        email: owner.email || '',
        phone: owner.phone || '',
      };

      // Parse birth date
      if (owner.date_of_birth) {
        const birthDate = new Date(owner.date_of_birth);
        if (!isNaN(birthDate.getTime())) {
          convertedData.birthDay = birthDate.getDate();
          convertedData.birthMonth = birthDate.getMonth() + 1;
          convertedData.birthYear = birthDate.getFullYear();
          convertedData.dateOfBirth = owner.date_of_birth;
        }
      }

      setOwnerData(convertedData);
      console.log('[BeneficialOwnerFlow] Loaded owner data:', convertedData);
    } catch (error) {
      console.error('[BeneficialOwnerFlow] Failed to load owner:', error);
      Alert.alert('Error', 'Failed to load owner information.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manage status bar for all steps
  useFocusEffect(
    React.useCallback(() => {
      const isDarkBackground = theme.isDark;
      StatusBar.setBarStyle(isDarkBackground ? 'light-content' : 'dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(theme.colors.background);
        StatusBar.setTranslucent(false);
      }
    }, [theme])
  );

  const handleBack = () => {
    console.log(`[BeneficialOwnerFlow] handleBack from step: ${step}`);
    switch (step) {
      case 'nationality':
        setStep('basicInfo');
        break;
      case 'role':
        setStep('nationality');
        break;
      case 'contact':
        setStep('role');
        break;
      default: // 'basicInfo'
        // Return to list
        navigation.navigate('BeneficialOwnersList', {
          returnToTimeline,
          sourceRoute,
        });
        break;
    }
  };

  const updateOwnerData = (data: Partial<BeneficialOwnerData>) => {
    setOwnerData(prevData => ({ ...prevData, ...data }));
    console.log('[BeneficialOwnerFlow] Updated owner data:', { ...ownerData, ...data });
  };

  const moveToNextStep = () => {
    console.log(`[BeneficialOwnerFlow] Moving from ${step} to next step`);
    switch (step) {
      case 'basicInfo':
        setStep('nationality');
        break;
      case 'nationality':
        setStep('role');
        break;
      case 'role':
        setStep('contact');
        break;
      case 'contact':
        // Save and return to list
        saveOwner();
        break;
    }
  };

  const saveOwner = async () => {
    setIsLoading(true);
    try {
      // Format birth date
      let dateOfBirth = '';
      if (ownerData.birthYear && ownerData.birthMonth && ownerData.birthDay) {
        dateOfBirth = `${ownerData.birthYear}-${String(ownerData.birthMonth).padStart(2, '0')}-${String(ownerData.birthDay).padStart(2, '0')}`;
      }

      const payload = {
        first_name: ownerData.firstName?.trim() || '',
        middle_name: ownerData.middleName?.trim() || null,
        last_name: ownerData.lastName?.trim() || '',
        date_of_birth: dateOfBirth,
        nationality: ownerData.nationality || 'HT',
        position: ownerData.position?.trim() || '',
        ownership_percentage: ownerData.ownershipPercentage ? parseFloat(ownerData.ownershipPercentage) : null,
        email: ownerData.email?.trim() || null,
        phone: ownerData.phone?.trim() || null,
      };

      console.log('[BeneficialOwnerFlow] Saving owner:', payload);

      if (mode === 'edit' && ownerId) {
        await apiClient.put(`/kyc/beneficial-owners/${ownerId}`, payload);
        Alert.alert('Success', 'Beneficial owner updated successfully');
      } else {
        await apiClient.post('/kyc/beneficial-owners', payload);
        Alert.alert('Success', 'Beneficial owner added successfully');
      }

      // Navigate back to list
      navigation.navigate('BeneficialOwnersList', {
        returnToTimeline,
        sourceRoute,
      });
    } catch (error: any) {
      console.error('[BeneficialOwnerFlow] Failed to save owner:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save beneficial owner. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });

  // Get owner name for header display
  const ownerName = ownerData.firstName && ownerData.lastName
    ? `${ownerData.firstName} ${ownerData.lastName}`
    : 'New Owner';

  return (
    <SafeAreaView style={styles.container}>
      {step === 'basicInfo' && (
        <BeneficialOwnerBasicInfo
          onBack={handleBack}
          onContinue={(data) => {
            updateOwnerData(data);
            moveToNextStep();
          }}
          initialData={ownerData}
        />
      )}
      {step === 'nationality' && (
        <BeneficialOwnerNationality
          onBack={handleBack}
          onContinue={(nationality) => {
            updateOwnerData({ nationality });
            moveToNextStep();
          }}
          selectedNationality={ownerData.nationality}
          ownerName={ownerName}
        />
      )}
      {step === 'role' && (
        <BeneficialOwnerRole
          onBack={handleBack}
          onContinue={(data) => {
            updateOwnerData(data);
            moveToNextStep();
          }}
          initialData={ownerData}
          ownerName={ownerName}
        />
      )}
      {step === 'contact' && (
        <BeneficialOwnerContact
          onBack={handleBack}
          onContinue={(data) => {
            updateOwnerData(data);
            moveToNextStep();
          }}
          initialData={ownerData}
          ownerName={ownerName}
          isLoading={isLoading}
        />
      )}
    </SafeAreaView>
  );
};

export default BeneficialOwnerFlow;
