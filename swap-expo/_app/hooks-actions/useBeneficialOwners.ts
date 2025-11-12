// Created: Beneficial owners CRUD hooks for business KYC - 2025-11-11

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../_api/apiClient';

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

      console.log('[useBeneficialOwners] Fetched owners:', response.data);
      setOwners(response.data || []);
    } catch (err: any) {
      // 404 is expected when no owners exist yet
      if (err.response?.status === 404) {
        setOwners([]);
        setError(null);
      } else {
        console.error('[useBeneficialOwners] Error fetching owners:', err);
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

      console.log('[useAddBeneficialOwner] Adding owner:', ownerData);

      // TODO: Update endpoint when backend is ready
      const response = await apiClient.post('/kyc/beneficial-owners', ownerData);

      console.log('[useAddBeneficialOwner] Owner added:', response.data);
      return response.data;
    } catch (err: any) {
      console.error('[useAddBeneficialOwner] Error adding owner:', err);
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
      console.log('[useUpdateBeneficialOwner] Updating owner:', id, updateData);

      // TODO: Update endpoint when backend is ready
      const response = await apiClient.put(`/kyc/beneficial-owners/${id}`, updateData);

      console.log('[useUpdateBeneficialOwner] Owner updated:', response.data);
      return response.data;
    } catch (err: any) {
      console.error('[useUpdateBeneficialOwner] Error updating owner:', err);
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

      console.log('[useDeleteBeneficialOwner] Deleting owner:', ownerId);

      // TODO: Update endpoint when backend is ready
      await apiClient.delete(`/kyc/beneficial-owners/${ownerId}`);

      console.log('[useDeleteBeneficialOwner] Owner deleted successfully');
      return true;
    } catch (err: any) {
      console.error('[useDeleteBeneficialOwner] Error deleting owner:', err);
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

      console.log('[useBeneficialOwner] Fetching owner:', ownerId);

      // TODO: Update endpoint when backend is ready
      const response = await apiClient.get(`/kyc/beneficial-owners/${ownerId}`);

      console.log('[useBeneficialOwner] Fetched owner:', response.data);
      setOwner(response.data);
    } catch (err: any) {
      console.error('[useBeneficialOwner] Error fetching owner:', err);
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
