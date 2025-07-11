// TODO: Replace with actual event emitter implementation
import { eventEmitter } from '../utils/eventEmitter';
// TODO: Replace with actual search/favorite types
// import { SearchEntry, FavoriteEntry } from '../types/search.types';
import { databaseManager } from './DatabaseManager';
import { SQLiteDatabase } from 'expo-sqlite';

export class SearchHistoryRepository {
  private static instance: SearchHistoryRepository;
  private static SEARCH_HISTORY_TABLE = 'search_history';
  private static FAVORITES_TABLE = 'favorites';

  static getInstance(): SearchHistoryRepository {
    if (!SearchHistoryRepository.instance) {
      SearchHistoryRepository.instance = new SearchHistoryRepository();
    }
    return SearchHistoryRepository.instance;
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

  // --- Search History ---
  async getRecentSearches(limit: number = 20): Promise<any[]> { // TODO: type
    const db = await this.getDatabase();
    const statement = await db.prepareAsync(
      `SELECT * FROM ${SearchHistoryRepository.SEARCH_HISTORY_TABLE} ORDER BY timestamp DESC LIMIT ?`
    );
    const result = await statement.executeAsync(limit);
    const rows = await result.getAllAsync();
    await statement.finalizeAsync();
    return rows || [];
  }

  async saveSearchEntry(entry: any): Promise<void> { // TODO: type
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO ${SearchHistoryRepository.SEARCH_HISTORY_TABLE} (id, query, type, timestamp) VALUES (?, ?, ?, ?)`,
      [entry.id, entry.query, entry.type, entry.timestamp]
    );
    eventEmitter.emit('data_updated', { type: 'search', data: entry });
  }

  async removeSearchEntry(id: string): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync(
      `DELETE FROM ${SearchHistoryRepository.SEARCH_HISTORY_TABLE} WHERE id = ?`,
      [id]
    );
    // TODO: eventEmitter.emit('data_updated', ...)
  }

  // --- Favorites ---
  async getFavorites(type: string): Promise<any[]> { // TODO: type
    const db = await this.getDatabase();
    const statement = await db.prepareAsync(
      `SELECT * FROM ${SearchHistoryRepository.FAVORITES_TABLE} WHERE type = ? ORDER BY timestamp DESC`
    );
    const result = await statement.executeAsync(type);
    const rows = await result.getAllAsync();
    await statement.finalizeAsync();
    return rows || [];
  }

  async saveFavorite(entry: any): Promise<void> { // TODO: type
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO ${SearchHistoryRepository.FAVORITES_TABLE} (id, type, data, timestamp) VALUES (?, ?, ?, ?)`,
      [entry.id, entry.type, JSON.stringify(entry.data), entry.timestamp]
    );
    eventEmitter.emit('data_updated', { type: 'search_favorite', data: entry });
  }

  async removeFavorite(id: string): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync(
      `DELETE FROM ${SearchHistoryRepository.FAVORITES_TABLE} WHERE id = ?`,
      [id]
    );
    // TODO: eventEmitter.emit('data_updated', ...)
  }

  // --- Background Sync (stub) ---
  async syncWithRemote(remoteData: any): Promise<void> { // TODO: type
    // ...fetch remote, upsert to DB...
    // After sync:
    eventEmitter.emit('data_updated', { type: 'search', data: remoteData });
  }
} 