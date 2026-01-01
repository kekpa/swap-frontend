// UserRepository: Local SQLite storage for user and KYC data
// NOTE: EventCoordinator removed - TanStack Query handles data reactivity
import { databaseManager } from './DatabaseManager';
import { SQLiteDatabase } from 'expo-sqlite';
import logger from '../utils/logger';

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

  // Get user profile from local DB (ENTITY-ISOLATED)
  async getUser(entityId: string): Promise<any | null> { // TODO: Replace any with UserProfile
    const db = await this.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM ${UserRepository.USER_TABLE} WHERE entity_id = ? LIMIT 1`,
      [entityId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // Save user to local SQLite (ENTITY-ISOLATED)
  async saveUser(user: any, entityId: string): Promise<void> { // TODO: type
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO ${UserRepository.USER_TABLE} (id, data, entity_id) VALUES (?, ?, ?)`,
      [user.id, JSON.stringify(user), entityId]
    );
    // Data saved - TanStack Query will fetch fresh data when needed
  }

  // Update user profile fields (ENTITY-ISOLATED)
  async updateUser(user: any, entityId: string): Promise<void> { // TODO: type
    await this.saveUser(user, entityId);
  }

  // Get KYC status from local DB (ENTITY-ISOLATED)
  async getKycStatus(entityId: string): Promise<any | null> { // TODO: Replace any with KycStatus
    const db = await this.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM ${UserRepository.KYC_TABLE} WHERE entity_id = ? LIMIT 1`,
      [entityId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // PROFESSIONAL: Save KYC with navigation-aware event coordination and data merging (ENTITY-ISOLATED)
  // SECURITY FIX: Accept object with entity_id to prevent signature mismatch bugs
  async saveKycStatus(kycData: any & { entity_id: string }): Promise<void> { // TODO: type
    const db = await this.getDatabase();

    // Extract entityId from the data object (prevents entity_id = NULL bugs)
    const entityId = kycData.entity_id;
    if (!entityId) {
      throw new Error('[UserRepository] saveKycStatus: entity_id is required for data isolation');
    }

    // Extract kyc data without the entity_id property
    const { entity_id, ...kyc } = kycData;

    // CRITICAL FIX: Read existing local data first to preserve all completion flags
    let existingData = {};
    try {
      const existingRows = await db.getAllAsync(
        `SELECT * FROM ${UserRepository.KYC_TABLE} WHERE id = ? AND entity_id = ?`,
        [kyc.id, entityId]
      );

      if (existingRows.length > 0) {
        const existingDataRaw = existingRows[0]?.data;
        if (existingDataRaw) {
          try {
            existingData = typeof existingDataRaw === 'string'
              ? JSON.parse(existingDataRaw)
              : existingDataRaw;
          } catch (parseError) {
            logger.warn("Failed to parse existing KYC data, using new data only", "data");
            existingData = {};
          }
        }
      }
    } catch (error) {
      logger.warn("Error reading existing KYC data, using new data only", "data", { error });
      existingData = {};
    }

    // CRITICAL FIX: Merge new data with existing data to preserve all completion flags
    const mergedData = {
      ...existingData,  // Preserve existing completion flags
      ...kyc,           // Apply new/updated data
      id: kyc.id        // Ensure ID is always set
    };

    logger.debug("Merging KYC data for local-first experience", "data", {
      kycId: kyc.id,
      existingKeys: Object.keys(existingData),
      newKeys: Object.keys(kyc),
      mergedKeys: Object.keys(mergedData),
      source: 'UserRepository.saveKycStatus'
    });

    // Save the complete merged data
    await db.runAsync(
      `INSERT OR REPLACE INTO ${UserRepository.KYC_TABLE} (id, data, entity_id) VALUES (?, ?, ?)`,
      [kyc.id, JSON.stringify(mergedData), entityId]
    );

    logger.debug("KYC status saved", "data", { kycId: kyc.id });
    // Data saved - TanStack Query will fetch fresh data when needed
  }

  // Background sync: fetch from remote, update local, emit event (ENTITY-ISOLATED)
  async syncUserFromRemote(fetchRemote: () => Promise<any>, entityId: string): Promise<void> { // TODO: Replace any with UserProfile
    const remoteUser = await fetchRemote();
    await this.saveUser(remoteUser, entityId);
  }

  async syncKycFromRemote(fetchRemote: () => Promise<any>, entityId: string): Promise<void> { // TODO: Replace any with KycStatus
    const remoteKyc = await fetchRemote();
    await this.saveKycStatus({ ...remoteKyc, entity_id: entityId });
  }

  // Sync with remote data (ENTITY-ISOLATED)
  async syncWithRemote(remoteData: any, entityId: string): Promise<void> { // TODO: type
    // Save remote data to local SQLite
    if (remoteData?.id) {
      await this.saveUser(remoteData, entityId);
    }
    // Data saved - TanStack Query will fetch fresh data when needed
  }
}

// Export singleton instance
export const userRepository = UserRepository.getInstance(); 