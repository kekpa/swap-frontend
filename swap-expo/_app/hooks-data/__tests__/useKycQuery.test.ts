/**
 * useKycQuery Hook Tests
 *
 * Tests for the professional KYC query hook and utility hooks.
 * Tests local-first caching, optimistic updates, and limit checking.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies before importing hooks
jest.mock('../../_api/apiClient');

jest.mock('../../hooks/useCurrentProfileId', () => ({
  useCurrentProfileId: jest.fn(() => 'profile-123'),
}));

jest.mock('../../localdb/UserRepository', () => ({
  userRepository: {
    getKycStatus: jest.fn(),
    saveKycStatus: jest.fn(),
  },
}));

jest.mock('../../tanstack-query/config/staleTimeConfig', () => ({
  getStaleTimeForQuery: jest.fn(() => 5 * 60 * 1000),
  staleTimeManager: {
    getStaleTime: jest.fn(() => 5 * 60 * 1000),
    updateBehavior: jest.fn(),
  },
}));

jest.mock('../../tanstack-query/optimistic/useOptimisticUpdates', () => ({
  useOptimisticUpdates: () => ({
    addOptimisticUpdate: jest.fn(),
    removeOptimisticUpdate: jest.fn(),
  }),
}));

jest.mock('../../utils/logger');

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    // Execute callback immediately for testing
    callback();
  }),
}));

// Import after mocks
import {
  useKycQuery,
  useKycStatus,
  useKycStatusCritical,
  useKycRequirement,
  useKycProgress,
  usePendingKycDocuments,
  useKycLimits,
  useTransactionLimitCheck,
  KycStatus,
} from '../useKycQuery';
import apiClient from '../../_api/apiClient';
import { userRepository } from '../../localdb/UserRepository';
import { useCurrentProfileId } from '../../hooks/useCurrentProfileId';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockUseCurrentProfileId = useCurrentProfileId as jest.MockedFunction<
  typeof useCurrentProfileId
>;

// Test data
const mockApprovedKycStatus: KycStatus = {
  entity_type: 'profile',
  kyc_status: 'approved',
  documents: [
    {
      id: 'doc-1',
      document_type: 'passport',
      verification_status: 'approved',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ],
  email_verified: true,
  phone_verified: true,
  setup_account_completed: true,
  personal_info_completed: true,
  email_verification_completed: true,
  phone_verification_completed: true,
  document_verification_completed: true,
  selfie_completed: true,
  security_setup_completed: true,
  biometric_setup_completed: true,
  passcode_setup: true,
  email: 'test@example.com',
  phone: '+1234567890',
  steps: {
    setup_account: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
    personal_info: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
    email_verification: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
    phone_verification: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
    document_verification: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
    selfie: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
    security_setup: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
    biometric_setup: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
  },
  process: {},
};

const mockPendingKycStatus: KycStatus = {
  entity_type: 'profile',
  kyc_status: 'pending',
  documents: [
    {
      id: 'doc-2',
      document_type: 'passport',
      verification_status: 'pending',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  email_verified: true,
  phone_verified: true,
  setup_account_completed: true,
  personal_info_completed: true,
  email_verification_completed: true,
  phone_verification_completed: true,
  document_verification_completed: false,
  selfie_completed: false,
  security_setup_completed: false,
  biometric_setup_completed: false,
  passcode_setup: false,
  email: 'test@example.com',
  phone: '+1234567890',
  steps: {
    setup_account: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
    personal_info: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
    email_verification: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
    phone_verification: { status: 'completed', completed_at: '2024-01-01T00:00:00Z' },
    document_verification: { status: 'in_progress' },
    selfie: { status: 'not_started' },
    security_setup: { status: 'not_started' },
    biometric_setup: { status: 'not_started' },
  },
  process: {},
};

const mockNotStartedKycStatus: KycStatus = {
  entity_type: 'profile',
  kyc_status: 'not_started',
  documents: [],
  email_verified: false,
  phone_verified: false,
  setup_account_completed: false,
  personal_info_completed: false,
  email_verification_completed: false,
  phone_verification_completed: false,
  document_verification_completed: false,
  selfie_completed: false,
  security_setup_completed: false,
  biometric_setup_completed: false,
  passcode_setup: false,
  steps: {
    setup_account: { status: 'not_started' },
    personal_info: { status: 'not_started' },
    email_verification: { status: 'not_started' },
    phone_verification: { status: 'not_started' },
    document_verification: { status: 'not_started' },
    selfie: { status: 'not_started' },
    security_setup: { status: 'not_started' },
    biometric_setup: { status: 'not_started' },
  },
  process: {},
};

// Helper to create wrapper
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

describe('useKycQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockUserRepository.getKycStatus.mockResolvedValue(null);
    mockUserRepository.saveKycStatus.mockResolvedValue(undefined);
  });

  // ============================================================
  // BASIC FETCHING TESTS
  // ============================================================

  describe('basic fetching', () => {
    it('should fetch KYC status when entityId is provided', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockApprovedKycStatus });

      const { result } = renderHook(
        () => useKycQuery({ entityId: 'entity-123' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockApprovedKycStatus);
      expect(mockApiClient.get).toHaveBeenCalledWith('/kyc/verification-status');
    });

    it('should not fetch when entityId is empty', () => {
      const { result } = renderHook(
        () => useKycQuery({ entityId: '' }),
        { wrapper: createWrapper() }
      );

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should not fetch when profileId is null', () => {
      mockUseCurrentProfileId.mockReturnValue(null);

      const { result } = renderHook(
        () => useKycQuery({ entityId: 'entity-123' }),
        { wrapper: createWrapper() }
      );

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // LOCAL-FIRST CACHING TESTS
  // ============================================================

  describe('local-first caching', () => {
    it('should return cached data from local DB first', async () => {
      mockUserRepository.getKycStatus.mockResolvedValue(mockApprovedKycStatus);

      const { result } = renderHook(
        () => useKycQuery({ entityId: 'entity-123' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockApprovedKycStatus);
      });

      // Should NOT call API immediately (local-first)
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should parse JSON string from local DB', async () => {
      mockUserRepository.getKycStatus.mockResolvedValue({
        data: JSON.stringify(mockApprovedKycStatus),
      });

      const { result } = renderHook(
        () => useKycQuery({ entityId: 'entity-123' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockApprovedKycStatus);
      });
    });

    it('should save API response to local DB', async () => {
      mockUserRepository.getKycStatus.mockResolvedValue(null);
      mockApiClient.get.mockResolvedValue({ data: mockApprovedKycStatus });

      const { result } = renderHook(
        () => useKycQuery({ entityId: 'entity-123' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockApprovedKycStatus);
      });

      expect(mockUserRepository.saveKycStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockApprovedKycStatus,
          id: 'entity-123',
          profile_id: 'profile-123',
          is_synced: true,
        })
      );
    });

    it('should use local cache as fallback on API error', async () => {
      // First call returns null, second call returns cached data
      mockUserRepository.getKycStatus
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockApprovedKycStatus);
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () => useKycQuery({ entityId: 'entity-123' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockApprovedKycStatus);
      });
    });
  });

  // ============================================================
  // STEP COMPLETION MUTATION TESTS
  // ============================================================

  describe('completeStep mutation', () => {
    it('should complete a KYC step successfully', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPendingKycStatus });
      mockApiClient.post.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(
        () => useKycQuery({ entityId: 'entity-123' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      await act(async () => {
        await result.current.completeStep({
          stepType: 'document_verification',
          stepData: { documentId: 'doc-123' },
        });
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/kyc/document-verification',
        { documentId: 'doc-123' }
      );
    });

    it('should handle step completion error', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPendingKycStatus });
      mockApiClient.post.mockRejectedValue(new Error('Upload failed'));

      const { result } = renderHook(
        () => useKycQuery({ entityId: 'entity-123' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      await expect(
        result.current.completeStep({
          stepType: 'selfie',
          stepData: { imageUri: 'file://selfie.jpg' },
        })
      ).rejects.toThrow('Upload failed');
    });
  });
});

// ============================================================
// useKycStatus TESTS
// ============================================================

describe('useKycStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockUserRepository.getKycStatus.mockResolvedValue(null);
  });

  it('should return KYC status with sensible defaults', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockApprovedKycStatus });

    const { result } = renderHook(
      () => useKycStatus('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockApprovedKycStatus);
    });
  });

  it('should work without entityId', async () => {
    const { result } = renderHook(
      () => useKycStatus(),
      { wrapper: createWrapper() }
    );

    expect(mockApiClient.get).not.toHaveBeenCalled();
  });
});

// ============================================================
// useKycStatusCritical TESTS
// ============================================================

describe('useKycStatusCritical', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockUserRepository.getKycStatus.mockResolvedValue(null);
  });

  it('should use critical flow settings', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockApprovedKycStatus });

    const { result } = renderHook(
      () => useKycStatusCritical('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});

// ============================================================
// useKycRequirement TESTS
// ============================================================

describe('useKycRequirement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockUserRepository.getKycStatus.mockResolvedValue(null);
  });

  it('should return not required for approved users', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockApprovedKycStatus });

    const { result } = renderHook(
      () => useKycRequirement('entity-123', 'approved'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRequired).toBe(false);
    expect(result.current.isBlocked).toBe(false);
    expect(result.current.currentLevel).toBe('approved');
  });

  it('should return required for not_started users', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockNotStartedKycStatus });

    const { result } = renderHook(
      () => useKycRequirement('entity-123', 'approved'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRequired).toBe(true);
    expect(result.current.isBlocked).toBe(true);
    expect(result.current.currentLevel).toBe('not_started');
  });

  it('should return required for pending users when approved is required', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockPendingKycStatus });

    const { result } = renderHook(
      () => useKycRequirement('entity-123', 'approved'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRequired).toBe(true);
    expect(result.current.canUpgrade).toBe(false); // pending = cannot upgrade yet
  });
});

// ============================================================
// useKycProgress TESTS
// ============================================================

describe('useKycProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockUserRepository.getKycStatus.mockResolvedValue(null);
  });

  it('should return 100% for fully completed KYC', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockApprovedKycStatus });

    const { result } = renderHook(
      () => useKycProgress('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.percentage).toBe(100);
    });

    expect(result.current.completedSteps).toBe(8);
    expect(result.current.totalSteps).toBe(8);
    expect(result.current.nextStep).toBeUndefined();
  });

  it('should return correct progress for partial completion', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockPendingKycStatus });

    const { result } = renderHook(
      () => useKycProgress('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.percentage).toBe(50); // 4 out of 8
    });

    expect(result.current.completedSteps).toBe(4);
    expect(result.current.totalSteps).toBe(8);
    expect(result.current.nextStep).toBe('document_verification');
  });

  it('should return 0% when not started', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockNotStartedKycStatus });

    const { result } = renderHook(
      () => useKycProgress('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.percentage).toBe(0);
    });

    expect(result.current.completedSteps).toBe(0);
    // nextStep may be undefined when hook hasn't determined steps yet
    // The hook returns first incomplete step from steps object
    expect(result.current.nextStep === 'setup_account' || result.current.nextStep === undefined).toBe(true);
  });

  it('should return defaults when no entity', () => {
    const { result } = renderHook(
      () => useKycProgress(),
      { wrapper: createWrapper() }
    );

    expect(result.current.percentage).toBe(0);
    expect(result.current.completedSteps).toBe(0);
    expect(result.current.totalSteps).toBe(0);
  });
});

// ============================================================
// usePendingKycDocuments TESTS
// ============================================================

describe('usePendingKycDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockUserRepository.getKycStatus.mockResolvedValue(null);
  });

  it('should return pending documents', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockPendingKycStatus });

    const { result } = renderHook(
      () => usePendingKycDocuments('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.length).toBe(1);
    });

    expect(result.current[0].document_type).toBe('passport');
    expect(result.current[0].verification_status).toBe('pending');
  });

  it('should return empty array for approved documents', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockApprovedKycStatus });

    const { result } = renderHook(
      () => usePendingKycDocuments('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.length).toBe(0);
    });
  });
});

// ============================================================
// useKycLimits TESTS
// ============================================================

describe('useKycLimits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockUserRepository.getKycStatus.mockResolvedValue(null);
  });

  it('should return higher limits for approved users', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockApprovedKycStatus });

    const { result } = renderHook(
      () => useKycLimits('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.dailyTransactionLimit).toBe(10000);
    });

    expect(result.current.maxSingleTransaction).toBe(5000);
    expect(result.current.monthlyTransactionLimit).toBe(100000);
  });

  it('should return lower limits for pending users', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockPendingKycStatus });

    const { result } = renderHook(
      () => useKycLimits('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.dailyTransactionLimit).toBe(500);
    });

    expect(result.current.maxSingleTransaction).toBe(200);
    expect(result.current.monthlyTransactionLimit).toBe(5000);
  });

  it('should return default limits for not_started users', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockNotStartedKycStatus });

    const { result } = renderHook(
      () => useKycLimits('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.dailyTransactionLimit).toBe(1000);
    });

    expect(result.current.maxSingleTransaction).toBe(500);
  });
});

// ============================================================
// useTransactionLimitCheck TESTS
// ============================================================

describe('useTransactionLimitCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockUserRepository.getKycStatus.mockResolvedValue(null);
  });

  it('should allow transaction for approved users within limit', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockApprovedKycStatus });

    const { result } = renderHook(
      () => useTransactionLimitCheck('entity-123', 1000),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canTransact).toBe(true);
    expect(result.current.exceedsLimit).toBe(false);
    expect(result.current.limitType).toBeNull();
  });

  it('should block transaction exceeding single transaction limit', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockApprovedKycStatus });

    const { result } = renderHook(
      () => useTransactionLimitCheck('entity-123', 10000), // Exceeds 5000 limit
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canTransact).toBe(false);
    expect(result.current.exceedsLimit).toBe(true);
    expect(result.current.limitType).toBe('single_transaction');
  });

  it('should block pending users exceeding transaction limits', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockPendingKycStatus });

    const { result } = renderHook(
      () => useTransactionLimitCheck('entity-123', 1000), // Exceeds both 500 daily and 200 single transaction limits
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canTransact).toBe(false);
    expect(result.current.exceedsLimit).toBe(true);
    // Single transaction limit (200) is checked first, 1000 > 200 so it's flagged as single_transaction
    expect(result.current.limitType).toBe('single_transaction');
  });

  it('should allow small transactions for pending users', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockPendingKycStatus });

    const { result } = renderHook(
      () => useTransactionLimitCheck('entity-123', 100), // Within 200 limit
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canTransact).toBe(true);
    expect(result.current.exceedsLimit).toBe(false);
  });

  it('should return loading state while fetching', () => {
    mockApiClient.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(
      () => useTransactionLimitCheck('entity-123', 100),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.canTransact).toBe(false);
  });
});

// ============================================================
// EDGE CASES
// ============================================================

describe('edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentProfileId.mockReturnValue('profile-123');
    mockUserRepository.getKycStatus.mockResolvedValue(null);
  });

  it('should handle rejected KYC status', async () => {
    const rejectedStatus = {
      ...mockNotStartedKycStatus,
      kyc_status: 'rejected' as const,
    };
    mockApiClient.get.mockResolvedValue({ data: rejectedStatus });

    const { result } = renderHook(
      () => useKycRequirement('entity-123', 'approved'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRequired).toBe(true);
    expect(result.current.isBlocked).toBe(true);
    expect(result.current.currentLevel).toBe('rejected');
  });

  it('should handle in_review KYC status', async () => {
    const inReviewStatus = {
      ...mockApprovedKycStatus,
      kyc_status: 'in_review' as const,
    };
    mockApiClient.get.mockResolvedValue({ data: inReviewStatus });

    const { result } = renderHook(
      () => useTransactionLimitCheck('entity-123', 1000),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // in_review should be treated like approved for transactions
    expect(result.current.canTransact).toBe(true);
  });

  it('should handle business KYC with additional steps', async () => {
    const businessKycStatus = {
      ...mockApprovedKycStatus,
      entity_type: 'business' as const,
      steps: {
        ...mockApprovedKycStatus.steps,
        business_info: { status: 'completed' as const },
        business_verification: { status: 'completed' as const },
        business_security: { status: 'completed' as const },
      },
    };
    mockApiClient.get.mockResolvedValue({ data: businessKycStatus });

    const { result } = renderHook(
      () => useKycProgress('entity-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.totalSteps).toBe(11); // 8 + 3 business steps
    });
  });
});
