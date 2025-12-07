/**
 * PIN User Storage Tests
 *
 * Tests Instagram-style multi-profile PIN storage including:
 * - Per-profile data storage and retrieval
 * - Active profile management
 * - 5-profile limit enforcement
 * - Display name formatting
 * - Legacy fallback compatibility
 */

// Mock dependencies before importing
const mockSecureStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore[key] || null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockSecureStore[key];
    return Promise.resolve();
  }),
}));

jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import * as SecureStore from 'expo-secure-store';
import {
  ProfilePinData,
  storeProfilePinData,
  getProfilePinData,
  getAllProfilePinData,
  getLastActiveProfileId,
  setLastActiveProfile,
  clearProfilePinData,
  clearAllProfilePinData,
  hasAnyProfilePinData,
  getProfileDisplayName,
  // Legacy functions
  storeLastUserForPin,
  getLastUserForPin,
  clearLastUserForPin,
  hasPinUserStored,
} from '../pinUserStorage';

// Test data
const personalProfile: ProfilePinData = {
  identifier: 'user@example.com',
  username: 'johndoe',
  displayName: 'John Doe',
  profileType: 'personal',
  avatarUrl: 'https://example.com/avatar.jpg',
};

const businessProfile: ProfilePinData = {
  identifier: 'business@example.com',
  businessName: 'My Business LLC',
  displayName: 'My Business LLC',
  profileType: 'business',
  avatarUrl: 'https://example.com/business-logo.jpg',
};

const minimalProfile: ProfilePinData = {
  identifier: 'minimal@example.com',
  displayName: 'Minimal User',
  profileType: 'personal',
};

describe('pinUserStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear mock secure store
    Object.keys(mockSecureStore).forEach((key) => delete mockSecureStore[key]);
  });

  // ============================================================
  // storeProfilePinData TESTS
  // ============================================================

  describe('storeProfilePinData', () => {
    it('should store profile PIN data for a new profile', async () => {
      await storeProfilePinData('profile-001', personalProfile);

      expect(SecureStore.setItemAsync).toHaveBeenCalled();

      const allData = await getAllProfilePinData();
      expect(allData['profile-001']).toEqual(personalProfile);
    });

    it('should store multiple profiles', async () => {
      await storeProfilePinData('profile-001', personalProfile);
      await storeProfilePinData('profile-002', businessProfile);

      const allData = await getAllProfilePinData();
      expect(Object.keys(allData)).toHaveLength(2);
      expect(allData['profile-001']).toEqual(personalProfile);
      expect(allData['profile-002']).toEqual(businessProfile);
    });

    it('should update existing profile data', async () => {
      await storeProfilePinData('profile-001', personalProfile);

      const updatedProfile: ProfilePinData = {
        ...personalProfile,
        username: 'newusername',
        displayName: 'Updated Name',
      };
      await storeProfilePinData('profile-001', updatedProfile);

      const allData = await getAllProfilePinData();
      expect(Object.keys(allData)).toHaveLength(1);
      expect(allData['profile-001'].username).toBe('newusername');
      expect(allData['profile-001'].displayName).toBe('Updated Name');
    });

    it('should enforce max 5 profiles limit (Instagram-style)', async () => {
      // Add 5 profiles
      for (let i = 1; i <= 5; i++) {
        await storeProfilePinData(`profile-${i}`, {
          ...personalProfile,
          identifier: `user${i}@example.com`,
        });
      }

      // Add 6th profile - should remove oldest
      await storeProfilePinData('profile-6', {
        ...personalProfile,
        identifier: 'user6@example.com',
      });

      const allData = await getAllProfilePinData();
      expect(Object.keys(allData)).toHaveLength(5);
      // Oldest profile should be removed (profile-1)
      expect(allData['profile-1']).toBeUndefined();
      expect(allData['profile-6']).toBeDefined();
    });

    it('should handle SecureStore errors', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await expect(
        storeProfilePinData('profile-001', personalProfile)
      ).rejects.toThrow('Storage error');
    });
  });

  // ============================================================
  // getProfilePinData TESTS
  // ============================================================

  describe('getProfilePinData', () => {
    it('should return null when no data exists', async () => {
      const data = await getProfilePinData('non-existent');
      expect(data).toBeNull();
    });

    it('should return profile data by profileId', async () => {
      await storeProfilePinData('profile-001', personalProfile);

      const data = await getProfilePinData('profile-001');
      expect(data).toEqual(personalProfile);
    });

    it('should return last active profile when no profileId provided', async () => {
      await storeProfilePinData('profile-001', personalProfile);
      await storeProfilePinData('profile-002', businessProfile);
      await setLastActiveProfile('profile-002');

      const data = await getProfilePinData();
      expect(data).toEqual(businessProfile);
    });

    it('should return null when no active profile and no profileId', async () => {
      await storeProfilePinData('profile-001', personalProfile);
      // No active profile set

      const data = await getProfilePinData();
      expect(data).toBeNull();
    });

    it('should handle SecureStore errors gracefully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const data = await getProfilePinData('profile-001');
      expect(data).toBeNull();
    });
  });

  // ============================================================
  // getAllProfilePinData TESTS
  // ============================================================

  describe('getAllProfilePinData', () => {
    it('should return empty object when no data exists', async () => {
      const allData = await getAllProfilePinData();
      expect(allData).toEqual({});
    });

    it('should return all stored profiles', async () => {
      await storeProfilePinData('profile-001', personalProfile);
      await storeProfilePinData('profile-002', businessProfile);

      const allData = await getAllProfilePinData();
      expect(Object.keys(allData)).toHaveLength(2);
    });

    it('should handle corrupted JSON gracefully', async () => {
      mockSecureStore['PROFILE_PIN_DATA'] = 'invalid json';

      const allData = await getAllProfilePinData();
      expect(allData).toEqual({});
    });
  });

  // ============================================================
  // setLastActiveProfile / getLastActiveProfileId TESTS
  // ============================================================

  describe('setLastActiveProfile / getLastActiveProfileId', () => {
    it('should set and get last active profile', async () => {
      await setLastActiveProfile('profile-001');

      const activeId = await getLastActiveProfileId();
      expect(activeId).toBe('profile-001');
    });

    it('should clear last active profile when empty string', async () => {
      await setLastActiveProfile('profile-001');
      await setLastActiveProfile('');

      const activeId = await getLastActiveProfileId();
      expect(activeId).toBeNull();
    });

    it('should return null when no active profile set', async () => {
      const activeId = await getLastActiveProfileId();
      expect(activeId).toBeNull();
    });

    it('should handle SecureStore errors in setLastActiveProfile', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await expect(setLastActiveProfile('profile-001')).rejects.toThrow(
        'Storage error'
      );
    });

    it('should handle SecureStore errors in getLastActiveProfileId', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const activeId = await getLastActiveProfileId();
      expect(activeId).toBeNull();
    });
  });

  // ============================================================
  // clearProfilePinData TESTS
  // ============================================================

  describe('clearProfilePinData', () => {
    it('should clear specific profile data', async () => {
      await storeProfilePinData('profile-001', personalProfile);
      await storeProfilePinData('profile-002', businessProfile);

      await clearProfilePinData('profile-001');

      const allData = await getAllProfilePinData();
      expect(allData['profile-001']).toBeUndefined();
      expect(allData['profile-002']).toBeDefined();
    });

    it('should clear active profile if clearing active', async () => {
      await storeProfilePinData('profile-001', personalProfile);
      await setLastActiveProfile('profile-001');

      await clearProfilePinData('profile-001');

      const activeId = await getLastActiveProfileId();
      expect(activeId).toBeNull();
    });

    it('should not affect active profile when clearing different profile', async () => {
      await storeProfilePinData('profile-001', personalProfile);
      await storeProfilePinData('profile-002', businessProfile);
      await setLastActiveProfile('profile-002');

      await clearProfilePinData('profile-001');

      const activeId = await getLastActiveProfileId();
      expect(activeId).toBe('profile-002');
    });

    it('should handle clearing non-existent profile', async () => {
      await storeProfilePinData('profile-001', personalProfile);

      // Should not throw
      await clearProfilePinData('non-existent');

      const allData = await getAllProfilePinData();
      expect(allData['profile-001']).toBeDefined();
    });
  });

  // ============================================================
  // clearAllProfilePinData TESTS
  // ============================================================

  describe('clearAllProfilePinData', () => {
    it('should clear all profile data and active profile', async () => {
      await storeProfilePinData('profile-001', personalProfile);
      await storeProfilePinData('profile-002', businessProfile);
      await setLastActiveProfile('profile-001');

      await clearAllProfilePinData();

      const allData = await getAllProfilePinData();
      const activeId = await getLastActiveProfileId();

      expect(allData).toEqual({});
      expect(activeId).toBeNull();
    });

    it('should also clear legacy storage', async () => {
      await clearAllProfilePinData();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('PROFILE_PIN_DATA');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('LAST_ACTIVE_PROFILE');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('LAST_PIN_USER');
    });

    it('should handle SecureStore errors', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await expect(clearAllProfilePinData()).rejects.toThrow('Storage error');
    });
  });

  // ============================================================
  // hasAnyProfilePinData TESTS
  // ============================================================

  describe('hasAnyProfilePinData', () => {
    it('should return false when no data exists', async () => {
      const hasData = await hasAnyProfilePinData();
      expect(hasData).toBe(false);
    });

    it('should return true when profile data exists', async () => {
      await storeProfilePinData('profile-001', personalProfile);

      const hasData = await hasAnyProfilePinData();
      expect(hasData).toBe(true);
    });

    it('should return false after clearing all data', async () => {
      await storeProfilePinData('profile-001', personalProfile);
      await clearAllProfilePinData();

      const hasData = await hasAnyProfilePinData();
      expect(hasData).toBe(false);
    });

    it('should handle SecureStore errors gracefully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const hasData = await hasAnyProfilePinData();
      expect(hasData).toBe(false);
    });
  });

  // ============================================================
  // getProfileDisplayName TESTS
  // ============================================================

  describe('getProfileDisplayName', () => {
    it('should return @username for personal profile with username', () => {
      const displayName = getProfileDisplayName(personalProfile);
      expect(displayName).toBe('@johndoe');
    });

    it('should return businessName for business profile', () => {
      const displayName = getProfileDisplayName(businessProfile);
      expect(displayName).toBe('My Business LLC');
    });

    it('should return displayName as fallback for personal without username', () => {
      const displayName = getProfileDisplayName(minimalProfile);
      expect(displayName).toBe('Minimal User');
    });

    it('should return displayName as fallback for business without businessName', () => {
      const bizWithoutName: ProfilePinData = {
        identifier: 'biz@example.com',
        displayName: 'Fallback Business',
        profileType: 'business',
      };
      const displayName = getProfileDisplayName(bizWithoutName);
      expect(displayName).toBe('Fallback Business');
    });
  });

  // ============================================================
  // LEGACY COMPATIBILITY TESTS
  // ============================================================

  describe('Legacy compatibility', () => {
    describe('storeLastUserForPin', () => {
      it('should store identifier in legacy key', async () => {
        await storeLastUserForPin('legacy@example.com');

        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          'LAST_PIN_USER',
          'legacy@example.com'
        );
      });
    });

    describe('getLastUserForPin', () => {
      it('should return identifier from new storage first', async () => {
        await storeProfilePinData('profile-001', personalProfile);
        await setLastActiveProfile('profile-001');

        const identifier = await getLastUserForPin();
        expect(identifier).toBe('user@example.com');
      });

      it('should fallback to legacy storage', async () => {
        mockSecureStore['LAST_PIN_USER'] = 'legacy@example.com';

        const identifier = await getLastUserForPin();
        expect(identifier).toBe('legacy@example.com');
      });

      it('should return null when no data in either storage', async () => {
        const identifier = await getLastUserForPin();
        expect(identifier).toBeNull();
      });
    });

    describe('clearLastUserForPin', () => {
      it('should clear legacy storage and active profile', async () => {
        await setLastActiveProfile('profile-001');
        mockSecureStore['LAST_PIN_USER'] = 'legacy@example.com';

        await clearLastUserForPin();

        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('LAST_PIN_USER');
        const activeId = await getLastActiveProfileId();
        expect(activeId).toBeNull();
      });
    });

    describe('hasPinUserStored', () => {
      it('should return true when new storage has active profile', async () => {
        await storeProfilePinData('profile-001', personalProfile);
        await setLastActiveProfile('profile-001');

        const hasUser = await hasPinUserStored();
        expect(hasUser).toBe(true);
      });

      it('should return true when legacy storage has data', async () => {
        mockSecureStore['LAST_PIN_USER'] = 'legacy@example.com';

        const hasUser = await hasPinUserStored();
        expect(hasUser).toBe(true);
      });

      it('should return false when no active profile even with stored data', async () => {
        await storeProfilePinData('profile-001', personalProfile);
        // No active profile set

        const hasUser = await hasPinUserStored();
        expect(hasUser).toBe(false);
      });

      it('should return false when legacy storage is empty string', async () => {
        mockSecureStore['LAST_PIN_USER'] = '   ';

        const hasUser = await hasPinUserStored();
        expect(hasUser).toBe(false);
      });
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('edge cases', () => {
    it('should handle profile without optional fields', async () => {
      await storeProfilePinData('profile-001', minimalProfile);

      const data = await getProfilePinData('profile-001');
      expect(data?.identifier).toBe('minimal@example.com');
      expect(data?.username).toBeUndefined();
      expect(data?.businessName).toBeUndefined();
      expect(data?.avatarUrl).toBeUndefined();
    });

    it('should handle rapid sequential operations', async () => {
      // Rapid stores
      await Promise.all([
        storeProfilePinData('profile-1', { ...personalProfile, identifier: 'user1@example.com' }),
        storeProfilePinData('profile-2', { ...personalProfile, identifier: 'user2@example.com' }),
        storeProfilePinData('profile-3', { ...personalProfile, identifier: 'user3@example.com' }),
      ]);

      // Should not throw errors
      const allData = await getAllProfilePinData();
      expect(Object.keys(allData).length).toBeGreaterThan(0);
    });

    it('should handle switching active profile', async () => {
      await storeProfilePinData('profile-001', personalProfile);
      await storeProfilePinData('profile-002', businessProfile);

      await setLastActiveProfile('profile-001');
      let data = await getProfilePinData();
      expect(data?.profileType).toBe('personal');

      await setLastActiveProfile('profile-002');
      data = await getProfilePinData();
      expect(data?.profileType).toBe('business');
    });

    it('should handle empty profile map', async () => {
      mockSecureStore['PROFILE_PIN_DATA'] = '{}';

      const allData = await getAllProfilePinData();
      expect(allData).toEqual({});

      const hasData = await hasAnyProfilePinData();
      expect(hasData).toBe(false);
    });
  });

  // ============================================================
  // STORAGE KEY TESTS
  // ============================================================

  describe('storage keys', () => {
    it('should use correct key for profile data', async () => {
      await storeProfilePinData('profile-001', personalProfile);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'PROFILE_PIN_DATA',
        expect.any(String)
      );
    });

    it('should use correct key for active profile', async () => {
      await setLastActiveProfile('profile-001');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'LAST_ACTIVE_PROFILE',
        'profile-001'
      );
    });

    it('should use correct key for legacy storage', async () => {
      await storeLastUserForPin('legacy@example.com');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'LAST_PIN_USER',
        'legacy@example.com'
      );
    });
  });
});
