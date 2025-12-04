// UserRepository: Local SQLite storage for user and KYC data
// NOTE: EventCoordinator removed - TanStack Query handles data reactivity
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

  // Get user profile from local DB (PROFILE-ISOLATED)
  async getUser(profileId: string): Promise<any | null> { // TODO: Replace any with UserProfile
    const db = await this.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM ${UserRepository.USER_TABLE} WHERE profile_id = ? LIMIT 1`,
      [profileId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // Save user to local SQLite (PROFILE-ISOLATED)
  async saveUser(user: any, profileId: string): Promise<void> { // TODO: type
    const db = await this.getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO ${UserRepository.USER_TABLE} (id, data, profile_id) VALUES (?, ?, ?)`,
      [user.id, JSON.stringify(user), profileId]
    );
    // Data saved - TanStack Query will fetch fresh data when needed
  }

  // Update user profile fields (PROFILE-ISOLATED)
  async updateUser(user: any, profileId: string): Promise<void> { // TODO: type
    await this.saveUser(user, profileId);
  }

  // Get KYC status from local DB (PROFILE-ISOLATED)
  async getKycStatus(profileId: string): Promise<any | null> { // TODO: Replace any with KycStatus
    const db = await this.getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM ${UserRepository.KYC_TABLE} WHERE profile_id = ? LIMIT 1`,
      [profileId]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // PROFESSIONAL: Save KYC with navigation-aware event coordination and data merging (PROFILE-ISOLATED)
  // SECURITY FIX: Accept object with profile_id to prevent signature mismatch bugs
  async saveKycStatus(kycData: any & { profile_id: string }): Promise<void> { // TODO: type
    const db = await this.getDatabase();

    // Extract profileId from the data object (prevents profile_id = NULL bugs)
    const profileId = kycData.profile_id;
    if (!profileId) {
      throw new Error('[UserRepository] saveKycStatus: profile_id is required for data isolation');
    }

    // Extract kyc data without the profile_id property
    const { profile_id, ...kyc } = kycData;

    // CRITICAL FIX: Read existing local data first to preserve all completion flags
    let existingData = {};
    try {
      const existingRows = await db.getAllAsync(
        `SELECT * FROM ${UserRepository.KYC_TABLE} WHERE id = ? AND profile_id = ?`,
        [kyc.id, profileId]
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
      `INSERT OR REPLACE INTO ${UserRepository.KYC_TABLE} (id, data, profile_id) VALUES (?, ?, ?)`,
      [kyc.id, JSON.stringify(mergedData), profileId]
    );

    console.log('[UserRepository] KYC status saved:', { kycId: kyc.id });
    // Data saved - TanStack Query will fetch fresh data when needed
  }

  // Background sync: fetch from remote, update local, emit event (PROFILE-ISOLATED)
  async syncUserFromRemote(fetchRemote: () => Promise<any>, profileId: string): Promise<void> { // TODO: Replace any with UserProfile
    const remoteUser = await fetchRemote();
    await this.saveUser(remoteUser, profileId);
  }

  async syncKycFromRemote(fetchRemote: () => Promise<any>, profileId: string): Promise<void> { // TODO: Replace any with KycStatus
    const remoteKyc = await fetchRemote();
    await this.saveKycStatus({ ...remoteKyc, profile_id: profileId });
  }

  // Sync with remote data (PROFILE-ISOLATED)
  async syncWithRemote(remoteData: any, profileId: string): Promise<void> { // TODO: type
    // Save remote data to local SQLite
    if (remoteData?.id) {
      await this.saveUser(remoteData, profileId);
    }
    // Data saved - TanStack Query will fetch fresh data when needed
  }
}

// Export singleton instance
export const userRepository = UserRepository.getInstance(); 