// Created: SQLite schema upgrade for improved message handling and offline reliability - 2025-05-21

import { Database } from '../db-interfaces';

/**
 * Apply message table schema upgrades for better offline message handling
 */
export async function upgradeMessageSchema(db: Database): Promise<void> {
  try {
    // Start a transaction for the entire schema upgrade
    await db.transaction(async (tx) => {
      // 1. Add client_generated_id column for message deduplication
      await tx.execute(`
        ALTER TABLE messages 
        ADD COLUMN client_generated_id TEXT;
      `);
      
      // 2. Add message_status column if it doesn't exist
      await tx.execute(`
        ALTER TABLE messages 
        ADD COLUMN message_status TEXT 
        DEFAULT 'sent' 
        CHECK (message_status IN ('pending', 'sending', 'sent', 'delivered', 'read', 'failed'));
      `);
      
      // 3. Update message_status based on status column
      await tx.execute(`
        UPDATE messages 
        SET message_status = 
          CASE 
            WHEN status = 'pending' THEN 'pending'
            WHEN status = 'sending' THEN 'sending'
            WHEN status = 'delivered' THEN 'delivered'
            WHEN status = 'read' THEN 'read'
            WHEN status = 'failed' THEN 'failed'
            ELSE 'sent'
          END
        WHERE status IS NOT NULL;
      `);
      
      // 4. Add retry_count column for offline message handling
      await tx.execute(`
        ALTER TABLE messages 
        ADD COLUMN retry_count INTEGER DEFAULT 0;
      `);
      
      // 5. Add last_retry_at timestamp for managing retry attempts
      await tx.execute(`
        ALTER TABLE messages 
        ADD COLUMN last_retry_at INTEGER;
      `);
      
      // 6. Add is_synced flag to track which messages are synced with server
      await tx.execute(`
        ALTER TABLE messages 
        ADD COLUMN is_synced INTEGER DEFAULT 0;
      `);
      
      // 7. Create indexes for common query patterns
      
      // Index for faster deduplication lookups
      await tx.execute(`
        CREATE INDEX IF NOT EXISTS idx_messages_client_id 
        ON messages(client_generated_id);
      `);
      
      // Index for interaction message history (most common query)
      await tx.execute(`
        CREATE INDEX IF NOT EXISTS idx_messages_interaction_created 
        ON messages(interaction_id, created_at DESC);
      `);
      
      // Index for finding messages that need to be synced
      await tx.execute(`
        CREATE INDEX IF NOT EXISTS idx_messages_sync_status 
        ON messages(is_synced) 
        WHERE is_synced = 0;
      `);
      
      // Index for pending/failed messages that need retry
      await tx.execute(`
        CREATE INDEX IF NOT EXISTS idx_messages_retry 
        ON messages(message_status, retry_count) 
        WHERE message_status IN ('pending', 'sending', 'failed');
      `);
      
      // 8. Improve message_receipts table
      
      // Add delivered_at and read_at timestamps
      await tx.execute(`
        ALTER TABLE message_receipts 
        ADD COLUMN delivered_at INTEGER;
      `);
      
      await tx.execute(`
        ALTER TABLE message_receipts 
        ADD COLUMN read_at INTEGER;
      `);
      
      // Fill in timestamps based on status
      await tx.execute(`
        UPDATE message_receipts
        SET 
          delivered_at = CASE WHEN status = 'delivered' THEN updated_at ELSE NULL END,
          read_at = CASE WHEN status = 'read' THEN updated_at ELSE NULL END;
      `);
      
      // Add is_synced column for two-way sync
      await tx.execute(`
        ALTER TABLE message_receipts 
        ADD COLUMN is_synced INTEGER DEFAULT 0;
      `);
      
      // Index for finding unsynced receipts
      await tx.execute(`
        CREATE INDEX IF NOT EXISTS idx_receipts_sync 
        ON message_receipts(is_synced) 
        WHERE is_synced = 0;
      `);
      
      // 9. Create a view for unread message counts
      await tx.execute(`
        CREATE VIEW IF NOT EXISTS unread_message_counts AS
        SELECT 
          m.interaction_id,
          COUNT(*) as unread_count
        FROM 
          messages m
        LEFT JOIN 
          message_receipts mr ON m.id = mr.message_id AND mr.entity_id = 
            (SELECT profile_id FROM user_session LIMIT 1)
        WHERE 
          m.sender_entity_id != (SELECT profile_id FROM user_session LIMIT 1)
          AND (mr.id IS NULL OR mr.status != 'read')
        GROUP BY 
          m.interaction_id;
      `);
    });
    
    console.log('[Database] Message schema upgrade completed successfully');
  } catch (error) {
    console.error('[Database] Failed to upgrade message schema:', error);
    throw error;
  }
}

/**
 * Create SQLite triggers for message and receipt management
 */
export async function createMessageTriggers(db: Database): Promise<void> {
  try {
    // 1. Trigger to update message_status based on receipt status
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS update_message_status_on_receipt
      AFTER INSERT ON message_receipts
      FOR EACH ROW
      BEGIN
        -- If all members have read the message, update message status to read
        UPDATE messages
        SET status = 'read' 
        WHERE id = NEW.message_id 
        AND NOT EXISTS (
              SELECT 1 
          FROM interaction_members ip
          WHERE ip.interaction_id = (
            SELECT interaction_id 
            FROM messages 
            WHERE id = NEW.message_id
          )
          AND ip.entity_id != NEW.reader_entity_id
          AND ip.entity_id NOT IN (
            SELECT reader_entity_id 
            FROM message_read_receipts 
            WHERE message_id = NEW.message_id
          )
          AND ip.entity_id NOT IN (
            SELECT sender_entity_id 
            FROM messages 
            WHERE id = NEW.message_id
          )
        );
      END;
    `);
    
    // 2. Trigger to auto-create message receipts for self-sent messages
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS auto_receipt_on_message_insert
      AFTER INSERT ON messages
      FOR EACH ROW
      WHEN NEW.sender_entity_id = (SELECT profile_id FROM user_session LIMIT 1)
      BEGIN
        INSERT INTO message_receipts (
          id, 
          message_id, 
          entity_id, 
          status, 
          updated_at,
          delivered_at,
          read_at,
          is_synced
        )
        VALUES (
          hex(randomblob(16)),
          NEW.id,
          NEW.sender_entity_id,
          'read',
          unixepoch(),
          unixepoch(),
          unixepoch(),
          0
        );
      END;
    `);
    
    console.log('[Database] Message triggers created successfully');
  } catch (error) {
    console.error('[Database] Failed to create message triggers:', error);
    throw error;
  }
}

/**
 * Apply both schema upgrades and create triggers
 */
export async function upgradeMessageDatabase(db: Database): Promise<void> {
  await upgradeMessageSchema(db);
  await createMessageTriggers(db);
} 