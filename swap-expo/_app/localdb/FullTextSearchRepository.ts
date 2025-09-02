// Full-text search repository with WhatsApp-style instant search - 2025-01-25
// Provides instant search across transactions, contacts, and messages with SQLite FTS

import { SQLiteDatabase } from 'expo-sqlite';
import { databaseManager } from './DatabaseManager';
import logger from '../utils/logger';

// Search result interfaces
interface SearchResult {
  id: string;
  type: 'transaction' | 'contact' | 'message' | 'interaction';
  title: string;
  subtitle: string;
  amount?: string;
  currency?: string;
  date: string;
  entityId?: string;
  avatarColor?: string;
  initials?: string;
  relevanceScore: number;
}

interface SearchCategories {
  transactions: SearchResult[];
  contacts: SearchResult[];
  messages: SearchResult[];
  all: SearchResult[];
}

class FullTextSearchRepository {
  private static instance: FullTextSearchRepository;
  
  // FTS virtual table names
  private static readonly FTS_TRANSACTIONS = 'fts_transactions';
  private static readonly FTS_CONTACTS = 'fts_contacts';
  private static readonly FTS_MESSAGES = 'fts_messages';

  static getInstance(): FullTextSearchRepository {
    if (!FullTextSearchRepository.instance) {
      FullTextSearchRepository.instance = new FullTextSearchRepository();
    }
    return FullTextSearchRepository.instance;
  }

  private async getDatabase(): Promise<SQLiteDatabase> {
    const isReady = await databaseManager.initialize();
    if (!isReady) {
      throw new Error('Database initialization failed');
    }
    const db = databaseManager.getDatabase();
    if (!db) {
      throw new Error('Database instance not available');
    }
    return db;
  }

  /**
   * Initialize FTS virtual tables
   */
  async initializeFTS(): Promise<void> {
    logger.debug('[FullTextSearch] 🔍 Initializing FTS virtual tables');
    const db = await this.getDatabase();

    try {
      // Create FTS virtual table for transactions
      await db.execAsync(`
        CREATE VIRTUAL TABLE IF NOT EXISTS ${FullTextSearchRepository.FTS_TRANSACTIONS} USING fts5(
          transaction_id,
          description,
          merchant_name,
          category,
          amount,
          currency_symbol,
          currency_code,
          date_created,
          from_entity_name,
          to_entity_name,
          tokenize='porter ascii'
        );
      `);

      // Create FTS virtual table for contacts
      await db.execAsync(`
        CREATE VIRTUAL TABLE IF NOT EXISTS ${FullTextSearchRepository.FTS_CONTACTS} USING fts5(
          entity_id,
          display_name,
          username,
          email,
          phone_number,
          first_name,
          last_name,
          tokenize='porter ascii'
        );
      `);

      // Create FTS virtual table for messages
      await db.execAsync(`
        CREATE VIRTUAL TABLE IF NOT EXISTS ${FullTextSearchRepository.FTS_MESSAGES} USING fts5(
          message_id,
          interaction_id,
          content,
          sender_name,
          recipient_name,
          created_at,
          tokenize='porter ascii'
        );
      `);

      logger.info('[FullTextSearch] ✅ FTS virtual tables initialized successfully');
    } catch (error) {
      logger.error('[FullTextSearch] ❌ Failed to initialize FTS tables:', error);
      throw error;
    }
  }

  /**
   * WhatsApp-style universal search across all content
   */
  async searchAll(query: string, limit: number = 20): Promise<SearchCategories> {
    if (!query || query.trim().length < 2) {
      return { transactions: [], contacts: [], messages: [], all: [] };
    }

    logger.debug(`[FullTextSearch] 🔍 UNIVERSAL SEARCH: "${query}"`);
    
    const normalizedQuery = this.normalizeSearchQuery(query);
    
    try {
      const [transactions, contacts, messages] = await Promise.all([
        this.searchTransactions(normalizedQuery, Math.ceil(limit / 3)),
        this.searchContacts(normalizedQuery, Math.ceil(limit / 3)),
        this.searchMessages(normalizedQuery, Math.ceil(limit / 3)),
      ]);

      // Combine and sort by relevance
      const allResults = [...transactions, ...contacts, ...messages]
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      logger.debug(`[FullTextSearch] ✅ UNIVERSAL SEARCH: Found ${allResults.length} results`);

      return {
        transactions,
        contacts,
        messages,
        all: allResults,
      };
    } catch (error) {
      logger.error(`[FullTextSearch] ❌ UNIVERSAL SEARCH failed:`, error);
      return { transactions: [], contacts: [], messages: [], all: [] };
    }
  }

  /**
   * Search transactions with FTS
   */
  async searchTransactions(query: string, limit: number = 10): Promise<SearchResult[]> {
    const db = await this.getDatabase();
    const normalizedQuery = this.normalizeSearchQuery(query);

    try {
      const statement = await db.prepareAsync(`
        SELECT 
          transaction_id,
          description,
          merchant_name,
          amount,
          currency_symbol,
          currency_code,
          date_created,
          from_entity_name,
          to_entity_name,
          rank
        FROM ${FullTextSearchRepository.FTS_TRANSACTIONS}
        WHERE ${FullTextSearchRepository.FTS_TRANSACTIONS} MATCH ?
        ORDER BY rank
        LIMIT ?
      `);

      const result = await statement.executeAsync(normalizedQuery, limit);
      const rows = await result.getAllAsync();
      await statement.finalizeAsync();

      return rows.map((row: any, index: number) => ({
        id: row.transaction_id,
        type: 'transaction' as const,
        title: row.merchant_name || row.description || 'Transaction',
        subtitle: row.description || `${row.from_entity_name} → ${row.to_entity_name}`,
        amount: row.amount,
        currency: row.currency_symbol || row.currency_code,
        date: row.date_created,
        relevanceScore: 100 - index, // Higher score for better FTS ranking
      }));
    } catch (error) {
      logger.warn(`[FullTextSearch] ⚠️ Transaction search failed:`, error);
      return [];
    }
  }

  /**
   * Search contacts with FTS
   */
  async searchContacts(query: string, limit: number = 10): Promise<SearchResult[]> {
    const db = await this.getDatabase();
    const normalizedQuery = this.normalizeSearchQuery(query);

    try {
      const statement = await db.prepareAsync(`
        SELECT 
          entity_id,
          display_name,
          username,
          email,
          phone_number,
          first_name,
          last_name,
          rank
        FROM ${FullTextSearchRepository.FTS_CONTACTS}
        WHERE ${FullTextSearchRepository.FTS_CONTACTS} MATCH ?
        ORDER BY rank
        LIMIT ?
      `);

      const result = await statement.executeAsync(normalizedQuery, limit);
      const rows = await result.getAllAsync();
      await statement.finalizeAsync();

      return rows.map((row: any, index: number) => {
        const displayName = row.display_name || `${row.first_name || ''} ${row.last_name || ''}`.trim();
        return {
          id: row.entity_id,
          type: 'contact' as const,
          title: displayName,
          subtitle: row.username || row.email || row.phone_number || 'Contact',
          date: '', // Contacts don't have dates
          entityId: row.entity_id,
          initials: this.getInitials(displayName),
          avatarColor: this.getAvatarColor(displayName),
          relevanceScore: 90 - index, // Slightly lower than transactions
        };
      });
    } catch (error) {
      logger.warn(`[FullTextSearch] ⚠️ Contact search failed:`, error);
      return [];
    }
  }

  /**
   * Search messages with FTS
   */
  async searchMessages(query: string, limit: number = 10): Promise<SearchResult[]> {
    const db = await this.getDatabase();
    const normalizedQuery = this.normalizeSearchQuery(query);

    try {
      const statement = await db.prepareAsync(`
        SELECT 
          message_id,
          interaction_id,
          content,
          sender_name,
          recipient_name,
          created_at,
          rank
        FROM ${FullTextSearchRepository.FTS_MESSAGES}
        WHERE ${FullTextSearchRepository.FTS_MESSAGES} MATCH ?
        ORDER BY rank
        LIMIT ?
      `);

      const result = await statement.executeAsync(normalizedQuery, limit);
      const rows = await result.getAllAsync();
      await statement.finalizeAsync();

      return rows.map((row: any, index: number) => ({
        id: row.message_id,
        type: 'message' as const,
        title: this.truncateText(row.content, 50),
        subtitle: `From ${row.sender_name} to ${row.recipient_name}`,
        date: row.created_at,
        relevanceScore: 80 - index, // Lowest priority for messages
      }));
    } catch (error) {
      logger.warn(`[FullTextSearch] ⚠️ Message search failed:`, error);
      return [];
    }
  }

  /**
   * Index transaction for FTS
   */
  async indexTransaction(transaction: any): Promise<void> {
    const db = await this.getDatabase();

    try {
      await db.runAsync(`
        INSERT OR REPLACE INTO ${FullTextSearchRepository.FTS_TRANSACTIONS} (
          transaction_id, description, merchant_name, category, amount, 
          currency_symbol, currency_code, date_created, from_entity_name, to_entity_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        transaction.id,
        transaction.description || '',
        transaction.merchant_name || transaction.category || '',
        transaction.category || '',
        transaction.amount?.toString() || '',
        transaction.currency_symbol || '',
        transaction.currency_code || '',
        transaction.created_at || new Date().toISOString(),
        transaction.from_entity_name || '',
        transaction.to_entity_name || '',
      ]);
    } catch (error) {
      logger.warn(`[FullTextSearch] ⚠️ Failed to index transaction ${transaction.id}:`, error);
    }
  }

  /**
   * Index contact for FTS
   */
  async indexContact(contact: any): Promise<void> {
    const db = await this.getDatabase();

    try {
      await db.runAsync(`
        INSERT OR REPLACE INTO ${FullTextSearchRepository.FTS_CONTACTS} (
          entity_id, display_name, username, email, phone_number, first_name, last_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        contact.entityId || contact.entity_id,
        contact.displayName || contact.display_name || '',
        contact.username || '',
        contact.email || '',
        contact.phoneNumber || contact.phone_number || '',
        contact.firstName || contact.first_name || '',
        contact.lastName || contact.last_name || '',
      ]);
    } catch (error) {
      logger.warn(`[FullTextSearch] ⚠️ Failed to index contact ${contact.entityId || contact.entity_id}:`, error);
    }
  }

  /**
   * Index message for FTS
   */
  async indexMessage(message: any): Promise<void> {
    const db = await this.getDatabase();

    try {
      await db.runAsync(`
        INSERT OR REPLACE INTO ${FullTextSearchRepository.FTS_MESSAGES} (
          message_id, interaction_id, content, sender_name, recipient_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        message.id,
        message.interaction_id || '',
        message.content || message.text || '',
        message.sender_name || '',
        message.recipient_name || '',
        message.created_at || new Date().toISOString(),
      ]);
    } catch (error) {
      logger.warn(`[FullTextSearch] ⚠️ Failed to index message ${message.id}:`, error);
    }
  }

  /**
   * Batch index multiple items
   */
  async batchIndex(items: { type: 'transaction' | 'contact' | 'message'; data: any }[]): Promise<void> {
    logger.debug(`[FullTextSearch] 📦 BATCH INDEX: Indexing ${items.length} items`);

    for (const item of items) {
      try {
        switch (item.type) {
          case 'transaction':
            await this.indexTransaction(item.data);
            break;
          case 'contact':
            await this.indexContact(item.data);
            break;
          case 'message':
            await this.indexMessage(item.data);
            break;
        }
      } catch (error) {
        logger.warn(`[FullTextSearch] ⚠️ Failed to index ${item.type}:`, error);
      }
    }

    logger.info(`[FullTextSearch] ✅ BATCH INDEX: Completed indexing ${items.length} items`);
  }

  /**
   * Clear all FTS indexes
   */
  async clearIndex(): Promise<void> {
    const db = await this.getDatabase();
    
    try {
      await db.execAsync(`DELETE FROM ${FullTextSearchRepository.FTS_TRANSACTIONS};`);
      await db.execAsync(`DELETE FROM ${FullTextSearchRepository.FTS_CONTACTS};`);
      await db.execAsync(`DELETE FROM ${FullTextSearchRepository.FTS_MESSAGES};`);
      
      logger.info('[FullTextSearch] 🧹 All FTS indexes cleared');
    } catch (error) {
      logger.error('[FullTextSearch] ❌ Failed to clear indexes:', error);
    }
  }

  /**
   * Normalize search query for FTS
   */
  private normalizeSearchQuery(query: string): string {
    // Remove special characters, normalize spaces, add FTS wildcards
    return query
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(term => term.length > 1)
      .map(term => `${term}*`)
      .join(' OR ');
  }

  /**
   * Generate initials from name
   */
  private getInitials(name: string): string {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Generate consistent avatar color
   */
  private getAvatarColor(name: string): string {
    const colors = ['#3B82F6', '#8B5CF6', '#EF4444', '#F97316', '#10B981', '#06B6D4', '#8B5A2B', '#EC4899'];
    const charCode = name.charCodeAt(0) || 0;
    return colors[Math.abs(charCode) % colors.length];
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

export const fullTextSearchRepository = FullTextSearchRepository.getInstance();
export default fullTextSearchRepository;