// Created: Added hook to fetch saved personal information for KYC pre-population - 2025-06-07
import { useState, useEffect } from 'react';
import apiClient from '../_api/apiClient';

export interface PersonalInfo {
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
  } | null;
}

export const usePersonalInfoLoad = () => {
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonalInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/kyc/personal-information');
      
      console.log('[usePersonalInfoLoad] Full API Response:', response);
      console.log('[usePersonalInfoLoad] Parsed data:', response.data);
      
      // Extract the actual personal info data from the nested structure
      const personalInfoData = response.data?.data;
      console.log('[usePersonalInfoLoad] Final personal info data:', personalInfoData);
      
      setPersonalInfo(personalInfoData || null);
    } catch (err: any) {
      // 404 is expected when no personal info is saved yet
      if (err.response?.status === 404) {
        setPersonalInfo(null);
        setError(null);
      } else {
        console.error('[usePersonalInfoLoad] Error fetching personal info:', err);
        setError(err.response?.data?.message || 'Failed to fetch personal information');
        setPersonalInfo(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalInfo();
  }, []);

  const refetch = () => {
    fetchPersonalInfo();
  };

  return {
    personalInfo,
    loading,
    error,
    refetch,
  };
}; 