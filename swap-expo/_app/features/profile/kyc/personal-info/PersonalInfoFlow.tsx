// Created: Added PersonalInfoFlow component for KYC verification - 2025-03-22
// Updated: Fixed personal info pre-population with proper address parsing and data validation - 2025-06-07
// Updated: Added context-aware navigation for better UX when updating vs first-time KYC - 2025-01-26
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, 
  StatusBar, 
  StyleSheet,
  Platform, // Import Platform
  Alert, // Import Alert for error handling
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../../../navigation/profileNavigator';
import { useTheme } from '../../../../theme/ThemeContext'; // Import useTheme
import { usePersonalInfoLoad } from '../../../../hooks-actions/usePersonalInfoLoad'; // Import the new hook
import { useKycCompletion } from '../../../../hooks-actions/useKycCompletion'; // Professional KYC completion system
import { invalidateQueries } from '../../../../tanstack-query/queryClient'; // Professional cache invalidation
import { eventCoordinator } from '../../../../utils/EventCoordinator'; // Professional event coordination

import CountryOfResidence from './CountryOfResidence';
import NameAsInId from './NameAsInId';
import DateOfBirth from './DateOfBirth';
import HomeAddress from './HomeAddress';
import ReviewInformation from './ReviewInformation';

type NavigationProp = StackNavigationProp<ProfileStackParamList>;
// type PersonalInfoFlowRouteProp = RouteProp<ProfileStackParamList, 'PersonalInfoFlow'>; // For typed route params

export type PersonalInfoStep = 
  | 'country' 
  | 'name' 
  | 'birth' 
  | 'address' 
  | 'review';

export interface PersonalInfoData {
  country?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  birthDay?: number;
  birthMonth?: number;
  birthYear?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
}

const PersonalInfoFlow: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'PersonalInfoFlow'>>();
  const { theme } = useTheme();
  const { completePersonalInfo } = useKycCompletion();
  const { personalInfo: savedPersonalInfo, loading } = usePersonalInfoLoad();
  // PROFESSIONAL: No more old reactive KYC operation tracking
  
  // Extract navigation context from route params
  const sourceRoute = route.params?.sourceRoute;
  const returnToTimeline = route.params?.returnToTimeline;

  console.log(`[PersonalInfoFlow] Mounted/Focused. sourceRoute: ${sourceRoute}, returnToTimeline: ${returnToTimeline}`);

  const [step, setStep] = useState<PersonalInfoStep>('country');
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoData>({});

  // Initialize personalInfo with saved data when it loads
  useEffect(() => {
    console.log('[PersonalInfoFlow] useEffect triggered - loading:', loading, 'savedPersonalInfo:', !!savedPersonalInfo);
    
    if (savedPersonalInfo && !loading) {
      console.log('[PersonalInfoFlow] Raw saved personal info:', savedPersonalInfo);
      
      // Convert saved format to PersonalInfoData format
      const convertedData: PersonalInfoData = {
        country: savedPersonalInfo.countryOfResidence || '',
        firstName: savedPersonalInfo.firstName || '',
        lastName: savedPersonalInfo.lastName || '',
        middleName: '', // Not stored separately in backend
      };

      // Parse birth date if it exists
      if (savedPersonalInfo.birthDate) {
        const birthDate = new Date(savedPersonalInfo.birthDate);
        if (!isNaN(birthDate.getTime())) {
          convertedData.birthDay = birthDate.getDate();
          convertedData.birthMonth = birthDate.getMonth() + 1; // getMonth() is 0-indexed
          convertedData.birthYear = birthDate.getFullYear();
        }
      }

      // Parse address data - handle both object and JSON string formats
      let addressData = null;
      if (savedPersonalInfo.address) {
        if (typeof savedPersonalInfo.address === 'string') {
          // If address is a JSON string, parse it
          try {
            addressData = JSON.parse(savedPersonalInfo.address);
            console.log('[PersonalInfoFlow] Parsed address JSON string:', addressData);
          } catch (error) {
            console.error('[PersonalInfoFlow] Failed to parse address JSON:', error);
          }
        } else {
          // If address is already an object, use it directly
          addressData = savedPersonalInfo.address;
          console.log('[PersonalInfoFlow] Address is already an object:', addressData);
        }
        
        if (addressData) {
          convertedData.addressLine1 = addressData.addressLine1 || '';
          convertedData.addressLine2 = addressData.addressLine2 || '';
          convertedData.city = addressData.city || '';
          convertedData.postalCode = addressData.postalCode || '';
        }
      }

      // Only update if we have meaningful data (not all empty)
      const hasData = convertedData.country || convertedData.firstName || convertedData.lastName || 
                     convertedData.birthDay || convertedData.addressLine1;
      
      if (hasData) {
        console.log('[PersonalInfoFlow] Final converted data:', convertedData);
        setPersonalInfo(convertedData);
      } else {
        console.log('[PersonalInfoFlow] No meaningful data found, keeping current state');
      }
    } else if (!loading && !savedPersonalInfo) {
      console.log('[PersonalInfoFlow] No saved personal info found (new user)');
    }
  }, [savedPersonalInfo, loading]);

  // Centralized status bar management for all steps in this flow
  useFocusEffect(
    React.useCallback(() => {
      // The header background for all these child screens is theme.colors.background
      const headerBackgroundColor = theme.colors.background;
      const isDarkBackground = theme.isDark;

      StatusBar.setBarStyle(isDarkBackground ? 'light-content' : 'dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(headerBackgroundColor);
        StatusBar.setTranslucent(false);
      }
      
      // Optional: Return a cleanup function if needed when the screen loses focus
      // For example, to reset to a global status bar style if this flow is part of a larger navigator
      // return () => StatusBar.setBarStyle('default'); 
    }, [theme]) // Re-run effect if theme changes
  );

  const handleBack = () => {
    console.log(`[PersonalInfoFlow] handleBack from step: ${step}, returnToTimeline: ${returnToTimeline}`);
    switch (step) {
      case 'name':
        setStep('country');
        break;
      case 'birth':
        setStep('name');
        break;
      case 'address':
        setStep('birth');
        break;
      case 'review':
        setStep('address');
        break;
      default: // 'country' or any other initial step
        // Always return to timeline when in KYC flow
        if (returnToTimeline) {
          console.log(`[PersonalInfoFlow] Returning to VerifyYourIdentity timeline`);
          navigation.navigate('VerifyYourIdentity', sourceRoute ? { sourceRoute } : undefined);
        } else {
          // Default back behavior for non-KYC usage
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
            navigation.navigate('VerifyYourIdentity', sourceRoute ? { sourceRoute } : undefined);
          }
        }
        break;
    }
  };

  const updatePersonalInfo = (data: Partial<PersonalInfoData>) => {
    setPersonalInfo(prevData => ({ ...prevData, ...data }));
  };

  const moveToNextStep = () => {
    switch (step) {
      case 'country':
        setStep('name');
        break;
      case 'name':
        setStep('birth');
        break;
      case 'birth':
        setStep('address');
        break;
      case 'address':
        setStep('review');
        break;
      case 'review':
        // This should not be called directly for review step
        // handleReviewConfirm should be used instead
        console.log(`[PersonalInfoFlow] Unexpected call to moveToNextStep from review`);
        break;
    }
  };

  const handleReviewConfirm = async () => {
    try {
      console.log(`🔬 [PersonalInfoFlow] PROFESSIONAL: Starting KYC completion with EventCoordinator`);

      // Prepare data for API
      const apiData = {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        middleName: personalInfo.middleName || null,
        birthDate: personalInfo.birthDay && personalInfo.birthMonth && personalInfo.birthYear
          ? `${personalInfo.birthYear}-${String(personalInfo.birthMonth).padStart(2, '0')}-${String(personalInfo.birthDay).padStart(2, '0')}`
          : null,
        countryOfResidence: personalInfo.country,
        address: {
          addressLine1: personalInfo.addressLine1,
          addressLine2: personalInfo.addressLine2 || '',
          city: personalInfo.city,
          postalCode: personalInfo.postalCode,
          countryCode: personalInfo.country || 'HT'
        }
      };

      // PROFESSIONAL: Use EventCoordinator for KYC operation coordination
      console.log(`🔬 [PersonalInfoFlow] PROFESSIONAL: Coordinating KYC completion operation`);

      const result = await completePersonalInfo(apiData, {
        skipNavigation: true, // We'll handle navigation ourselves
        showSuccessAlert: false,
        customSuccessMessage: 'Personal information saved successfully!'
      });

      console.log(`🔬 [PersonalInfoFlow] PROFESSIONAL: KYC completion result:`, result.success);

      if (result.success) {
        console.log(`🔬 [PersonalInfoFlow] PROFESSIONAL: KYC completion successful - triggering cache invalidation`);

        // PROFESSIONAL CACHE INVALIDATION
        invalidateQueries(['kyc']); // Invalidate all KYC-related queries
        invalidateQueries(['profile']); // Also invalidate profile data

        // PROFESSIONAL: Use EventCoordinator for data coordination
        eventCoordinator.emitDataUpdated('kyc', apiData, {
          source: 'PersonalInfoFlow.handleReviewConfirm',
          action: 'personal_info_completed'
        });

        console.log(`🔬 [PersonalInfoFlow] PROFESSIONAL: Cache invalidation and event coordination triggered`);

        // Brief delay for cache invalidation propagation
        setTimeout(() => {
          console.log(`🔬 [PersonalInfoFlow] PROFESSIONAL: Starting navigation`);

          // PROFESSIONAL NAVIGATION
          if (returnToTimeline) {
            console.log(`🔬 [PersonalInfoFlow] PROFESSIONAL: Navigating to VerifyYourIdentity`);
            navigation.navigate('VerifyYourIdentity', sourceRoute ? { sourceRoute } : undefined);
          } else {
            console.log(`🔬 [PersonalInfoFlow] PROFESSIONAL: Navigating to UploadId`);
            navigation.navigate('UploadId', { sourceRoute });
          }
        }, 100); // Brief delay for cache invalidation

      } else {
        console.log(`🔬 [PersonalInfoFlow] PROFESSIONAL: KYC completion failed`);
        const errorMessage = result.error?.message || 'Failed to save personal information. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error(`🔬 [PersonalInfoFlow] PROFESSIONAL: Error in handleReviewConfirm:`, error);
      Alert.alert('Error', 'An error occurred while saving personal information. Please try again.');
    }
  };

  const renderStep = () => {
    // All child components will now receive onBack and their specific onContinue, plus existing data props.
    // They don't need direct access to sourceRoute as PersonalInfoFlow handles the back navigation to VerifyYourIdentity.
    switch (step) {
      case 'country':
        return (
          <CountryOfResidence
            onBack={handleBack}
            onContinue={(country: string) => {
              updatePersonalInfo({ country });
              moveToNextStep();
            }}
            selectedCountry={personalInfo.country}
          />
        );
      case 'name':
        return (
          <NameAsInId
            onBack={handleBack}
            onContinue={(firstName: string, middleName: string, lastName: string) => {
              updatePersonalInfo({ firstName, middleName, lastName });
              moveToNextStep();
            }}
            firstName={personalInfo.firstName}
            middleName={personalInfo.middleName}
            lastName={personalInfo.lastName}
          />
        );
      case 'birth':
        return (
          <DateOfBirth
            onBack={handleBack}
            onContinue={(day: number, month: number, year: number) => {
              updatePersonalInfo({ birthDay: day, birthMonth: month, birthYear: year });
              moveToNextStep();
            }}
            day={personalInfo.birthDay}
            month={personalInfo.birthMonth}
            year={personalInfo.birthYear}
          />
        );
      case 'address':
        return (
          <HomeAddress
            onBack={handleBack}
            onContinue={(addressLine1: string, addressLine2: string, city: string, postalCode: string) => {
              updatePersonalInfo({ addressLine1, addressLine2, city, postalCode });
              moveToNextStep();
            }}
            addressLine1={personalInfo.addressLine1}
            addressLine2={personalInfo.addressLine2}
            city={personalInfo.city}
            postalCode={personalInfo.postalCode}
          />
        );
      case 'review':
        return (
          <ReviewInformation
            onBack={handleBack}
            onContinue={handleReviewConfirm}
            personalInfo={personalInfo}
          />
        );
      default:
        return null;
    }
  };

  // Use dynamic styles based on theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background, // Use theme background color
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* StatusBar component is no longer explicitly rendered here, it's controlled by useFocusEffect */}
      {renderStep()}
    </SafeAreaView>
  );
};

export default PersonalInfoFlow; 