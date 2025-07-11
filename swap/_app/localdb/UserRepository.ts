// TODO: Replace with actual event emitter implementation
import { eventEmitter } from '../utils/eventEmitter';
// TODO: Replace with actual user types
// import { UserProfile, KycStatus } from '../types/user.types';
import { databaseManager } from './DatabaseManager';
import { SQLiteDatabase } from 'expo-sqlite';

export class UserRepository {
  private static instance: UserRepository;
  private static USER_TABLE = 'users';
  private static KYC_TABLE = 'kyc_status';

  static getInstance(): UserRepository {
    if (!UserRepository.instance) {
      UserRepository.instance = new UserRepository();
    }
    return UserRepository.instance;
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

  // Get user profile from local DB
  async getUser(): Promise<any | null> { // TODO: Replace any with UserProfile
    const db = await this.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM ${UserRepository.USER_TABLE} LIMIT 1`
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // Save or update user profile in local DB
  async saveUser(user: any): Promise<void> { // TODO: type
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO ${UserRepository.USER_TABLE} (id, data) VALUES (?, ?)`,
      [user.id, JSON.stringify(user)]
    );
    eventEmitter.emit('data_updated', { type: 'user', data: user });
  }

  // Update user profile fields
  async updateUser(user: any): Promise<void> { // TODO: type
    await this.saveUser(user);
  }

  // Get KYC status from local DB
  async getKycStatus(): Promise<any | null> { // TODO: Replace any with KycStatus
    const db = await this.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM ${UserRepository.KYC_TABLE} LIMIT 1`
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // Save or update KYC status
  async saveKycStatus(kyc: any): Promise<void> { // TODO: type
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO ${UserRepository.KYC_TABLE} (id, data) VALUES (?, ?)`,
      [kyc.id, JSON.stringify(kyc)]
    );
    eventEmitter.emit('data_updated', { type: 'kyc', data: kyc });
  }

  // Background sync: fetch from remote, update local, emit event
  async syncUserFromRemote(fetchRemote: () => Promise<any>): Promise<void> { // TODO: Replace any with UserProfile
    const remoteUser = await fetchRemote();
    await this.saveUser(remoteUser);
  }

  async syncKycFromRemote(fetchRemote: () => Promise<any>): Promise<void> { // TODO: Replace any with KycStatus
    const remoteKyc = await fetchRemote();
    await this.saveKycStatus(remoteKyc);
  }

  async syncWithRemote(remoteData: any): Promise<void> { // TODO: type
    // ...fetch remote, upsert to DB...
    // After sync:
    eventEmitter.emit('data_updated', { type: 'user', data: remoteData });
  }
}

// Usage example (in context or manager):
// const userRepo = UserRepository.getInstance();
// const user = await userRepo.getUser();
// if (!user) await userRepo.syncUserFromRemote(apiFetchUser);
// TODO: eventEmitter.on('data_updated', ({ type, data }) => { ... }); 