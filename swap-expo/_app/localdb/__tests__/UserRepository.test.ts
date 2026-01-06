/**
 * UserRepository Tests
 *
 * Tests the user repository with profile isolation, KYC data merging,
 * and remote sync patterns.
 * NOTE: EventCoordinator removed - TanStack Query handles data reactivity
 */

// Reset modules before importing to ensure clean singleton state
jest.resetModules();

// Mock dependencies BEFORE importing the repository
jest.mock('expo-sqlite', () => ({
  SQLiteDatabase: jest.fn(),
}));

jest.mock('../DatabaseManager', () => ({
  databaseManager: {
    initialize: jest.fn(),
    getDatabase: jest.fn(),
  },
}));

// Import after mocking
import { UserRepository, userRepository } from '../UserRepository';
import { databaseManager } from '../DatabaseManager';

const mockDatabaseManager = databaseManager as jest.Mocked<typeof databaseManager>;

// Test data
const mockUser = {
  id: 'user-123',
  entityId: 'entity-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
};

const mockKycStatus = {
  id: 'kyc-123',
  status: 'pending',
  completedSteps: ['phone', 'email'],
  requiredSteps: ['phone', 'email', 'identity', 'address'],
};

describe('UserRepository', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock database
    mockDb = {
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
    };

    mockDatabaseManager.initialize.mockResolvedValue(true);
    mockDatabaseManager.getDatabase.mockReturnValue(mockDb);
  });

  // ============================================================
  // SINGLETON PATTERN TESTS
  // ============================================================

  describe('singleton pattern', () => {
    it('should return singleton instance', () => {
      const instance1 = UserRepository.getInstance();
      const instance2 = UserRepository.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should export userRepository as singleton', () => {
      expect(userRepository).toBeDefined();
      expect(userRepository).toBe(UserRepository.getInstance());
    });
  });

  // ============================================================
  // DATABASE INITIALIZATION TESTS
  // ============================================================

  describe('database initialization', () => {
    it('should initialize database before operations', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await userRepository.getUser('profile-123');

      expect(mockDatabaseManager.initialize).toHaveBeenCalled();
    });

    it('should throw error when database initialization fails', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(false);

      await expect(userRepository.getUser('profile-123')).rejects.toThrow('Database initialization failed');
    });

    it('should throw error when database instance is not available', async () => {
      mockDatabaseManager.initialize.mockResolvedValue(true);
      mockDatabaseManager.getDatabase.mockReturnValue(null);

      await expect(userRepository.getUser('profile-123')).rejects.toThrow('Database instance not available');
    });
  });

  // ============================================================
  // GET USER TESTS (ENTITY-ISOLATED)
  // ============================================================

  describe('getUser', () => {
    it('should get user by entityId', async () => {
      const userRow = { id: 'user-123', data: JSON.stringify(mockUser), entity_id: 'profile-123' };
      mockDb.getAllAsync.mockResolvedValue([userRow]);

      const result = await userRepository.getUser('profile-123');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE entity_id = ?'),
        ['profile-123'],
      );
      expect(result).toEqual(userRow);
    });

    it('should return null when user not found', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await userRepository.getUser('nonexistent-profile');

      expect(result).toBeNull();
    });

    it('should limit results to 1', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await userRepository.getUser('profile-123');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('LIMIT 1'), expect.any(Array));
    });
  });

  // ============================================================
  // SAVE USER TESTS (ENTITY-ISOLATED)
  // ============================================================

  describe('saveUser', () => {
    it('should save user with entityId', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.saveUser(mockUser, 'profile-123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO users'),
        [mockUser.id, JSON.stringify(mockUser), 'profile-123'],
      );
    });

    it('should use INSERT OR REPLACE for upsert behavior', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.saveUser(mockUser, 'profile-123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE'), expect.any(Array));
    });
  });

  // ============================================================
  // UPDATE USER TESTS
  // ============================================================

  describe('updateUser', () => {
    it('should call saveUser internally', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.updateUser(mockUser, 'profile-123');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO users'),
        [mockUser.id, JSON.stringify(mockUser), 'profile-123'],
      );
    });

  });

  // ============================================================
  // GET KYC STATUS TESTS (ENTITY-ISOLATED)
  // ============================================================

  describe('getKycStatus', () => {
    it('should get KYC status by entityId', async () => {
      const kycRow = { id: 'kyc-123', data: JSON.stringify(mockKycStatus), entity_id: 'profile-123' };
      mockDb.getAllAsync.mockResolvedValue([kycRow]);

      const result = await userRepository.getKycStatus('profile-123');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM kyc_status WHERE entity_id = ?'),
        ['profile-123'],
      );
      expect(result).toEqual(kycRow);
    });

    it('should return null when KYC status not found', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await userRepository.getKycStatus('nonexistent-profile');

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // SAVE KYC STATUS TESTS (ENTITY-ISOLATED WITH MERGING)
  // ============================================================

  describe('saveKycStatus', () => {
    it('should require entity_id in kycData', async () => {
      const kycWithoutEntity = { id: 'kyc-123', status: 'pending' };

      await expect(userRepository.saveKycStatus(kycWithoutEntity as any)).rejects.toThrow(
        'entity_id is required for data isolation',
      );
    });

    it('should save KYC status with entityId', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.saveKycStatus({ ...mockKycStatus, entity_id: 'profile-123' });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO kyc_status'),
        expect.arrayContaining(['kyc-123', expect.any(String), 'profile-123']),
      );
    });

    it('should merge with existing KYC data', async () => {
      const existingKyc = {
        id: 'kyc-123',
        status: 'pending',
        step1Complete: true,
        step2Complete: false,
      };
      const existingRow = { id: 'kyc-123', data: JSON.stringify(existingKyc), entity_id: 'profile-123' };
      mockDb.getAllAsync.mockResolvedValue([existingRow]);
      mockDb.runAsync.mockResolvedValue(undefined);

      const newKycData = {
        id: 'kyc-123',
        entity_id: 'profile-123',
        status: 'approved',
        step2Complete: true,
      };

      await userRepository.saveKycStatus(newKycData);

      // Should merge: existing step1Complete + new status + new step2Complete
      const savedData = JSON.parse(mockDb.runAsync.mock.calls[0][1][1]);
      expect(savedData.step1Complete).toBe(true); // Preserved from existing
      expect(savedData.step2Complete).toBe(true); // Updated
      expect(savedData.status).toBe('approved'); // Updated
    });

    it('should preserve existing completion flags when merging', async () => {
      const existingKyc = {
        id: 'kyc-123',
        phoneComplete: true,
        emailComplete: true,
        identityComplete: false,
      };
      mockDb.getAllAsync.mockResolvedValue([{ id: 'kyc-123', data: JSON.stringify(existingKyc), entity_id: 'profile-123' }]);
      mockDb.runAsync.mockResolvedValue(undefined);

      const newKycData = {
        id: 'kyc-123',
        entity_id: 'profile-123',
        identityComplete: true,
      };

      await userRepository.saveKycStatus(newKycData);

      const savedData = JSON.parse(mockDb.runAsync.mock.calls[0][1][1]);
      expect(savedData.phoneComplete).toBe(true); // Preserved
      expect(savedData.emailComplete).toBe(true); // Preserved
      expect(savedData.identityComplete).toBe(true); // Updated
    });

    it('should handle missing existing data gracefully', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.saveKycStatus({ ...mockKycStatus, entity_id: 'profile-123' });

      expect(mockDb.runAsync).toHaveBeenCalled();
    });

    it('should handle malformed existing data gracefully', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ id: 'kyc-123', data: 'invalid-json', entity_id: 'profile-123' }]);
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.saveKycStatus({ ...mockKycStatus, entity_id: 'profile-123' });

      // Should not throw, use new data only
      expect(mockDb.runAsync).toHaveBeenCalled();
    });

    it('should exclude entity_id from saved data object', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.saveKycStatus({ id: 'kyc-123', entity_id: 'profile-123', status: 'pending' });

      const savedData = JSON.parse(mockDb.runAsync.mock.calls[0][1][1]);
      expect(savedData.entity_id).toBeUndefined();
      expect(savedData.id).toBe('kyc-123');
      expect(savedData.status).toBe('pending');
    });
  });

  // ============================================================
  // SYNC FROM REMOTE TESTS
  // ============================================================

  describe('syncUserFromRemote', () => {
    it('should fetch remote user and save locally', async () => {
      const fetchRemote = jest.fn().mockResolvedValue(mockUser);
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.syncUserFromRemote(fetchRemote, 'profile-123');

      expect(fetchRemote).toHaveBeenCalled();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO users'),
        [mockUser.id, JSON.stringify(mockUser), 'profile-123'],
      );
    });


    it('should propagate errors from remote fetch', async () => {
      const fetchRemote = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(userRepository.syncUserFromRemote(fetchRemote, 'profile-123')).rejects.toThrow('Network error');
    });
  });

  describe('syncKycFromRemote', () => {
    it('should fetch remote KYC and save locally with entityId', async () => {
      const remoteKyc = { id: 'kyc-123', status: 'approved' };
      const fetchRemote = jest.fn().mockResolvedValue(remoteKyc);
      mockDb.getAllAsync.mockResolvedValue([]);
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.syncKycFromRemote(fetchRemote, 'profile-123');

      expect(fetchRemote).toHaveBeenCalled();
      expect(mockDb.runAsync).toHaveBeenCalled();
    });

    it('should add entity_id to remote KYC data', async () => {
      const remoteKyc = { id: 'kyc-456', status: 'pending' };
      const fetchRemote = jest.fn().mockResolvedValue(remoteKyc);
      mockDb.getAllAsync.mockResolvedValue([]);
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.syncKycFromRemote(fetchRemote, 'profile-XYZ');

      // Verify entityId was added and passed correctly
      expect(mockDb.runAsync.mock.calls[0][1][2]).toBe('profile-XYZ');
    });
  });

  // NOTE: syncWithRemote tests removed - EventCoordinator was removed

  // ============================================================
  // ENTITY ISOLATION TESTS
  // ============================================================

  describe('entity isolation', () => {
    it('should always query with entityId for user data', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await userRepository.getUser('profile-A');
      await userRepository.getUser('profile-B');

      expect(mockDb.getAllAsync).toHaveBeenNthCalledWith(1, expect.any(String), ['profile-A']);
      expect(mockDb.getAllAsync).toHaveBeenNthCalledWith(2, expect.any(String), ['profile-B']);
    });

    it('should always query with entityId for KYC data', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await userRepository.getKycStatus('profile-A');
      await userRepository.getKycStatus('profile-B');

      expect(mockDb.getAllAsync).toHaveBeenNthCalledWith(1, expect.any(String), ['profile-A']);
      expect(mockDb.getAllAsync).toHaveBeenNthCalledWith(2, expect.any(String), ['profile-B']);
    });

    it('should always save with entityId for user data', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.saveUser(mockUser, 'profile-A');

      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['profile-A']));
    });

    it('should always save with entityId for KYC data', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      mockDb.runAsync.mockResolvedValue(undefined);

      await userRepository.saveKycStatus({ ...mockKycStatus, entity_id: 'profile-A' });

      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['profile-A']));
    });

    // NOTE: Event emission tests removed - EventCoordinator was removed, TanStack Query handles reactivity
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe('error handling', () => {
    it('should handle database read errors', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Read error'));

      await expect(userRepository.getUser('profile-123')).rejects.toThrow('Read error');
    });

    it('should handle database write errors', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Write error'));

      await expect(userRepository.saveUser(mockUser, 'profile-123')).rejects.toThrow('Write error');
    });

    // NOTE: Event coordinator error test removed - EventCoordinator was removed
  });
});
