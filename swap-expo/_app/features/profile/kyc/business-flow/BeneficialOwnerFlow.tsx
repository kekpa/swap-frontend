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

import TeamMemberRoleSelection from './TeamMemberRoleSelection';
import BeneficialOwnerBasicInfo from './BeneficialOwnerBasicInfo';
import BeneficialOwnerNationality from './BeneficialOwnerNationality';
import BeneficialOwnerRole from './BeneficialOwnerRole';
import BeneficialOwnerContact from './BeneficialOwnerContact';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;

export type BeneficialOwnerStep =
  | 'roleSelection'
  | 'basicInfo'
  | 'nationality'
  | 'role'
  | 'contact';

export interface BeneficialOwnerData {
  // Role selection
  isAdminTeam?: boolean;
  isBeneficialOwner?: boolean;
  adminRole?: string; // OWNER, ADMIN, MANAGER
  // Basic info
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  birthDay?: number;
  birthMonth?: number;
  birthYear?: number;
  // Beneficial owner specific
  nationality?: string;
  position?: string;
  ownershipPercentage?: string;
  // Contact info
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

  const [step, setStep] = useState<BeneficialOwnerStep>('roleSelection');
  const [ownerData, setOwnerData] = useState<BeneficialOwnerData>({
    nationality: 'HT', // Default to Haiti
    isAdminTeam: false,
    isBeneficialOwner: false,
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
      // NEW: Use unified team-members endpoint
      const response = await apiClient.get(`/kyc/team-members/${ownerId}`);
      const member = response.data;

      // Convert API format to form format
      const convertedData: BeneficialOwnerData = {
        // Role selection
        isAdminTeam: member.isAdminTeam || false,
        isBeneficialOwner: member.isBeneficialOwner || false,
        adminRole: member.role || 'ADMIN',
        // Basic info
        firstName: member.firstName || '',
        middleName: member.middleName || '',
        lastName: member.lastName || '',
        // Beneficial owner specific
        nationality: member.nationality || 'HT',
        position: member.position || '',
        ownershipPercentage: member.ownershipPercentage?.toString() || '',
        // Contact info
        email: member.email || '',
        phone: member.phone || '',
      };

      // Parse birth date
      if (member.dateOfBirth) {
        const birthDate = new Date(member.dateOfBirth);
        if (!isNaN(birthDate.getTime())) {
          convertedData.birthDay = birthDate.getDate();
          convertedData.birthMonth = birthDate.getMonth() + 1;
          convertedData.birthYear = birthDate.getFullYear();
          convertedData.dateOfBirth = member.dateOfBirth;
        }
      }

      setOwnerData(convertedData);
      console.log('[TeamMemberFlow] Loaded team member data:', convertedData);
    } catch (error) {
      console.error('[TeamMemberFlow] Failed to load team member:', error);
      Alert.alert('Error', 'Failed to load team member information.');
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
        StatusBar.setBackgroundColor(theme.colors.card);
        StatusBar.setTranslucent(false);
      }
    }, [theme])
  );

  const handleBack = () => {
    console.log(`[TeamMemberFlow] handleBack from step: ${step}`);
    switch (step) {
      case 'basicInfo':
        setStep('roleSelection');
        break;
      case 'nationality':
        setStep('basicInfo');
        break;
      case 'role':
        // Skip nationality if only admin team
        if (ownerData.isAdminTeam && !ownerData.isBeneficialOwner) {
          setStep('basicInfo');
        } else {
          setStep('nationality');
        }
        break;
      case 'contact':
        // Skip role/ownership if only admin team
        if (ownerData.isAdminTeam && !ownerData.isBeneficialOwner) {
          setStep('basicInfo');
        } else {
          setStep('role');
        }
        break;
      default: // 'roleSelection'
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
    console.log(`[TeamMemberFlow] Moving from ${step} to next step`);
    switch (step) {
      case 'roleSelection':
        setStep('basicInfo');
        break;
      case 'basicInfo':
        // Skip nationality if only admin team
        if (ownerData.isAdminTeam && !ownerData.isBeneficialOwner) {
          setStep('contact');
        } else {
          setStep('nationality');
        }
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

      // NEW: Use unified team-members payload format (camelCase)
      const payload = {
        // Role selection
        isAdminTeam: ownerData.isAdminTeam || false,
        isBeneficialOwner: ownerData.isBeneficialOwner || false,
        role: ownerData.isAdminTeam ? (ownerData.adminRole || 'ADMIN') : undefined,
        // Basic info
        firstName: ownerData.firstName?.trim() || '',
        middleName: ownerData.middleName?.trim() || null,
        lastName: ownerData.lastName?.trim() || '',
        dateOfBirth: dateOfBirth || null,
        // Beneficial owner specific
        nationality: ownerData.isBeneficialOwner ? (ownerData.nationality || 'HT') : undefined,
        position: ownerData.isBeneficialOwner ? (ownerData.position?.trim() || null) : undefined,
        ownershipPercentage: ownerData.isBeneficialOwner && ownerData.ownershipPercentage
          ? parseFloat(ownerData.ownershipPercentage)
          : undefined,
        // Contact info
        email: ownerData.email?.trim() || null,
        phone: ownerData.phone?.trim() || null,
      };

      console.log('[TeamMemberFlow] Saving team member:', payload);

      if (mode === 'edit' && ownerId) {
        await apiClient.put(`/kyc/team-members/${ownerId}`, payload);
        Alert.alert('Success', 'Team member updated successfully');
      } else {
        await apiClient.post('/kyc/team-members', payload);
        Alert.alert('Success', 'Team member added successfully');
      }

      // Navigate back to list
      navigation.navigate('BeneficialOwnersList', {
        returnToTimeline,
        sourceRoute,
      });
    } catch (error: any) {
      console.error('[TeamMemberFlow] Failed to save team member:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save team member. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.card,
    },
  });

  // Get owner name for header display
  const ownerName = ownerData.firstName && ownerData.lastName
    ? `${ownerData.firstName} ${ownerData.lastName}`
    : 'New Owner';

  return (
    <SafeAreaView style={styles.container}>
      {step === 'roleSelection' && (
        <TeamMemberRoleSelection
          onBack={handleBack}
          onContinue={(data) => {
            updateOwnerData(data);
            moveToNextStep();
          }}
          initialData={{
            isAdminTeam: ownerData.isAdminTeam,
            isBeneficialOwner: ownerData.isBeneficialOwner,
            adminRole: ownerData.adminRole,
          }}
        />
      )}
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
