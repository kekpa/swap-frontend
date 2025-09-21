// PROFESSIONAL ARCHITECTURE: EventCoordinator for navigation-aware data updates
import { eventCoordinator } from '../utils/EventCoordinator';
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

  // PROFESSIONAL: Save user with navigation-aware event coordination
  async saveUser(user: any): Promise<void> { // TODO: type
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO ${UserRepository.USER_TABLE} (id, data) VALUES (?, ?)`,
      [user.id, JSON.stringify(user)]
    );

    // PROFESSIONAL: Use EventCoordinator for navigation-aware data events
    await eventCoordinator.emitDataUpdated('user', user, {
      source: 'UserRepository.saveUser',
      userId: user.id
    });
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

  // PROFESSIONAL: Save KYC with navigation-aware event coordination and data merging
  async saveKycStatus(kyc: any): Promise<void> { // TODO: type
    const db = await this.getDatabase();

    // CRITICAL FIX: Read existing local data first to preserve all completion flags
    let existingData = {};
    try {
      const existingRows = await db.getAllAsync(
        `SELECT * FROM ${UserRepository.KYC_TABLE} WHERE id = ?`,
        [kyc.id]
      );

      if (existingRows.length > 0) {
        const existingDataRaw = existingRows[0]?.data;
        if (existingDataRaw) {
          try {
            existingData = typeof existingDataRaw === 'string'
              ? JSON.parse(existingDataRaw)
              : existingDataRaw;
          } catch (parseError) {
            console.warn('[UserRepository] Failed to parse existing KYC data, using new data only');
            existingData = {};
          }
        }
      }
    } catch (error) {
      console.warn('[UserRepository] Error reading existing KYC data, using new data only:', error);
      existingData = {};
    }

    // CRITICAL FIX: Merge new data with existing data to preserve all completion flags
    const mergedData = {
      ...existingData,  // Preserve existing completion flags
      ...kyc,           // Apply new/updated data
      id: kyc.id        // Ensure ID is always set
    };

    console.log('🏛️ [UserRepository] PROFESSIONAL: Merging KYC data for local-first experience:', {
      kycId: kyc.id,
      existingKeys: Object.keys(existingData),
      newKeys: Object.keys(kyc),
      mergedKeys: Object.keys(mergedData),
      source: 'UserRepository.saveKycStatus'
    });

    // Save the complete merged data
    await db.runAsync(
      `INSERT OR REPLACE INTO ${UserRepository.KYC_TABLE} (id, data) VALUES (?, ?)`,
      [kyc.id, JSON.stringify(mergedData)]
    );

    console.log('🏛️ [UserRepository] PROFESSIONAL: Saving KYC status with EventCoordinator:', {
      kycId: kyc.id,
      source: 'UserRepository.saveKycStatus',
      usesProfessionalCoordination: true
    });

    // PROFESSIONAL: Use EventCoordinator for navigation-aware KYC events
    // This prevents the navigation glitches by coordinating with navigation state
    await eventCoordinator.emitDataUpdated('kyc', mergedData, {
      source: 'UserRepository.saveKycStatus',
      kycId: kyc.id,
      priority: 'high' // KYC updates are high priority
    });
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

  // PROFESSIONAL: Sync with navigation-aware coordination
  async syncWithRemote(remoteData: any): Promise<void> { // TODO: type
    // ...fetch remote, upsert to DB...

    // PROFESSIONAL: Use EventCoordinator for navigation-aware sync events
    await eventCoordinator.emitDataUpdated('user', remoteData, {
      source: 'UserRepository.syncWithRemote',
      isRemoteSync: true
    });
  }
}

// Export singleton instance
export const userRepository = UserRepository.getInstance(); 