/**
 * useOptimisticUpdates Hook Tests
 *
 * Tests TanStack Query optimistic update patterns
 *
 * Key behaviors tested:
 * - Generic optimistic update application
 * - Rollback on failure
 * - Confirmation (cleanup)
 * - Balance-specific updates
 * - Message-specific updates
 * - Transaction-specific updates
 * - Interaction-specific updates
 * - Profile-specific updates
 * - Batch operations
 * - Memory cleanup
 */

import { renderHook, act } from '@testing-library/react-native';
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

jest.mock('../../queryKeys', () => ({
  queryKeys: {
    balancesByEntity: (entityId: string) => ['balances', 'entity', entityId],
    timeline: (interactionId: string) => ['timeline', interactionId],
    recentTransactions: (entityId: string, limit: number) => ['transactions', 'recent', entityId, limit],
    interactionsByEntity: (entityId: string) => ['interactions', 'entity', entityId],
    userProfile: (entityId: string) => ['user', 'profile', entityId],
  },
}));

import { useOptimisticUpdates, withOptimisticUpdate } from '../useOptimisticUpdates';

describe('useOptimisticUpdates', () => {
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

  describe('applyOptimisticUpdate', () => {
    it('should apply optimistic update to cache', async () => {
      const wrapper = createWrapper();
      const queryKey = ['test', 'data'];
      queryClient.setQueryData(queryKey, { value: 'original' });

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      let contextId: string;
      act(() => {
        contextId = result.current.applyOptimisticUpdate(
          queryKey,
          (oldData: any) => ({ ...oldData, value: 'updated' })
        );
      });

      const updatedData = queryClient.getQueryData(queryKey);
      expect(updatedData).toEqual({ value: 'updated' });
      expect(contextId!).toMatch(/^optimistic_/);
    });

    it('should store previous data for rollback', async () => {
      const wrapper = createWrapper();
      const queryKey = ['test', 'data'];
      const originalData = { value: 'original', count: 5 };
      queryClient.setQueryData(queryKey, originalData);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      let contextId: string;
      act(() => {
        contextId = result.current.applyOptimisticUpdate(
          queryKey,
          (oldData: any) => ({ ...oldData, value: 'updated' })
        );
      });

      // Rollback should restore original
      act(() => {
        result.current.rollbackOptimisticUpdate(contextId!);
      });

      const restoredData = queryClient.getQueryData(queryKey);
      expect(restoredData).toEqual(originalData);
    });

    it('should generate unique context IDs', async () => {
      const wrapper = createWrapper();
      queryClient.setQueryData(['test1'], { value: 1 });
      queryClient.setQueryData(['test2'], { value: 2 });

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      let contextId1: string;
      let contextId2: string;

      act(() => {
        contextId1 = result.current.applyOptimisticUpdate(['test1'], (d: any) => d);
        contextId2 = result.current.applyOptimisticUpdate(['test2'], (d: any) => d);
      });

      expect(contextId1!).not.toBe(contextId2!);
    });

    it('should allow custom context ID', async () => {
      const wrapper = createWrapper();
      queryClient.setQueryData(['test'], { value: 'original' });

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      let contextId: string;
      act(() => {
        contextId = result.current.applyOptimisticUpdate(
          ['test'],
          (oldData: any) => ({ ...oldData, value: 'updated' }),
          'custom_context_id'
        );
      });

      expect(contextId!).toBe('custom_context_id');
    });
  });

  describe('rollbackOptimisticUpdate', () => {
    it('should restore previous data', async () => {
      const wrapper = createWrapper();
      const queryKey = ['rollback', 'test'];
      const originalData = { items: [1, 2, 3] };
      queryClient.setQueryData(queryKey, originalData);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      let contextId: string;
      act(() => {
        contextId = result.current.applyOptimisticUpdate(
          queryKey,
          (oldData: any) => ({ items: [...oldData.items, 4] })
        );
      });

      // Verify update applied
      expect(queryClient.getQueryData(queryKey)).toEqual({ items: [1, 2, 3, 4] });

      // Rollback
      act(() => {
        result.current.rollbackOptimisticUpdate(contextId!);
      });

      expect(queryClient.getQueryData(queryKey)).toEqual(originalData);
    });

    it('should handle non-existent context gracefully', async () => {
      const wrapper = createWrapper();
      const logger = require('../../../utils/logger').logger;

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      act(() => {
        result.current.rollbackOptimisticUpdate('non_existent_context');
      });

      expect(logger.warn).toHaveBeenCalledWith(
        '[useOptimisticUpdates] Context not found for rollback:',
        'non_existent_context'
      );
    });

    it('should clean up context after rollback', async () => {
      const wrapper = createWrapper();
      queryClient.setQueryData(['test'], { value: 1 });

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      let contextId: string;
      act(() => {
        contextId = result.current.applyOptimisticUpdate(
          ['test'],
          (d: any) => ({ ...d, value: 2 })
        );
      });

      act(() => {
        result.current.rollbackOptimisticUpdate(contextId!);
      });

      // Second rollback should warn (context already cleaned up)
      const logger = require('../../../utils/logger').logger;
      logger.warn.mockClear();

      act(() => {
        result.current.rollbackOptimisticUpdate(contextId!);
      });

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('confirmOptimisticUpdate', () => {
    it('should clean up context without rollback', async () => {
      const wrapper = createWrapper();
      const queryKey = ['confirm', 'test'];
      queryClient.setQueryData(queryKey, { value: 'original' });

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      let contextId: string;
      act(() => {
        contextId = result.current.applyOptimisticUpdate(
          queryKey,
          (oldData: any) => ({ ...oldData, value: 'confirmed' })
        );
      });

      // Confirm the update
      act(() => {
        result.current.confirmOptimisticUpdate(contextId!);
      });

      // Data should remain updated
      expect(queryClient.getQueryData(queryKey)).toEqual({ value: 'confirmed' });

      // Rollback should not work now (context cleaned up)
      const logger = require('../../../utils/logger').logger;
      logger.warn.mockClear();

      act(() => {
        result.current.rollbackOptimisticUpdate(contextId!);
      });

      expect(queryClient.getQueryData(queryKey)).toEqual({ value: 'confirmed' });
    });
  });

  describe('replaceOptimisticData', () => {
    it('should replace cache with real data', async () => {
      const wrapper = createWrapper();
      const queryKey = ['replace', 'test'];
      queryClient.setQueryData(queryKey, { tempId: 'temp_123', value: 'optimistic' });

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      act(() => {
        result.current.replaceOptimisticData(queryKey, {
          id: 'real_123',
          value: 'server_confirmed',
        });
      });

      expect(queryClient.getQueryData(queryKey)).toEqual({
        id: 'real_123',
        value: 'server_confirmed',
      });
    });

    it('should confirm context when provided', async () => {
      const wrapper = createWrapper();
      const queryKey = ['replace', 'with', 'context'];
      queryClient.setQueryData(queryKey, { value: 'original' });

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      let contextId: string;
      act(() => {
        contextId = result.current.applyOptimisticUpdate(
          queryKey,
          () => ({ value: 'optimistic' })
        );
      });

      act(() => {
        result.current.replaceOptimisticData(queryKey, { value: 'real' }, contextId!);
      });

      // Rollback should not work (context was confirmed)
      act(() => {
        result.current.rollbackOptimisticUpdate(contextId!);
      });

      expect(queryClient.getQueryData(queryKey)).toEqual({ value: 'real' });
    });
  });

  describe('optimisticBalanceUpdate', () => {
    it('should debit balance optimistically', async () => {
      const wrapper = createWrapper();
      const balances = [
        { wallet_id: 'wallet_1', available_balance: 10000, currency: 'HTG' },
        { wallet_id: 'wallet_2', available_balance: 500, currency: 'USD' },
      ];
      queryClient.setQueryData(['balances', 'entity', 'entity_123'], balances);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      act(() => {
        result.current.optimisticBalanceUpdate('entity_123', 'wallet_1', 2500, 'debit');
      });

      const updatedBalances = queryClient.getQueryData([
        'balances',
        'entity',
        'entity_123',
      ]) as any[];

      expect(updatedBalances[0].available_balance).toBe(7500); // 10000 - 2500
      expect(updatedBalances[1].available_balance).toBe(500); // Unchanged
    });

    it('should credit balance optimistically', async () => {
      const wrapper = createWrapper();
      const balances = [
        { wallet_id: 'wallet_1', available_balance: 5000, currency: 'HTG' },
      ];
      queryClient.setQueryData(['balances', 'entity', 'entity_123'], balances);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      act(() => {
        result.current.optimisticBalanceUpdate('entity_123', 'wallet_1', 1000, 'credit');
      });

      const updatedBalances = queryClient.getQueryData([
        'balances',
        'entity',
        'entity_123',
      ]) as any[];

      expect(updatedBalances[0].available_balance).toBe(6000); // 5000 + 1000
    });

    it('should prevent negative balance', async () => {
      const wrapper = createWrapper();
      const balances = [{ wallet_id: 'wallet_1', available_balance: 1000 }];
      queryClient.setQueryData(['balances', 'entity', 'entity_123'], balances);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      act(() => {
        result.current.optimisticBalanceUpdate('entity_123', 'wallet_1', 5000, 'debit');
      });

      const updatedBalances = queryClient.getQueryData([
        'balances',
        'entity',
        'entity_123',
      ]) as any[];

      expect(updatedBalances[0].available_balance).toBe(0); // Math.max(0, -4000)
    });

    it('should return context ID for rollback', async () => {
      const wrapper = createWrapper();
      const balances = [{ wallet_id: 'wallet_1', available_balance: 10000 }];
      queryClient.setQueryData(['balances', 'entity', 'entity_123'], balances);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      let contextId: string;
      act(() => {
        contextId = result.current.optimisticBalanceUpdate('entity_123', 'wallet_1', 2000);
      });

      expect(contextId!).toMatch(/^optimistic_/);

      // Rollback
      act(() => {
        result.current.rollbackOptimisticUpdate(contextId!);
      });

      const restoredBalances = queryClient.getQueryData([
        'balances',
        'entity',
        'entity_123',
      ]) as any[];

      expect(restoredBalances[0].available_balance).toBe(10000);
    });
  });

  describe('optimisticMessageUpdate', () => {
    it('should add message to timeline with temp ID', async () => {
      const wrapper = createWrapper();
      const existingMessages = [
        { id: 'msg_1', content: 'Hello', timestamp: '2025-01-15T10:00:00Z' },
      ];
      queryClient.setQueryData(['timeline', 'int_123'], existingMessages);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      const newMessage = {
        tempId: 'temp_msg_456',
        content: 'New message',
        interaction_id: 'int_123',
        sender_entity_id: 'sender_1',
        recipient_entity_id: 'recipient_1',
        message_type: 'text' as const,
        metadata: null,
        timestamp: '2025-01-15T10:05:00Z',
        is_read: false,
        created_at: '2025-01-15T10:05:00Z',
        updated_at: '2025-01-15T10:05:00Z',
      };

      act(() => {
        result.current.optimisticMessageUpdate('int_123', newMessage);
      });

      const timeline = queryClient.getQueryData(['timeline', 'int_123']) as any[];

      expect(timeline.length).toBe(2);
      expect(timeline[1].id).toBe('temp_msg_456');
      expect(timeline[1].content).toBe('New message');
      expect(timeline[1].status).toBe('sending');
    });

    it('should create timeline if not exists', async () => {
      const wrapper = createWrapper();
      // No existing timeline

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      const newMessage = {
        tempId: 'temp_first_msg',
        content: 'First message',
        interaction_id: 'int_new',
        sender_entity_id: 'sender_1',
        recipient_entity_id: 'recipient_1',
        message_type: 'text' as const,
        metadata: null,
        timestamp: '2025-01-15T10:00:00Z',
        is_read: false,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
      };

      act(() => {
        result.current.optimisticMessageUpdate('int_new', newMessage);
      });

      const timeline = queryClient.getQueryData(['timeline', 'int_new']) as any[];

      expect(timeline.length).toBe(1);
      expect(timeline[0].id).toBe('temp_first_msg');
    });

    it('should sort messages by timestamp', async () => {
      const wrapper = createWrapper();
      const existingMessages = [
        { id: 'msg_2', content: 'Second', timestamp: '2025-01-15T10:10:00Z' },
      ];
      queryClient.setQueryData(['timeline', 'int_123'], existingMessages);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      // Add a message with earlier timestamp
      const newMessage = {
        tempId: 'temp_msg_1',
        content: 'First (added later)',
        interaction_id: 'int_123',
        sender_entity_id: 'sender_1',
        recipient_entity_id: 'recipient_1',
        message_type: 'text' as const,
        metadata: null,
        timestamp: '2025-01-15T10:05:00Z', // Earlier than existing
        is_read: false,
        created_at: '2025-01-15T10:05:00Z',
        updated_at: '2025-01-15T10:05:00Z',
      };

      act(() => {
        result.current.optimisticMessageUpdate('int_123', newMessage);
      });

      const timeline = queryClient.getQueryData(['timeline', 'int_123']) as any[];

      expect(timeline[0].content).toBe('First (added later)');
      expect(timeline[1].content).toBe('Second');
    });
  });

  describe('optimisticTransactionUpdate', () => {
    it('should add transaction to beginning of list', async () => {
      const wrapper = createWrapper();
      const existingTx = [
        { id: 'tx_1', amount: 1000, status: 'completed' },
        { id: 'tx_2', amount: 2000, status: 'completed' },
      ];
      queryClient.setQueryData(['transactions', 'recent', 'entity_123', 20], existingTx);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      const newTx = {
        amount: 500,
        recipient_id: 'recipient_456',
        description: 'New transaction',
      };

      act(() => {
        result.current.optimisticTransactionUpdate('entity_123', newTx);
      });

      const transactions = queryClient.getQueryData([
        'transactions',
        'recent',
        'entity_123',
        20,
      ]) as any[];

      expect(transactions.length).toBe(3);
      expect(transactions[0].amount).toBe(500);
      expect(transactions[0].status).toBe('pending');
      expect(transactions[0].id).toMatch(/^temp_/);
    });

    it('should limit to 20 transactions', async () => {
      const wrapper = createWrapper();
      const existingTx = Array.from({ length: 20 }, (_, i) => ({
        id: `tx_${i}`,
        amount: i * 100,
      }));
      queryClient.setQueryData(['transactions', 'recent', 'entity_123', 20], existingTx);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      act(() => {
        result.current.optimisticTransactionUpdate('entity_123', { amount: 9999 });
      });

      const transactions = queryClient.getQueryData([
        'transactions',
        'recent',
        'entity_123',
        20,
      ]) as any[];

      expect(transactions.length).toBe(20);
      expect(transactions[0].amount).toBe(9999); // New tx at beginning
    });
  });

  describe('optimisticInteractionUpdate', () => {
    it('should update interaction last message', async () => {
      const wrapper = createWrapper();
      const interactions = [
        { id: 'int_1', last_message: 'Old message', unread_count: 0 },
        { id: 'int_2', last_message: 'Another message', unread_count: 2 },
      ];
      queryClient.setQueryData(['interactions', 'entity', 'entity_123'], interactions);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      act(() => {
        result.current.optimisticInteractionUpdate('entity_123', 'int_1', 'New message!');
      });

      const updated = queryClient.getQueryData([
        'interactions',
        'entity',
        'entity_123',
      ]) as any[];

      expect(updated[0].last_message).toBe('New message!');
      expect(updated[0].last_message_timestamp).toBeDefined();
      expect(updated[1].last_message).toBe('Another message'); // Unchanged
    });

    it('should increment unread count when specified', async () => {
      const wrapper = createWrapper();
      const interactions = [
        { id: 'int_1', last_message: 'Old', unread_count: 3 },
      ];
      queryClient.setQueryData(['interactions', 'entity', 'entity_123'], interactions);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      act(() => {
        result.current.optimisticInteractionUpdate(
          'entity_123',
          'int_1',
          'Incoming message',
          true // incrementUnread
        );
      });

      const updated = queryClient.getQueryData([
        'interactions',
        'entity',
        'entity_123',
      ]) as any[];

      expect(updated[0].unread_count).toBe(4);
    });
  });

  describe('optimisticProfileUpdate', () => {
    it('should merge profile updates', async () => {
      const wrapper = createWrapper();
      const profile = {
        id: 'profile_123',
        display_name: 'John Doe',
        bio: 'Original bio',
        avatar_url: 'https://example.com/avatar.jpg',
      };
      queryClient.setQueryData(['user', 'profile', 'entity_123'], profile);

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      act(() => {
        result.current.optimisticProfileUpdate('entity_123', {
          bio: 'Updated bio',
        });
      });

      const updated = queryClient.getQueryData([
        'user',
        'profile',
        'entity_123',
      ]) as any;

      expect(updated.bio).toBe('Updated bio');
      expect(updated.display_name).toBe('John Doe'); // Unchanged
      expect(updated.isUpdating).toBe(true);
    });
  });

  describe('batchOptimisticUpdates', () => {
    it('should apply multiple updates at once', async () => {
      const wrapper = createWrapper();
      queryClient.setQueryData(['data1'], { value: 1 });
      queryClient.setQueryData(['data2'], { value: 2 });
      queryClient.setQueryData(['data3'], { value: 3 });

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      let contextIds: string[];
      act(() => {
        contextIds = result.current.batchOptimisticUpdates([
          { queryKey: ['data1'], updater: (d: any) => ({ ...d, value: 10 }) },
          { queryKey: ['data2'], updater: (d: any) => ({ ...d, value: 20 }) },
          { queryKey: ['data3'], updater: (d: any) => ({ ...d, value: 30 }) },
        ]);
      });

      expect(contextIds!.length).toBe(3);
      expect(queryClient.getQueryData(['data1'])).toEqual({ value: 10 });
      expect(queryClient.getQueryData(['data2'])).toEqual({ value: 20 });
      expect(queryClient.getQueryData(['data3'])).toEqual({ value: 30 });
    });

    it('should allow batch rollback', async () => {
      const wrapper = createWrapper();
      queryClient.setQueryData(['data1'], { value: 1 });
      queryClient.setQueryData(['data2'], { value: 2 });

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      let contextIds: string[];
      act(() => {
        contextIds = result.current.batchOptimisticUpdates([
          { queryKey: ['data1'], updater: () => ({ value: 100 }) },
          { queryKey: ['data2'], updater: () => ({ value: 200 }) },
        ]);
      });

      // Rollback all
      act(() => {
        result.current.rollbackBatchUpdates(contextIds!);
      });

      expect(queryClient.getQueryData(['data1'])).toEqual({ value: 1 });
      expect(queryClient.getQueryData(['data2'])).toEqual({ value: 2 });
    });
  });

  describe('cleanupOldContexts', () => {
    it('should remove contexts older than maxAge', async () => {
      // Use fake timers to control time passage
      jest.useFakeTimers();

      const wrapper = createWrapper();
      queryClient.setQueryData(['test'], { value: 1 });

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      // Apply update at time T
      let contextId: string;
      act(() => {
        contextId = result.current.applyOptimisticUpdate(['test'], (d: any) => d);
      });

      // Advance time by 1ms so context.timestamp < Date.now()
      jest.advanceTimersByTime(1);

      // Now cleanupOldContexts(0) should clean up (1ms > 0ms)
      act(() => {
        result.current.cleanupOldContexts(0); // 0ms maxAge - immediately expired
      });

      // Context should be cleaned up - rollback should warn
      const logger = require('../../../utils/logger').logger;
      logger.warn.mockClear();

      act(() => {
        result.current.rollbackOptimisticUpdate(contextId!);
      });

      expect(logger.warn).toHaveBeenCalled();

      // Restore real timers
      jest.useRealTimers();
    });
  });

  describe('getOptimisticStatus', () => {
    it('should return status information', async () => {
      const wrapper = createWrapper();
      queryClient.setQueryData(['test1'], { value: 1 });
      queryClient.setQueryData(['test2'], { value: 2 });

      const { result } = renderHook(() => useOptimisticUpdates(), { wrapper });

      act(() => {
        result.current.applyOptimisticUpdate(['test1'], (d: any) => d);
        result.current.applyOptimisticUpdate(['test2'], (d: any) => d);
      });

      let status: any;
      act(() => {
        status = result.current.getOptimisticStatus();
      });

      expect(status.activeContexts).toBe(2);
      expect(status.contexts.length).toBe(2);
      expect(status.contexts[0]).toHaveProperty('id');
      expect(status.contexts[0]).toHaveProperty('queryKey');
      expect(status.contexts[0]).toHaveProperty('age');
    });
  });
});

describe('withOptimisticUpdate', () => {
  it('should wrap mutation function', async () => {
    const mockMutationFn = jest.fn().mockResolvedValue({ success: true });
    const mockOptimisticFn = jest.fn().mockReturnValue({
      queryKey: ['test'],
      updater: (d: any) => d,
    });

    const wrappedFn = withOptimisticUpdate(mockMutationFn, mockOptimisticFn);

    const result = await wrappedFn({ id: '123' });

    expect(mockMutationFn).toHaveBeenCalledWith({ id: '123' });
    expect(result).toEqual({ success: true });
  });
});
