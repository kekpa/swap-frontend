// TODO: Replace with actual event emitter implementation
import { eventEmitter } from '../utils/eventEmitter';
// TODO: Replace with actual location/search types
// import { Location, SearchResult } from '../types/map.types';
import { databaseManager } from './DatabaseManager';
import { SQLiteDatabase } from 'expo-sqlite';

export class LocationRepository {
  private static instance: LocationRepository;
  private static LOCATIONS_TABLE = 'locations';
  private static SEARCH_HISTORY_TABLE = 'search_history';
  private static FAVORITES_TABLE = 'favorites';

  static getInstance(): LocationRepository {
    if (!LocationRepository.instance) {
      LocationRepository.instance = new LocationRepository();
    }
    return LocationRepository.instance;
  }

  // Get database instance with proper error handling
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

  // Get all cached locations
  async getLocations(): Promise<any[]> { // TODO: Replace any with Location
    const db = await this.getDatabase();
    return await db.getAllAsync(
      `SELECT * FROM ${LocationRepository.LOCATIONS_TABLE} ORDER BY updatedAt DESC`
    );
  }

  // Save or update locations (bulk upsert)
  async saveLocations(locations: any[]): Promise<void> { // TODO: Replace any with Location
    const db = await this.getDatabase();
    for (const loc of locations) {
      const result = await db.runAsync(
        `UPDATE ${LocationRepository.LOCATIONS_TABLE} SET 
          name = ?, latitude = ?, longitude = ?, updatedAt = ?
          WHERE id = ?`,
        [loc.name, loc.latitude, loc.longitude, loc.updatedAt, loc.id]
      );
      if (result.changes === 0) {
        await db.runAsync(
          `INSERT INTO ${LocationRepository.LOCATIONS_TABLE} (id, name, latitude, longitude, updatedAt) VALUES (?, ?, ?, ?, ?)` ,
          [loc.id, loc.name, loc.latitude, loc.longitude, loc.updatedAt]
        );
      }
    }
    // TODO: eventEmitter.emit('data_updated', { type: 'locations', data: locations });
  }

  // Get recent search history (limit N)
  async getRecentSearches(limit: number = 10): Promise<any[]> { // TODO: Replace any with SearchResult
    const db = await this.getDatabase();
    return await db.getAllAsync(
      `SELECT * FROM ${LocationRepository.SEARCH_HISTORY_TABLE} ORDER BY searchedAt DESC LIMIT ?`,
      [limit]
    );
  }

  // Add a search to history
  async addSearch(query: string, result: any): Promise<void> { // TODO: Replace any with SearchResult
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT INTO ${LocationRepository.SEARCH_HISTORY_TABLE} (query, result, searchedAt) VALUES (?, ?, ?)`,
      [query, JSON.stringify(result), new Date().toISOString()]
    );
    // TODO: eventEmitter.emit('data_updated', { type: 'search_history', data: { query, result } });
  }

  // Get all favorites
  async getFavorites(): Promise<any[]> { // TODO: Replace any with Location
    const db = await this.getDatabase();
    return await db.getAllAsync(
      `SELECT * FROM ${LocationRepository.FAVORITES_TABLE} ORDER BY addedAt DESC`
    );
  }

  // Add a favorite
  async addFavorite(location: any): Promise<void> { // TODO: Replace any with Location
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT OR IGNORE INTO ${LocationRepository.FAVORITES_TABLE} (id, name, latitude, longitude, addedAt) VALUES (?, ?, ?, ?, ?)`,
      [location.id, location.name, location.latitude, location.longitude, new Date().toISOString()]
    );
    // TODO: eventEmitter.emit('data_updated', { type: 'favorites', data: location });
  }

  // Remove a favorite
  async removeFavorite(id: string): Promise<void> {
    const db = await this.getDatabase();
    await db.runAsync(
      `DELETE FROM ${LocationRepository.FAVORITES_TABLE} WHERE id = ?`,
      [id]
    );
    // TODO: eventEmitter.emit('data_updated', { type: 'favorites', data: { id, removed: true } });
  }

  // Background sync: fetch from remote, update local, emit event
  async syncLocationsFromRemote(fetchRemote: () => Promise<any[]>): Promise<void> { // TODO: Replace any with Location
    const remoteLocations = await fetchRemote();
    await this.saveLocations(remoteLocations);
  }

  async saveLocation(location: any): Promise<void> { // TODO: type
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO ${LocationRepository.LOCATIONS_TABLE} (id, data) VALUES (?, ?)`,
      [location.id, JSON.stringify(location)]
    );
    eventEmitter.emit('data_updated', { type: 'location', data: location });
  }

  async saveSearchEntry(entry: any): Promise<void> { // TODO: type
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO ${LocationRepository.SEARCH_HISTORY_TABLE} (id, data) VALUES (?, ?)`,
      [entry.id, JSON.stringify(entry)]
    );
    eventEmitter.emit('data_updated', { type: 'location_search', data: entry });
  }

  async saveFavorite(favorite: any): Promise<void> { // TODO: type
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO ${LocationRepository.FAVORITES_TABLE} (id, data) VALUES (?, ?)`,
      [favorite.id, JSON.stringify(favorite)]
    );
    eventEmitter.emit('data_updated', { type: 'location_favorite', data: favorite });
  }

  async syncWithRemote(remoteData: any): Promise<void> { // TODO: type
    // ...fetch remote, upsert to DB...
    // After sync:
    eventEmitter.emit('data_updated', { type: 'location', data: remoteData });
  }
}

// Usage example (in context or manager):
// const locRepo = LocationRepository.getInstance();
// const locations = await locRepo.getLocations();
// if (locations.length === 0) await locRepo.syncLocationsFromRemote(apiFetchLocations);
// TODO: eventEmitter.on('data_updated', ({ type, data }) => { ... }); 