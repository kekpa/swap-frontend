import { useState } from 'react';
import { PersonalInfoData } from '../features/profile/kyc/personal-info/PersonalInfoFlow';
import apiClient from '../_api/apiClient';
import logger from '../utils/logger';

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

      logger.debug('Starting simple API call (original working pattern)', 'kyc');
      logger.debug('Saving personal info', 'kyc', { requestData });

      const response = await apiClient.post('/kyc/personal-information', requestData);

      logger.debug('Simple API call completed successfully - NO EVENT EMISSION', 'kyc');
      logger.debug('Personal info saved successfully', 'kyc', { response: response.data });
      return true;

    } catch (err: any) {
      logger.error('Error saving personal info', err, 'kyc');
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