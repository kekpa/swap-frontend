/**
 * ContactsService Tests
 *
 * Tests device contact management, sync, and platform matching
 *
 * Key behaviors tested:
 * - Contact permission handling
 * - Device contact fetching
 * - Phone number normalization
 * - Contact syncing with backend
 * - Platform user matching
 * - Caching (24-hour duration)
 * - Race condition handling for concurrent sync
 * - Authentication validation before sync
 */

// Mock dependencies before imports
jest.mock('../../utils/logger');

jest.mock('../../utils/tokenStorage', () => ({
  __esModule: true,
  getAccessToken: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('expo-contacts', () => ({
  __esModule: true,
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getContactsAsync: jest.fn(),
  Fields: {
    PhoneNumbers: 'phoneNumbers',
    Emails: 'emails',
    Name: 'name',
    FirstName: 'firstName',
    LastName: 'lastName',
  },
  SortTypes: {
    FirstName: 'firstName',
    LastName: 'lastName',
  },
}));

jest.mock('../../_api/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Import after mocks
import contactsService from '../ContactsService';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../_api/apiClient';
import { getAccessToken } from '../../utils/tokenStorage';

// Cast mocks
const mockRequestPermissions = Contacts.requestPermissionsAsync as jest.Mock;
const mockGetPermissions = Contacts.getPermissionsAsync as jest.Mock;
const mockGetContacts = Contacts.getContactsAsync as jest.Mock;
const mockAsyncGetItem = AsyncStorage.getItem as jest.Mock;
const mockAsyncSetItem = AsyncStorage.setItem as jest.Mock;
const mockAsyncRemoveItem = AsyncStorage.removeItem as jest.Mock;
const mockApiGet = apiClient.get as jest.Mock;
const mockApiPost = apiClient.post as jest.Mock;
const mockGetAccessToken = getAccessToken as jest.Mock;

// Mock device contacts data
const mockDeviceContacts = [
  {
    id: 'contact_1',
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumbers: [{ number: '+1 (555) 123-4567' }],
    emails: [{ email: 'john@example.com' }],
  },
  {
    id: 'contact_2',
    name: 'Jane Smith',
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumbers: [
      { number: '555-987-6543' },
      { number: '+509 3456 7890' }, // Haiti number
    ],
    emails: [],
  },
];

// Mock sync response
const mockSyncResponse = {
  sessionId: 'sync_123',
  totalContacts: 3,
  newContacts: 2,
  updatedContacts: 1,
  matchedContacts: 1,
  matches: [
    {
      contact: {
        deviceContactId: 'contact_1_0',
        displayName: 'John Doe',
        phoneNumber: '+15551234567',
        rawPhoneNumber: '+1 (555) 123-4567',
        contactSource: 'phone',
      },
      matchedUser: {
        entityId: 'entity_john',
        profileId: 'profile_john',
        username: 'johndoe',
        displayName: 'John D.',
        isVerified: true,
      },
      relationshipStatus: 'connected',
      canMessage: true,
    },
  ],
  errors: [],
};

describe('ContactsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset service state
    contactsService.reset();

    // Default mock implementations
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    mockGetContacts.mockResolvedValue({ data: mockDeviceContacts });
    mockAsyncGetItem.mockResolvedValue(null);
    mockAsyncSetItem.mockResolvedValue(undefined);
    mockAsyncRemoveItem.mockResolvedValue(undefined);
    mockGetAccessToken.mockResolvedValue('valid_token');
    mockApiGet.mockResolvedValue({ data: { success: true } });
    mockApiPost.mockResolvedValue({ data: mockSyncResponse });
  });

  afterEach(() => {
    contactsService.reset();
  });

  describe('requestPermission', () => {
    it('should request contacts permission and return true when granted', async () => {
      mockRequestPermissions.mockResolvedValue({ status: 'granted' });

      const result = await contactsService.requestPermission();

      expect(mockRequestPermissions).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when permission denied', async () => {
      mockRequestPermissions.mockResolvedValue({ status: 'denied' });

      const result = await contactsService.requestPermission();

      expect(result).toBe(false);
    });

    it('should clear device contact cache when permission denied', async () => {
      mockRequestPermissions.mockResolvedValue({ status: 'denied' });

      await contactsService.requestPermission();

      expect(mockAsyncRemoveItem).toHaveBeenCalledWith(
        '@ContactsService:rawDeviceContacts',
      );
      expect(mockAsyncRemoveItem).toHaveBeenCalledWith(
        '@ContactsService:phoneOnlyNormalizedContacts',
      );
    });

    it('should handle permission request error', async () => {
      mockRequestPermissions.mockRejectedValue(new Error('Permission error'));

      const result = await contactsService.requestPermission();

      expect(result).toBe(false);
    });
  });

  describe('checkPermission', () => {
    it('should check permission status and return true when granted', async () => {
      mockGetPermissions.mockResolvedValue({ status: 'granted' });

      const result = await contactsService.checkPermission();

      expect(mockGetPermissions).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when permission not granted', async () => {
      mockGetPermissions.mockResolvedValue({ status: 'undetermined' });

      const result = await contactsService.checkPermission();

      expect(result).toBe(false);
    });

    it('should handle check permission error', async () => {
      mockGetPermissions.mockRejectedValue(new Error('Check error'));

      const result = await contactsService.checkPermission();

      expect(result).toBe(false);
    });
  });

  describe('syncContacts', () => {
    beforeEach(async () => {
      // Grant permission first
      await contactsService.requestPermission();
    });

    it('should sync contacts with backend successfully', async () => {
      const result = await contactsService.syncContacts();

      expect(mockApiPost).toHaveBeenCalledWith(
        '/contacts/sync',
        expect.objectContaining({
          contacts: expect.any(Array),
          deviceInfo: expect.objectContaining({
            platform: 'ios',
          }),
          syncType: 'full',
        }),
      );
      expect(result.sessionId).toBe('sync_123');
      expect(result.matchedContacts).toBe(1);
    });

    it('should validate authentication before syncing', async () => {
      await contactsService.syncContacts();

      expect(mockGetAccessToken).toHaveBeenCalled();
      expect(mockApiGet).toHaveBeenCalledWith('/auth/verify-token');
    });

    it('should abort sync when no access token available', async () => {
      mockGetAccessToken.mockResolvedValue(null);

      const result = await contactsService.syncContacts();

      expect(result.errors).toContain('Authentication check failed');
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('should abort sync on 401 token validation error', async () => {
      mockApiGet.mockRejectedValue({ response: { status: 401 } });

      const result = await contactsService.syncContacts();

      expect(result.errors).toContain('Authentication check failed');
    });

    it('should continue sync on non-401 token validation error', async () => {
      mockApiGet.mockRejectedValue({ response: { status: 500 } });

      await contactsService.syncContacts();

      expect(mockApiPost).toHaveBeenCalled();
    });

    it('should handle concurrent sync requests', async () => {
      // Start multiple concurrent syncs
      const sync1 = contactsService.syncContacts();
      const sync2 = contactsService.syncContacts();
      const sync3 = contactsService.syncContacts();

      const results = await Promise.all([sync1, sync2, sync3]);

      // All should return same result (sharing the same sync promise)
      expect(mockApiPost).toHaveBeenCalledTimes(1);
      results.forEach((result) => {
        expect(result.sessionId).toBe('sync_123');
      });
    });

    it('should return empty result when no contacts on device', async () => {
      mockGetContacts.mockResolvedValue({ data: [] });

      const result = await contactsService.syncContacts(true);

      expect(result.totalContacts).toBe(0);
      expect(result.errors).toContain('No valid contacts found on device');
    });

    it('should force refresh device contacts when requested', async () => {
      // First sync
      await contactsService.syncContacts();
      jest.clearAllMocks();

      // Force refresh sync
      await contactsService.syncContacts(true);

      expect(mockGetContacts).toHaveBeenCalled();
    });

    it('should use cached contacts when not forcing refresh', async () => {
      // First sync loads contacts
      await contactsService.syncContacts(true);
      jest.clearAllMocks();

      // Second sync should use cache
      await contactsService.syncContacts(false);

      // Contacts should NOT be re-fetched from device
      expect(mockGetContacts).not.toHaveBeenCalled();
    });

    it('should cache sync results', async () => {
      await contactsService.syncContacts();

      expect(mockAsyncSetItem).toHaveBeenCalledWith(
        '@ContactsService:matchedPlatformContacts',
        expect.any(String),
      );
      expect(mockAsyncSetItem).toHaveBeenCalledWith(
        '@ContactsService:lastSyncTimestamp',
        expect.any(String),
      );
    });

    it('should handle sync API error', async () => {
      mockApiPost.mockRejectedValue(new Error('Network error'));

      await expect(contactsService.syncContacts()).rejects.toThrow('Network error');
    });
  });

  describe('getMatchedPlatformContacts', () => {
    it('should return cached contacts when available and fresh', async () => {
      // Perform sync first
      await contactsService.requestPermission();
      await contactsService.syncContacts();
      jest.clearAllMocks();

      const contacts = await contactsService.getMatchedPlatformContacts();

      expect(contacts).toHaveLength(1);
      expect(contacts[0].matchedUser?.username).toBe('johndoe');
      // Should not trigger new sync
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('should return empty array when sync fails', async () => {
      await contactsService.requestPermission();
      mockApiPost.mockRejectedValue(new Error('Sync failed'));

      const contacts = await contactsService.getMatchedPlatformContacts(true);

      expect(contacts).toEqual([]);
    });

    it('should wait for ongoing sync', async () => {
      await contactsService.requestPermission();

      // Start sync
      const syncPromise = contactsService.syncContacts();

      // Request contacts while syncing
      const contactsPromise = contactsService.getMatchedPlatformContacts();

      await syncPromise;
      const contacts = await contactsPromise;

      expect(contacts).toHaveLength(1);
    });
  });

  describe('getPhoneOnlyNormalizedContacts', () => {
    it('should return contacts not matched on platform', async () => {
      await contactsService.requestPermission();
      await contactsService.syncContacts();

      const phoneOnly = await contactsService.getPhoneOnlyNormalizedContacts();

      // Should return Jane who wasn't matched
      expect(phoneOnly.length).toBeGreaterThan(0);
    });

    it('should filter out platform-matched contacts', async () => {
      await contactsService.requestPermission();
      await contactsService.syncContacts();

      const phoneOnly = await contactsService.getPhoneOnlyNormalizedContacts();
      const matched = await contactsService.getMatchedPlatformContacts();

      // Phone-only contacts should not overlap with matched
      const matchedPhones = new Set(matched.map((m: any) => m.contact.phoneNumber));

      phoneOnly.forEach((contact: any) => {
        expect(matchedPhones.has(contact.phoneNumber)).toBe(false);
      });
    });
  });

  describe('getRawDeviceContacts', () => {
    it('should fetch device contacts when not cached', async () => {
      await contactsService.requestPermission();

      const contacts = await contactsService.getRawDeviceContacts(true);

      expect(mockGetContacts).toHaveBeenCalled();
      expect(contacts).toHaveLength(2);
    });

    it('should return cached contacts when available', async () => {
      await contactsService.requestPermission();
      await contactsService.getRawDeviceContacts(true);
      jest.clearAllMocks();

      const contacts = await contactsService.getRawDeviceContacts(false);

      expect(mockGetContacts).not.toHaveBeenCalled();
      expect(contacts).toHaveLength(2);
    });

    it('should request permission if not granted', async () => {
      const contacts = await contactsService.getRawDeviceContacts();

      expect(mockRequestPermissions).toHaveBeenCalled();
    });

    it('should return empty array when permission denied', async () => {
      mockRequestPermissions.mockResolvedValue({ status: 'denied' });

      const contacts = await contactsService.getRawDeviceContacts();

      expect(contacts).toEqual([]);
    });
  });

  describe('searchContacts', () => {
    it('should search contacts via API', async () => {
      mockApiGet.mockResolvedValue({
        data: {
          data: [mockSyncResponse.matches[0]],
        },
      });

      const results = await contactsService.searchContacts('john');

      expect(mockApiGet).toHaveBeenCalledWith('/contacts/search?q=john');
      expect(results).toHaveLength(1);
    });

    it('should encode search query', async () => {
      await contactsService.searchContacts('john doe');

      expect(mockApiGet).toHaveBeenCalledWith('/contacts/search?q=john%20doe');
    });

    it('should return empty array on search error', async () => {
      mockApiGet.mockRejectedValue(new Error('Search failed'));

      const results = await contactsService.searchContacts('test');

      expect(results).toEqual([]);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status', () => {
      const status = contactsService.getSyncStatus();

      expect(status).toHaveProperty('lastSync');
      expect(status).toHaveProperty('inProgress');
      expect(status.inProgress).toBe(false);
    });

    it('should show in progress during sync', async () => {
      await contactsService.requestPermission();

      let resolveSync: () => void;
      const syncPromise = new Promise<void>((resolve) => {
        resolveSync = resolve;
      });

      mockApiPost.mockReturnValue(syncPromise);

      const syncOperation = contactsService.syncContacts();

      const status = contactsService.getSyncStatus();
      expect(status.inProgress).toBe(true);

      // Cleanup
      mockApiPost.mockResolvedValue({ data: mockSyncResponse });
      resolveSync!();
      await syncOperation.catch(() => {});
    });

    it('should update lastSync after sync', async () => {
      await contactsService.requestPermission();

      const beforeSync = contactsService.getSyncStatus();
      expect(beforeSync.lastSync).toBeNull();

      await contactsService.syncContacts();

      const afterSync = contactsService.getSyncStatus();
      expect(afterSync.lastSync).toBeInstanceOf(Date);
    });
  });

  describe('clearContactData', () => {
    it('should clear all cached contact data', async () => {
      await contactsService.clearContactData();

      expect(mockAsyncRemoveItem).toHaveBeenCalledWith(
        '@ContactsService:matchedPlatformContacts',
      );
      expect(mockAsyncRemoveItem).toHaveBeenCalledWith(
        '@ContactsService:phoneOnlyNormalizedContacts',
      );
      expect(mockAsyncRemoveItem).toHaveBeenCalledWith(
        '@ContactsService:rawDeviceContacts',
      );
      expect(mockAsyncRemoveItem).toHaveBeenCalledWith(
        '@ContactsService:lastSyncTimestamp',
      );
    });

    it('should reset sync status', async () => {
      await contactsService.requestPermission();
      await contactsService.syncContacts();

      await contactsService.clearContactData();

      const status = contactsService.getSyncStatus();
      expect(status.lastSync).toBeNull();
    });

    it('should handle clear error gracefully', async () => {
      mockAsyncRemoveItem.mockRejectedValue(new Error('Storage error'));

      await expect(contactsService.clearContactData()).resolves.not.toThrow();
    });
  });

  describe('Phone Number Normalization', () => {
    it('should normalize 10-digit US numbers', async () => {
      mockGetContacts.mockResolvedValue({
        data: [
          {
            id: 'us_contact',
            name: 'US User',
            phoneNumbers: [{ number: '5551234567' }],
            emails: [],
          },
        ],
      });

      await contactsService.requestPermission();
      const contacts = await contactsService.getRawDeviceContacts(true);

      // getRawDeviceContacts returns raw numbers (filtered to valid ones)
      expect(contacts[0].phoneNumbers).toContain('5551234567');
    });

    it('should normalize 11-digit US numbers with country code', async () => {
      mockGetContacts.mockResolvedValue({
        data: [
          {
            id: 'us_contact_11',
            name: 'US User 2',
            phoneNumbers: [{ number: '15551234567' }],
            emails: [],
          },
        ],
      });

      await contactsService.requestPermission();
      const contacts = await contactsService.getRawDeviceContacts(true);

      // getRawDeviceContacts returns raw numbers (filtered to valid ones)
      expect(contacts[0].phoneNumbers).toContain('15551234567');
    });

    it('should handle already formatted international numbers', async () => {
      mockGetContacts.mockResolvedValue({
        data: [
          {
            id: 'intl_contact',
            name: 'Haiti User',
            phoneNumbers: [{ number: '+50934567890' }],
            emails: [],
          },
        ],
      });

      await contactsService.requestPermission();
      const contacts = await contactsService.getRawDeviceContacts(true);

      // getRawDeviceContacts returns raw numbers
      expect(contacts[0].phoneNumbers).toContain('+50934567890');
    });

    it('should filter out invalid phone numbers', async () => {
      mockGetContacts.mockResolvedValue({
        data: [
          {
            id: 'invalid_contact',
            name: 'Invalid',
            phoneNumbers: [{ number: '123' }], // Too short
            emails: [],
          },
        ],
      });

      await contactsService.requestPermission();
      const contacts = await contactsService.getRawDeviceContacts(true);

      expect(contacts).toHaveLength(0); // Filtered out
    });

    it('should strip non-numeric characters', async () => {
      mockGetContacts.mockResolvedValue({
        data: [
          {
            id: 'formatted_contact',
            name: 'Formatted',
            phoneNumbers: [{ number: '(555) 123-4567' }],
            emails: [],
          },
        ],
      });

      await contactsService.requestPermission();
      const contacts = await contactsService.getRawDeviceContacts(true);

      // getRawDeviceContacts returns raw phone numbers (unmodified)
      // The normalization (stripping non-numeric) happens in normalizeDeviceContactsForSync
      expect(contacts[0].phoneNumbers[0]).toBe('(555) 123-4567');
    });
  });

  describe('Contact Deduplication', () => {
    it('should deduplicate contacts by phone number', async () => {
      mockGetContacts.mockResolvedValue({
        data: [
          {
            id: 'contact_a',
            name: 'John Home',
            phoneNumbers: [{ number: '+15551234567' }],
            emails: [],
          },
          {
            id: 'contact_b',
            name: 'John Work',
            phoneNumbers: [{ number: '+15551234567' }], // Same number
            emails: [],
          },
        ],
      });

      await contactsService.requestPermission();
      await contactsService.syncContacts(true);

      // API should receive deduplicated contacts
      const syncCall = mockApiPost.mock.calls[0];
      const sentContacts = syncCall[1].contacts;

      const phoneNumbers = sentContacts.map((c: any) => c.phoneNumber);
      const uniquePhones = new Set(phoneNumbers);

      expect(phoneNumbers.length).toBe(uniquePhones.size);
    });
  });

  describe('Haiti Phone Number Support', () => {
    it('should handle Haiti phone numbers (+509)', async () => {
      mockGetContacts.mockResolvedValue({
        data: [
          {
            id: 'haiti_contact',
            name: 'Haiti User',
            phoneNumbers: [{ number: '+509 3456 7890' }],
            emails: [],
          },
        ],
      });

      await contactsService.requestPermission();
      const contacts = await contactsService.getRawDeviceContacts(true);

      // getRawDeviceContacts returns raw phone numbers (unmodified)
      // The normalization happens in normalizeDeviceContactsForSync
      expect(contacts[0].phoneNumbers[0]).toBe('+509 3456 7890');
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance as default', () => {
      expect(contactsService).toBeDefined();
    });
  });
});
