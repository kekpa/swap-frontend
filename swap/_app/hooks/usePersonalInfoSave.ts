import { useState } from 'react';
import { PersonalInfoData } from '../personal-info/PersonalInfoFlow';
import apiClient from '../../../../_api/apiClient';

export interface SavePersonalInfoRequest {
  firstName: string;
  lastName: string;
  birthDate: string;
  countryOfResidence: string;
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode: string;
    countryCode: string;
    latitude?: number;
    longitude?: number;
  };
}

export const usePersonalInfoSave = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savePersonalInfo = async (personalInfo: PersonalInfoData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert PersonalInfoData to API format
      const birthDate = `${personalInfo.birthYear}-${String(personalInfo.birthMonth).padStart(2, '0')}-${String(personalInfo.birthDay).padStart(2, '0')}`;
      
      const requestData: SavePersonalInfoRequest = {
        firstName: personalInfo.firstName || '',
        lastName: personalInfo.lastName || '',
        birthDate,
        countryOfResidence: personalInfo.country || '',
        address: {
          addressLine1: personalInfo.addressLine1 || '',
          addressLine2: personalInfo.addressLine2,
          city: personalInfo.city || '',
          postalCode: personalInfo.postalCode || '',
          countryCode: personalInfo.country || '', // Using same as country of residence for now
        }
      };

      console.log('[usePersonalInfoSave] Saving personal info:', requestData);

      const response = await apiClient.post('/kyc/personal-information', requestData);

      console.log('[usePersonalInfoSave] Personal info saved successfully:', response.data);
      return true;

    } catch (err: any) {
      console.error('[usePersonalInfoSave] Error saving personal info:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save personal information');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    savePersonalInfo,
    isLoading,
    error,
  };
}; 