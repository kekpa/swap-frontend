// Created: Unified local timeline schema for WhatsApp-grade local-first architecture - 2025-12-22
// ALIGNED WITH SUPABASE: messages, transaction_ledger, interaction_timeline, currencies

import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../../utils/logger';

/**
 * Local Timeline Item - Unified schema for messages AND transactions
 *
 * ALIGNED WITH SUPABASE:
 * - messages table (id, interaction_id, from_entity_id, to_entity_id, content, message_status)
 * - transaction_ledger (id, interaction_id, from_entity_id, to_entity_id, amount, currency_id)
 * - interaction_timeline (activity_type, source_id, from_entity_id, to_entity_id, timeline_data, timeline_metadata)
 * - currencies (code, symbol)
 *
 * NAMING CONVENTION: Uses from_entity_id/to_entity_id for BOTH messages AND transactions
 * for consistency across the entire system.
 */
export interface LocalTimelineItem {
  // === PRIMARY KEYS ===
  id: string;                    // Client-generated UUID (for optimistic UI)
  server_id: string | null;      // Server-assigned UUID (null until synced)

  // === COMMON FIELDS (both messages & transactions) ===
  interaction_id: string;        // FK to interactions
  profile_id: string;            // For multi-profile isolation
  item_type: 'message' | 'transaction';  // Discriminator
  created_at: string;            // ISO timestamp

  // === ENTITY DIRECTION (used for BOTH messages AND transactions) ===
  // ALIGNED WITH SUPABASE: from_entity_id/to_entity_id for consistency
  from_entity_id: string;              // Who SENT (message sender OR money sender) - NOT NULL
  to_entity_id: string | null;         // Who RECEIVED (message recipient OR money recipient)

  // === SYNC STATUS (local-first tracking) ===
  sync_status: SyncStatus;
  local_status: string;          // MessageLocalStatus or TransactionLocalStatus
  retry_count: number;
  last_error: string | null;

  // === MESSAGE FIELDS (null for transactions) ===
  content: string | null;
  message_type: string | null;   // 'text' | 'image' | 'file' | 'audio'

  // === TRANSACTION FIELDS (null for messages) ===
  amount: number | null;
  currency_id: string | null;    // FK to currencies table
  currency_code: string | null;  // Denormalized: 'HTG', 'USD'
  currency_symbol: string | null; // Denormalized: 'G', '$'
  transaction_type: string | null; // 'p2p' | 'transfer' | 'request' | 'refund'
  description: string | null;
  from_wallet_id: string | null;
  to_wallet_id: string | null;

  // === METADATA (aligned with Supabase timeline_metadata) ===
  timeline_metadata: string | null;  // JSON stringified - retry tracking, executor info
}

/**
 * Sync status for local-first tracking
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

/**
 * Message status values (aligned with Supabase message_status_enum)
 */
export type MessageLocalStatus =
  | 'pending'     // Written locally, not yet sent
  | 'queued'      // In sync queue
  | 'processing'  // Being sent
  | 'sent'        // Sent to server
  | 'delivered'   // Delivered to recipient
  | 'failed'      // Send failed
  | 'cancelled'   // Cancelled by user
  | 'expired';    // Expired

/**
 * Transaction status values (aligned with Saga architecture)
 */
export type TransactionLocalStatus =
  | 'pending'           // Written locally, not yet sent
  | 'processing_queued' // Sent to server, in queue
  | 'balance_checking'  // Saga step
  | 'balance_verified'  // Saga step
  | 'kyc_checking'      // Saga step
  | 'kyc_verified'      // Saga step
  | 'aml_checking'      // Saga step
  | 'aml_verified'      // Saga step
  | 'debit_executing'   // Saga step
  | 'debit_executed'    // Saga step
  | 'credit_executing'  // Saga step
  | 'credit_executed'   // Saga step
  | 'completing'        // Saga step
  | 'completed'         // Success
  | 'failed'            // Failed
  | 'cancelled'         // Cancelled
  | 'reversed';         // Reversed

/**
 * Check if a status indicates processing (for UI spinners)
 */
export function isProcessingStatus(status: string): boolean {
  const processingStatuses = [
    'pending', 'queued', 'processing', 'syncing',
    'processing_queued', 'balance_checking', 'balance_verified',
    'kyc_checking', 'kyc_verified', 'aml_checking', 'aml_verified',
    'debit_executing', 'debit_executed', 'credit_executing', 'credit_executed',
    'completing'
  ];
  return processingStatuses.includes(status.toLowerCase());
}

/**
 * Check if a status indicates a terminal state (no more changes expected)
 */
export function isTerminalStatus(status: string): boolean {
  const terminalStatuses = ['sent', 'delivered', 'completed', 'failed', 'cancelled', 'reversed', 'expired'];
  return terminalStatuses.includes(status.toLowerCase());
}

/**
 * Initialize the local_timeline table for unified local-first architecture
 *
 * This is a NEW table (not replacing existing tables) that provides:
 * - Unified view of messages AND transactions
 * - Local-first optimistic UI support
 * - Background sync tracking
 * - WhatsApp-grade instant responsiveness
 */
export async function initializeLocalTimelineSchema(db: SQLiteDatabase): Promise<void> {
  try {
    // Create unified local_timeline table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_timeline (
        -- Primary keys
        id TEXT PRIMARY KEY,
        server_id TEXT,

        -- Common fields
        interaction_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        item_type TEXT NOT NULL CHECK (item_type IN ('message', 'transaction')),
        from_entity_id TEXT NOT NULL,
        to_entity_id TEXT,
        created_at TEXT NOT NULL,

        -- Sync tracking
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
        local_status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,

        -- Message fields (NULL for transactions)
        content TEXT,
        message_type TEXT DEFAULT 'text',

        -- Transaction fields (NULL for messages)
        amount REAL,
        currency_id TEXT,
        currency_code TEXT,
        currency_symbol TEXT,
        transaction_type TEXT DEFAULT 'p2p',
        description TEXT,
        from_wallet_id TEXT,
        to_wallet_id TEXT,

        -- Metadata (aligned with Supabase timeline_metadata)
        timeline_metadata TEXT,

        -- Constraints
        UNIQUE(interaction_id, id)
      );
    `);

    // Create performance indexes
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_local_timeline_interaction
        ON local_timeline(interaction_id, created_at DESC);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_local_timeline_profile
        ON local_timeline(profile_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_local_timeline_pending
        ON local_timeline(sync_status)
        WHERE sync_status IN ('pending', 'failed');
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_local_timeline_server_id
        ON local_timeline(server_id)
        WHERE server_id IS NOT NULL;
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_local_timeline_item_type
        ON local_timeline(item_type);
    `);


    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_local_timeline_from_entity
        ON local_timeline(from_entity_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_local_timeline_to_entity
        ON local_timeline(to_entity_id);
    `);

    logger.info('[LocalTimeline] Schema initialized successfully - WhatsApp-grade local-first architecture');
  } catch (error) {
    logger.error('[LocalTimeline] Failed to initialize schema:', error);
    throw error;
  }
}
