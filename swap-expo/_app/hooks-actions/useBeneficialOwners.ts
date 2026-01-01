// Created: Beneficial owners CRUD hooks for business KYC - 2025-11-11

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../_api/apiClient';
import logger from '../utils/logger';

export interface BeneficialOwner {
  id: string;
  kycProcessId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  position: string;
  ownershipPercentage?: number;
  idType: string;
  idNumber: string;
  email?: string;
  phone?: string;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode?: string;
    country: string;
  };
  verificationStatus?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBeneficialOwnerInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  position: string;
  ownershipPercentage?: number;
  idType: string;
  idNumber: string;
  email?: string;
  phone?: string;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode?: string;
    country: string;
  };
}

export interface UpdateBeneficialOwnerInput extends Partial<CreateBeneficialOwnerInput> {
  id: string;
}

/**
 * Hook for fetching all beneficial owners for the current KYC process
 */
export const useBeneficialOwners = () => {
  const [owners, setOwners] = useState<BeneficialOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOwners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Update endpoint when backend is ready
      const response = await apiClient.get('/kyc/beneficial-owners');

      logger.debug('Fetched beneficial owners', 'kyc', { count: response.data?.length || 0 });
      setOwners(response.data || []);
    } catch (err: any) {
      // 404 is expected when no owners exist yet
      if (err.response?.status === 404) {
        setOwners([]);
        setError(null);
      } else {
        logger.error('Error fetching beneficial owners', err, 'kyc');
        setError(err.response?.data?.message || 'Failed to fetch beneficial owners');
        setOwners([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const refetch = () => {
    fetchOwners();
  };

  return {
    owners,
    loading,
    error,
    refetch,
  };
};

/**
 * Hook for adding a new beneficial owner
 */
export const useAddBeneficialOwner = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addOwner = async (ownerData: CreateBeneficialOwnerInput): Promise<BeneficialOwner | null> => {
    try {
      setLoading(true);
      setError(null);

      logger.debug('Adding beneficial owner', 'kyc');

      // TODO: Update endpoint when backend is ready
      const response = await apiClient.post('/kyc/beneficial-owners', ownerData);

      logger.info('Beneficial owner added', 'kyc');
      return response.data;
    } catch (err: any) {
      logger.error('Error adding beneficial owner', err, 'kyc');
      setError(err.response?.data?.message || 'Failed to add beneficial owner');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    addOwner,
    loading,
    error,
  };
};

/**
 * Hook for updating an existing beneficial owner
 */
export const useUpdateBeneficialOwner = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOwner = async (ownerData: UpdateBeneficialOwnerInput): Promise<BeneficialOwner | null> => {
    try {
      setLoading(true);
      setError(null);

      const { id, ...updateData } = ownerData;
      logger.debug('Updating beneficial owner', 'kyc', { id });

      // TODO: Update endpoint when backend is ready
      const response = await apiClient.put(`/kyc/beneficial-owners/${id}`, updateData);

      logger.info('Beneficial owner updated', 'kyc');
      return response.data;
    } catch (err: any) {
      logger.error('Error updating beneficial owner', err, 'kyc');
      setError(err.response?.data?.message || 'Failed to update beneficial owner');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateOwner,
    loading,
    error,
  };
};

/**
 * Hook for deleting a beneficial owner
 */
export const useDeleteBeneficialOwner = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteOwner = async (ownerId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      logger.debug('Deleting beneficial owner', 'kyc', { ownerId });

      // TODO: Update endpoint when backend is ready
      await apiClient.delete(`/kyc/beneficial-owners/${ownerId}`);

      logger.info('Beneficial owner deleted successfully', 'kyc');
      return true;
    } catch (err: any) {
      logger.error('Error deleting beneficial owner', err, 'kyc');
      setError(err.response?.data?.message || 'Failed to delete beneficial owner');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteOwner,
    loading,
    error,
  };
};

/**
 * Hook for getting a single beneficial owner by ID
 */
export const useBeneficialOwner = (ownerId: string | null) => {
  const [owner, setOwner] = useState<BeneficialOwner | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOwner = useCallback(async () => {
    if (!ownerId) {
      setOwner(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.debug('Fetching beneficial owner', 'kyc', { ownerId });

      // TODO: Update endpoint when backend is ready
      const response = await apiClient.get(`/kyc/beneficial-owners/${ownerId}`);

      logger.debug('Fetched beneficial owner', 'kyc');
      setOwner(response.data);
    } catch (err: any) {
      logger.error('Error fetching beneficial owner', err, 'kyc');
      setError(err.response?.data?.message || 'Failed to fetch beneficial owner');
      setOwner(null);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    fetchOwner();
  }, [fetchOwner]);

  const refetch = () => {
    fetchOwner();
  };

  return {
    owner,
    loading,
    error,
    refetch,
  };
};
