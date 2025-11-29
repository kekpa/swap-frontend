/**
 * useSendMessage Hook Tests
 *
 * Tests TanStack Query mutation for sending messages with optimistic updates
 *
 * Key behaviors tested:
 * - Message sending via API
 * - Optimistic updates
 * - Rollback on failure
 * - Timeline cache updates
 * - Interactions list updates
 * - Retry logic
 * - Bulk operations (mark as read, delete)
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies before imports
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../services/NetworkService', () => ({
  networkService: {
    isOnline: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('../../../_api/messages.api', () => ({
  __esModule: true,
  default: {
    sendDirectMessage: jest.fn(),
  },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-uuid-123'),
}));

jest.mock('../../queryKeys', () => ({
  queryKeys: {
    timeline: (id: string) => ['timeline', id],
    interactions: ['interactions'],
    interactionsByEntity: (id: string) => ['interactions', 'entity', id],
  },
}));

import MessagesApiService from '../../../_api/messages.api';
import { useSendMessage, useBulkMessageOperations, SendMessageRequest } from '../useSendMessage';

describe('useSendMessage', () => {
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

  describe('sendMessageAPI', () => {
    it('should send message successfully', async () => {
      const mockResponse = {
        message: {
          id: 'msg_server_123',
          created_at: '2025-01-15T10:00:00Z',
        },
        interaction: { id: 'int_123' },
      };

      (MessagesApiService.sendDirectMessage as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      const request: SendMessageRequest = {
        interactionId: 'int_123',
        recipientEntityId: 'recipient_456',
        content: 'Hello!',
        messageType: 'text',
      };

      await act(async () => {
        await result.current.mutateAsync(request);
      });

      expect(MessagesApiService.sendDirectMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: 'recipient_456',
          content: 'Hello!',
          message_type: 'text',
        }),
      );
    });

    it('should include idempotency key in request', async () => {
      const mockResponse = {
        message: { id: 'msg_123', created_at: new Date().toISOString() },
      };

      (MessagesApiService.sendDirectMessage as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          interactionId: 'int_123',
          recipientEntityId: 'recipient_456',
          content: 'Test',
          messageType: 'text',
        });
      });

      expect(MessagesApiService.sendDirectMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotency_key: 'mock-uuid-123',
        }),
      );
    });

    it('should handle different message types', async () => {
      const mockResponse = {
        message: { id: 'msg_123', created_at: new Date().toISOString() },
      };

      (MessagesApiService.sendDirectMessage as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      const messageTypes = ['text', 'payment', 'request', 'image', 'file'] as const;

      for (const messageType of messageTypes) {
        jest.clearAllMocks();

        await act(async () => {
          await result.current.mutateAsync({
            interactionId: 'int_123',
            recipientEntityId: 'recipient_456',
            content: 'Test',
            messageType,
          });
        });

        expect(MessagesApiService.sendDirectMessage).toHaveBeenCalledWith(
          expect.objectContaining({ message_type: messageType }),
        );
      }
    });

    it('should include metadata when provided', async () => {
      const mockResponse = {
        message: { id: 'msg_123', created_at: new Date().toISOString() },
      };

      (MessagesApiService.sendDirectMessage as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          interactionId: 'int_123',
          recipientEntityId: 'recipient_456',
          content: 'Payment',
          messageType: 'payment',
          metadata: {
            amount: 5000,
            currency: 'HTG',
          },
        });
      });

      expect(MessagesApiService.sendDirectMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { amount: 5000, currency: 'HTG' },
        }),
      );
    });
  });

  describe('Optimistic Updates', () => {
    it('should add optimistic message to timeline on mutate', async () => {
      const mockResponse = {
        message: { id: 'msg_server_123', created_at: new Date().toISOString() },
      };

      (MessagesApiService.sendDirectMessage as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100)),
      );

      const wrapper = createWrapper();
      const existingTimeline = [
        { id: 'msg_existing', content: 'Existing message' },
      ];

      // Pre-populate timeline cache
      queryClient.setQueryData(['timeline', 'int_123'], existingTimeline);

      const { result } = renderHook(() => useSendMessage(), { wrapper });

      act(() => {
        result.current.mutate({
          interactionId: 'int_123',
          recipientEntityId: 'recipient_456',
          content: 'New message',
          messageType: 'text',
        });
      });

      // Check optimistic update was applied
      await waitFor(() => {
        const timeline = queryClient.getQueryData(['timeline', 'int_123']) as any[];
        expect(timeline.length).toBe(2);
        expect(timeline[1].content).toBe('New message');
        expect(timeline[1].status).toBe('sending');
      });
    });

    it('should create temp ID for optimistic message', async () => {
      const mockResponse = {
        message: { id: 'msg_server', created_at: new Date().toISOString() },
      };

      (MessagesApiService.sendDirectMessage as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100)),
      );

      const wrapper = createWrapper();
      queryClient.setQueryData(['timeline', 'int_123'], []);

      const { result } = renderHook(() => useSendMessage(), { wrapper });

      act(() => {
        result.current.mutate({
          interactionId: 'int_123',
          recipientEntityId: 'recipient_456',
          content: 'Test',
          messageType: 'text',
        });
      });

      await waitFor(() => {
        const timeline = queryClient.getQueryData(['timeline', 'int_123']) as any[];
        expect(timeline[0].id).toMatch(/^temp_/);
      });
    });

    it('should update interactions list with latest message', async () => {
      const mockResponse = {
        message: { id: 'msg_server', created_at: new Date().toISOString() },
      };

      (MessagesApiService.sendDirectMessage as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100)),
      );

      const wrapper = createWrapper();

      // Pre-populate interactions cache
      queryClient.setQueryData(['interactions', 'entity', 'current_user_entity_id'], [
        { id: 'int_123', last_message: 'Old message' },
      ]);

      const { result } = renderHook(() => useSendMessage(), { wrapper });

      act(() => {
        result.current.mutate({
          interactionId: 'int_123',
          recipientEntityId: 'recipient_456',
          content: 'New message',
          messageType: 'text',
        });
      });

      await waitFor(() => {
        const interactions = queryClient.getQueryData([
          'interactions',
          'entity',
          'current_user_entity_id',
        ]) as any[];

        expect(interactions[0].last_message).toBe('New message');
      });
    });
  });

  describe('onSuccess', () => {
    it('should replace temp ID with server ID on success', async () => {
      const mockResponse = {
        message: {
          id: 'msg_server_final',
          created_at: '2025-01-15T10:00:00Z',
        },
      };

      (MessagesApiService.sendDirectMessage as jest.Mock).mockResolvedValue(mockResponse);

      const wrapper = createWrapper();
      queryClient.setQueryData(['timeline', 'int_123'], []);

      const { result } = renderHook(() => useSendMessage(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          interactionId: 'int_123',
          recipientEntityId: 'recipient_456',
          content: 'Test',
          messageType: 'text',
        });
      });

      const timeline = queryClient.getQueryData(['timeline', 'int_123']) as any[];
      expect(timeline[0].id).toBe('msg_server_final');
      expect(timeline[0].status).toBe('sent');
    });

    it('should update timestamp from server', async () => {
      const serverTimestamp = '2025-01-15T12:34:56Z';
      const mockResponse = {
        message: { id: 'msg_123', created_at: serverTimestamp },
      };

      (MessagesApiService.sendDirectMessage as jest.Mock).mockResolvedValue(mockResponse);

      const wrapper = createWrapper();
      queryClient.setQueryData(['timeline', 'int_123'], []);

      const { result } = renderHook(() => useSendMessage(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          interactionId: 'int_123',
          recipientEntityId: 'recipient_456',
          content: 'Test',
          messageType: 'text',
        });
      });

      const timeline = queryClient.getQueryData(['timeline', 'int_123']) as any[];
      expect(timeline[0].timestamp).toBe(serverTimestamp);
    });
  });

  describe('onError - Rollback', () => {
    it('should rollback timeline on failure', async () => {
      (MessagesApiService.sendDirectMessage as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      const wrapper = createWrapper();
      const originalTimeline = [{ id: 'msg_1', content: 'Original' }];
      queryClient.setQueryData(['timeline', 'int_123'], originalTimeline);

      const { result } = renderHook(() => useSendMessage(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            interactionId: 'int_123',
            recipientEntityId: 'recipient_456',
            content: 'Failed message',
            messageType: 'text',
          });
        } catch (e) {
          // Expected error
        }
      });

      const timeline = queryClient.getQueryData(['timeline', 'int_123']) as any[];
      expect(timeline).toEqual(originalTimeline);
    });

    it('should rollback interactions on failure', async () => {
      (MessagesApiService.sendDirectMessage as jest.Mock).mockRejectedValue(
        new Error('Server error'),
      );

      const wrapper = createWrapper();
      const originalInteractions = [
        { id: 'int_123', last_message: 'Original message' },
      ];
      queryClient.setQueryData(
        ['interactions', 'entity', 'current_user_entity_id'],
        originalInteractions,
      );
      queryClient.setQueryData(['timeline', 'int_123'], []);

      const { result } = renderHook(() => useSendMessage(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            interactionId: 'int_123',
            recipientEntityId: 'recipient_456',
            content: 'Failed',
            messageType: 'text',
          });
        } catch (e) {
          // Expected
        }
      });

      const interactions = queryClient.getQueryData([
        'interactions',
        'entity',
        'current_user_entity_id',
      ]) as any[];

      expect(interactions[0].last_message).toBe('Original message');
    });
  });

  describe('Retry Logic', () => {
    it('should not retry on 4xx client errors', async () => {
      const clientError = { status: 400, message: 'Bad request' };
      (MessagesApiService.sendDirectMessage as jest.Mock).mockRejectedValue(clientError);

      const wrapper = createWrapper();

      const { result } = renderHook(() => useSendMessage(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            interactionId: 'int_123',
            recipientEntityId: 'recipient_456',
            content: 'Test',
            messageType: 'text',
          });
        } catch (e) {
          // Expected
        }
      });

      // Should only call once (no retry)
      expect(MessagesApiService.sendDirectMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message States', () => {
    it('should set status to "sending" during optimistic update', async () => {
      (MessagesApiService.sendDirectMessage as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      const wrapper = createWrapper();
      queryClient.setQueryData(['timeline', 'int_123'], []);

      const { result } = renderHook(() => useSendMessage(), { wrapper });

      act(() => {
        result.current.mutate({
          interactionId: 'int_123',
          recipientEntityId: 'recipient_456',
          content: 'Test',
          messageType: 'text',
        });
      });

      await waitFor(() => {
        const timeline = queryClient.getQueryData(['timeline', 'int_123']) as any[];
        expect(timeline[0].status).toBe('sending');
      });
    });
  });
});

describe('useBulkMessageOperations', () => {
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

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      const { result } = renderHook(() => useBulkMessageOperations(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        const response = await result.current.markAsRead.mutateAsync([
          'msg_1',
          'msg_2',
        ]);
        expect(response.success).toBe(true);
      });
    });

    it('should invalidate timeline queries', async () => {
      const wrapper = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useBulkMessageOperations(), { wrapper });

      await act(async () => {
        await result.current.markAsRead.mutateAsync(['msg_1']);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('deleteMessages', () => {
    it('should delete messages', async () => {
      const { result } = renderHook(() => useBulkMessageOperations(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        const response = await result.current.deleteMessages.mutateAsync([
          'msg_1',
          'msg_2',
        ]);
        expect(response.success).toBe(true);
        expect(response.messageIds).toEqual(['msg_1', 'msg_2']);
      });
    });
  });
});
