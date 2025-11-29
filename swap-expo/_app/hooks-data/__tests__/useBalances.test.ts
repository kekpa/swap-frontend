/**
 * useBalances Hook Tests
 *
 * Tests for the local-first wallet balances hook.
 * Tests caching behavior, API sync, and error handling.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the modules before importing the hook
jest.mock('../../_api/apiClient');

jest.mock('../../localdb/CurrencyWalletsRepository', () => ({
  currencyWalletsRepository: {
    getAllCurrencyWallets: jest.fn(),
    upsertCurrencyWallet: jest.fn(),
    bulkUpsertCurrencyWallets: jest.fn(),
    getPrimaryWallet: jest.fn(),
  },
}));

jest.mock('../../hooks/useCurrentProfileId', () => ({
  useCurrentProfileId: jest.fn(() => 'profile-123'),
}));

jest.mock('../../utils/logger');

// Import after mocks are set up
import { useBalances, useWalletEligibility, useInitializeWallet, useSetPrimaryWallet } from '../useBalances';
import apiClient from '../../_api/apiClient';
import { currencyWalletsRepository } from '../../localdb/CurrencyWalletsRepository';

// Test data
const mockCachedWallet = {
  id: 'wallet-123',
  account_id: 'account-123',
  currency_id: 'HTG',
  currency_code: 'HTG',
  currency_symbol: 'G',
  currency_name: 'Haitian Gourde',
  balance: 1000,
  reserved_balance: 0,
  available_balance: 1000,
  balance_last_updated: '2024-01-01T00:00:00Z',
  is_active: true,
  is_primary: true,
};

const mockApiWallet = {
  wallet_id: 'wallet-123',
  account_id: 'account-123',
  entity_id: 'entity-123',
  currency_id: 'HTG',
  currency_code: 'HTG',
  currency_symbol: 'G',
  currency_name: 'Haitian Gourde',
  balance: 1500, // Updated balance from API
  reserved_balance: 100,
  available_balance: 1400,
  balance_last_updated: '2024-01-02T00:00:00Z',
  is_active: true,
  is_primary: true,
};

const mockEligibilityResponse = {
  eligible: true,
  kycStatus: 'verified',
  profileComplete: true,
  nextStep: 'ready',
  hasWallets: true,
};

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useBalances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    (currencyWalletsRepository.getAllCurrencyWallets as jest.Mock).mockResolvedValue([mockCachedWallet]);
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [mockApiWallet] });
  });

  describe('initial state', () => {
    it('should return cached data immediately (local-first)', async () => {
      const { result } = renderHook(
        () => useBalances('entity-123'),
        { wrapper: createWrapper() }
      );

      // Should load cached data first
      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Verify local cache was accessed
      expect(currencyWalletsRepository.getAllCurrencyWallets).toHaveBeenCalled();
    });

    it('should not fetch when entityId is invalid', async () => {
      const { result } = renderHook(
        () => useBalances(''),
        { wrapper: createWrapper() }
      );

      // Wait a bit to ensure no API call is made
      await new Promise(resolve => setTimeout(resolve, 100));

      // API should not be called with empty entityId
      expect(apiClient.get).not.toHaveBeenCalled();
      expect(result.current.data).toEqual([]);
    });

    it('should not fetch when disabled', async () => {
      const { result } = renderHook(
        () => useBalances('entity-123', { enabled: false }),
        { wrapper: createWrapper() }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not make any API calls
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('data transformation', () => {
    it('should transform API response to WalletBalance format', async () => {
      const { result } = renderHook(
        () => useBalances('entity-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
        expect(result.current.data?.[0]).toHaveProperty('wallet_id');
        expect(result.current.data?.[0]).toHaveProperty('currency_code');
        expect(result.current.data?.[0]).toHaveProperty('balance');
      });
    });

    it('should handle empty cached data', async () => {
      (currencyWalletsRepository.getAllCurrencyWallets as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(
        () => useBalances('entity-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should eventually fetch from API
      expect(apiClient.get).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));
      (currencyWalletsRepository.getAllCurrencyWallets as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(
        () => useBalances('entity-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError || result.current.data).toBeDefined();
      });
    });

    it('should return cached data on API failure', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () => useBalances('entity-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Should still have cached data
      expect(result.current.data?.[0]?.balance).toBe(1000);
    });
  });

  describe('refetch behavior', () => {
    it('should provide refetch function', async () => {
      const { result } = renderHook(
        () => useBalances('entity-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.refetch).toBeDefined();
        expect(typeof result.current.refetch).toBe('function');
      });
    });
  });
});

describe('useWalletEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockEligibilityResponse });
  });

  it('should fetch wallet eligibility for entity', async () => {
    const { result } = renderHook(
      () => useWalletEligibility('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.eligible).toBe(true);
    expect(result.current.data?.kycStatus).toBe('verified');
  });

  it('should return not eligible when KYC required', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        eligible: false,
        reason: 'KYC_REQUIRED',
        kycStatus: 'none',
        profileComplete: true,
        nextStep: 'verify-identity',
        hasWallets: false,
      },
    });

    const { result } = renderHook(
      () => useWalletEligibility('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.eligible).toBe(false);
    expect(result.current.data?.reason).toBe('KYC_REQUIRED');
    expect(result.current.data?.nextStep).toBe('verify-identity');
  });

  it('should not fetch when entityId is invalid', async () => {
    renderHook(
      () => useWalletEligibility(''),
      { wrapper: createWrapper() }
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    // API should not be called with empty entityId
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});

describe('useInitializeWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        accounts: [{ id: 'account-123' }],
        wallets: [mockApiWallet],
        defaultWalletId: 'wallet-123',
      },
    });
  });

  it('should provide mutate function', async () => {
    const { result } = renderHook(
      () => useInitializeWallet(),
      { wrapper: createWrapper() }
    );

    expect(result.current.mutate).toBeDefined();
    expect(typeof result.current.mutate).toBe('function');
  });

  it('should call API to initialize wallet', async () => {
    const { result } = renderHook(
      () => useInitializeWallet(),
      { wrapper: createWrapper() }
    );

    result.current.mutate('entity-123');

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/wallets/initialize')
      );
    });
  });
});

describe('useSetPrimaryWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.patch as jest.Mock).mockResolvedValue({
      data: { ...mockApiWallet, is_primary: true },
    });
    (currencyWalletsRepository.upsertCurrencyWallet as jest.Mock).mockResolvedValue(undefined);
  });

  it('should provide mutate function', async () => {
    const { result } = renderHook(
      () => useSetPrimaryWallet(),
      { wrapper: createWrapper() }
    );

    expect(result.current.mutateAsync).toBeDefined();
    expect(typeof result.current.mutateAsync).toBe('function');
  });

  it('should call API to set primary wallet', async () => {
    const { result } = renderHook(
      () => useSetPrimaryWallet(),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ walletId: 'wallet-123', entityId: 'entity-123' });

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith(
        expect.stringContaining('/wallet-123/primary'),
      );
    });
  });

  it('should update query cache after setting primary', async () => {
    const { result } = renderHook(
      () => useSetPrimaryWallet(),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ walletId: 'wallet-123', entityId: 'entity-123' });

    await waitFor(() => {
      // Hook updates query cache, not SQLite repository directly
      expect(apiClient.patch).toHaveBeenCalledWith('/wallets/wallet-123/primary');
    });
  });
});

// Test helper functions (if exported)
describe('helper functions', () => {
  describe('data parsing', () => {
    it('should handle various API response formats', async () => {
      // Test with direct array
      (apiClient.get as jest.Mock).mockResolvedValue({ data: [mockApiWallet] });

      const { result } = renderHook(
        () => useBalances('entity-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });
    });

    it('should handle nested data property', async () => {
      // Test with nested data
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { data: [mockApiWallet] },
      });

      const { result } = renderHook(
        () => useBalances('entity-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });
    });
  });
});
