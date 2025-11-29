/**
 * useCreateInteraction Hook Tests
 *
 * Tests TanStack Query mutation for creating/getting direct interactions
 *
 * Key behaviors tested:
 * - Interaction creation/retrieval via API
 * - Cache invalidation on success
 * - 404 handling (no conversation exists)
 * - Error handling
 * - Retry logic
 * - Convenience hook (useGetOrCreateDirectInteraction)
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies before imports
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../_api/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../../_api/apiPaths', () => ({
  __esModule: true,
  default: {
    INTERACTION: {
      DIRECT: (profileId: string) => `/interactions/direct/${profileId}`,
    },
  },
}));

jest.mock('../../queryKeys', () => ({
  queryKeys: {
    interactions: ['interactions'],
    conversations: ['conversations'],
    timeline: (id: string) => ['timeline', id],
    interactionsByEntity: (id: string) => ['interactions', 'entity', id],
  },
}));

import apiClient from '../../../_api/apiClient';
import {
  useCreateInteraction,
  useGetOrCreateDirectInteraction,
  CreateInteractionResponse,
} from '../useCreateInteraction';

describe('useCreateInteraction', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockInteractionResponse: CreateInteractionResponse = {
    id: 'int_123',
    name: null,
    is_group: false,
    members: [
      {
        entity_id: 'entity_1',
        role: 'member',
        display_name: 'User One',
        entity_type: 'profile',
      },
      {
        entity_id: 'entity_2',
        role: 'member',
        display_name: 'User Two',
        entity_type: 'profile',
      },
    ],
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('createOrGetDirectInteraction', () => {
    it('should get existing interaction successfully', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: mockInteractionResponse,
      });

      const { result } = renderHook(() => useCreateInteraction(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        const response = await result.current.mutateAsync({
          contactProfileId: 'contact_456',
        });

        expect(response).toEqual(mockInteractionResponse);
      });

      expect(apiClient.get).toHaveBeenCalledWith('/interactions/direct/contact_456');
    });

    it('should use GET endpoint for idempotent operation', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: mockInteractionResponse,
      });

      const { result } = renderHook(() => useCreateInteraction(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ contactProfileId: 'contact_123' });
      });

      expect(apiClient.get).toHaveBeenCalled();
      // Should NOT use POST
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('should handle 404 when no conversation exists', async () => {
      const error404 = { response: { status: 404 }, message: 'Not found' };
      (apiClient.get as jest.Mock).mockRejectedValue(error404);

      const { result } = renderHook(() => useCreateInteraction(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ contactProfileId: 'new_contact' });
        } catch (e: any) {
          expect(e.response.status).toBe(404);
        }
      });

      // Mutation state updates asynchronously - use waitFor
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should throw when no data received', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: null });

      const { result } = renderHook(() => useCreateInteraction(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ contactProfileId: 'contact_123' });
        } catch (e: any) {
          expect(e.message).toContain('No interaction data received');
        }
      });
    });
  });

  describe('onSuccess', () => {
    it('should invalidate interactions queries', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: mockInteractionResponse,
      });

      const wrapper = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateInteraction(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ contactProfileId: 'contact_123' });
      });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['interactions'],
        }),
      );
    });

    it('should invalidate conversations queries', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: mockInteractionResponse,
      });

      const wrapper = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateInteraction(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ contactProfileId: 'contact_123' });
      });

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['conversations'],
        }),
      );
    });

    it('should pre-populate timeline cache with empty array', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: mockInteractionResponse,
      });

      const wrapper = createWrapper();
      const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

      const { result } = renderHook(() => useCreateInteraction(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ contactProfileId: 'contact_123' });
      });

      expect(setQueryDataSpy).toHaveBeenCalledWith(
        ['timeline', 'int_123'],
        [],
      );
    });
  });

  describe('onError', () => {
    it('should not log 404 as error', async () => {
      const error404 = { response: { status: 404 } };
      (apiClient.get as jest.Mock).mockRejectedValue(error404);

      const logger = require('../../../utils/logger').default;

      const { result } = renderHook(() => useCreateInteraction(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ contactProfileId: 'new_contact' });
        } catch (e) {
          // Expected
        }
      });

      // Should not call logger.error for 404
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log real errors (5xx, network)', async () => {
      const serverError = { status: 500, message: 'Internal server error' };
      (apiClient.get as jest.Mock).mockRejectedValue(serverError);

      const logger = require('../../../utils/logger').default;

      const { result } = renderHook(() => useCreateInteraction(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ contactProfileId: 'contact_123' });
        } catch (e) {
          // Expected
        }
      });

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should not retry on 4xx errors', async () => {
      const error400 = { status: 400, message: 'Bad request' };
      (apiClient.get as jest.Mock).mockRejectedValue(error400);

      const { result } = renderHook(() => useCreateInteraction(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ contactProfileId: 'contact_123' });
        } catch (e) {
          // Expected
        }
      });

      // Should only call once (no retry)
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 unauthorized', async () => {
      const error401 = { status: 401, message: 'Unauthorized' };
      (apiClient.get as jest.Mock).mockRejectedValue(error401);

      const { result } = renderHook(() => useCreateInteraction(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ contactProfileId: 'contact_123' });
        } catch (e) {
          // Expected
        }
      });

      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mutation States', () => {
    it('should set isPending during mutation', async () => {
      let resolvePromise: (value: any) => void;
      (apiClient.get as jest.Mock).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; }),
      );

      const { result } = renderHook(() => useCreateInteraction(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);

      act(() => {
        result.current.mutate({ contactProfileId: 'contact_123' });
      });

      // Wait for pending state
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve and wait for completion
      await act(async () => {
        resolvePromise!({ data: mockInteractionResponse });
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });

    it('should set isSuccess on successful mutation', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: mockInteractionResponse,
      });

      const { result } = renderHook(() => useCreateInteraction(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ contactProfileId: 'contact_123' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should set isError on failed mutation', async () => {
      // Use a structured error object (like other tests) for consistency
      const networkError = { status: 500, message: 'Network error' };
      (apiClient.get as jest.Mock).mockRejectedValue(networkError);

      const { result } = renderHook(() => useCreateInteraction(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ contactProfileId: 'contact_123' });
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 },
      );
    });
  });
});

describe('useGetOrCreateDirectInteraction', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should return interaction ID on success', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { id: 'int_returned_123' },
    });

    const { result } = renderHook(() => useGetOrCreateDirectInteraction(), {
      wrapper: createWrapper(),
    });

    let interactionId: string | null = null;

    await act(async () => {
      interactionId = await result.current.getOrCreateDirectInteraction('contact_456');
    });

    expect(interactionId).toBe('int_returned_123');
  });

  it('should return null on 404 (no conversation)', async () => {
    const error404 = { response: { status: 404 } };
    (apiClient.get as jest.Mock).mockRejectedValue(error404);

    const { result } = renderHook(() => useGetOrCreateDirectInteraction(), {
      wrapper: createWrapper(),
    });

    let interactionId: string | null = 'initial';

    await act(async () => {
      interactionId = await result.current.getOrCreateDirectInteraction('new_contact');
    });

    expect(interactionId).toBeNull();
  });

  it('should return null on other errors', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGetOrCreateDirectInteraction(), {
      wrapper: createWrapper(),
    });

    let interactionId: string | null = 'initial';

    await act(async () => {
      interactionId = await result.current.getOrCreateDirectInteraction('contact_123');
    });

    expect(interactionId).toBeNull();
  });

  it('should expose isLoading state', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (apiClient.get as jest.Mock).mockReturnValue(promise);

    const { result } = renderHook(() => useGetOrCreateDirectInteraction(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.getOrCreateDirectInteraction('contact_123');
    });

    // Wait for the loading state to become true
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Resolve the promise and wait for loading to become false
    await act(async () => {
      resolvePromise!({ data: { id: 'int_123' } });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle 404 status in error object', async () => {
    const error404 = { status: 404 };
    (apiClient.get as jest.Mock).mockRejectedValue(error404);

    const { result } = renderHook(() => useGetOrCreateDirectInteraction(), {
      wrapper: createWrapper(),
    });

    let interactionId: string | null = 'initial';

    await act(async () => {
      interactionId = await result.current.getOrCreateDirectInteraction('new_contact');
    });

    expect(interactionId).toBeNull();
  });

  it('should be stable for useEffect dependencies', async () => {
    const { result, rerender } = renderHook(() => useGetOrCreateDirectInteraction(), {
      wrapper: createWrapper(),
    });

    const firstGetOrCreate = result.current.getOrCreateDirectInteraction;

    rerender();

    const secondGetOrCreate = result.current.getOrCreateDirectInteraction;

    // Function should be stable due to useCallback
    expect(firstGetOrCreate).toBe(secondGetOrCreate);
  });
});
