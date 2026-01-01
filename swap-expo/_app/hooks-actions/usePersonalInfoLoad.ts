// Created: Added hook to fetch saved personal information for KYC pre-population - 2025-06-07
import { useState, useEffect } from 'react';
import apiClient from '../_api/apiClient';
import logger from '../utils/logger';

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
      
      const response = await apiClient.get('/kyc/identity');

      logger.debug("API Response", "data", { data: response.data });

      // Extract the actual personal info data (API returns directly in response.data)
      const personalInfoData = response.data;
      logger.debug("Final personal info data", "data", { personalInfoData });

      setPersonalInfo(personalInfoData || null);
    } catch (err: any) {
      // 404 is expected when no personal info is saved yet
      if (err.response?.status === 404) {
        setPersonalInfo(null);
        setError(null);
      } else {
        logger.error("Error fetching personal info", err, "data");
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