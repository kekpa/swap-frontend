// Updated: Refactored caching and fetching for distinct platform-matched and phone-only contacts - 2025-05-29
// Updated: Fixed race condition in contact sync - multiple callers now wait for same sync operation - 2025-05-29
// Updated: Added authentication validation to prevent 401 cascade failures - 2025-01-03
// Updated: Added ProfileContextManager integration for profile switch safety - 2025-01-10
import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';
import apiClient from '../_api/apiClient';
import { getAccessToken } from './token';
import { profileContextManager, ProfileSwitchStartData, ProfileSwitchCompleteData } from './ProfileContextManager';
// import { API_PATHS } from '../_api/apiPaths'; // Original import

// Placeholder for API paths until they are formally added to apiPaths.ts
const CONTACTS_API_PATHS = {
  SYNC: '/contacts/sync',       // Assumed endpoint for syncing contacts
  SEARCH: '/contacts/search'    // Assumed endpoint for searching contacts
};

export interface DeviceContact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers: string[];
  emails: string[];
  rawPhoneNumbers: string[];
}

export interface NormalizedContact {
  deviceContactId: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string; 
  rawPhoneNumber: string; 
  email?: string;
  contactSource: 'phone' | 'manual' | 'imported';
}

export interface ContactMatch {
  contact: NormalizedContact;
  matchedUser?: {
    entityId: string;
    profileId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
  relationshipStatus: 'none' | 'pending' | 'connected' | 'blocked';
  canMessage: boolean;
}

export interface ContactSyncResult {
  sessionId: string;
  totalContacts: number;
  newContacts: number;
  updatedContacts: number;
  matchedContacts: number;
  matches: ContactMatch[]; // Assumed to be only platform-matched contacts from backend
  errors: string[];
}

const CACHED_MATCHED_PLATFORM_CONTACTS = '@ContactsService:matchedPlatformContacts';
const CACHED_PHONE_ONLY_NORMALIZED_CONTACTS = '@ContactsService:phoneOnlyNormalizedContacts';
const CACHED_RAW_DEVICE_CONTACTS = '@ContactsService:rawDeviceContacts'; // For raw device contacts
const CONTACTS_LAST_SYNC_TIMESTAMP = '@ContactsService:lastSyncTimestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

class ContactsService {
  private hasPermission: boolean = false;
  private lastSyncTimestamp: Date | null = null;
  private syncInProgress: boolean = false;
  private activeSyncPromise: Promise<ContactSyncResult> | null = null;

  private cachedMatchedPlatformContacts: ContactMatch[] | null = null;
  private cachedPhoneOnlyNormalizedContacts: NormalizedContact[] | null = null;
  private cachedRawDeviceContacts: DeviceContact[] | null = null;

  // Profile switch safety - cancel sync during switch
  private isPausedForProfileSwitch = false;
  private unsubscribeSwitchStart: (() => void) | null = null;
  private unsubscribeSwitchComplete: (() => void) | null = null;

  constructor() {
    this.loadContactsFromCache();
    this.subscribeToProfileSwitch();
  }

  /**
   * Subscribe to profile switch events to cancel in-progress sync
   *
   * CRITICAL: Contact sync uses the user's token which is profile-specific.
   * If a sync is in progress during profile switch, it will fail with wrong token.
   */
  private subscribeToProfileSwitch(): void {
    // On profile switch START: Pause sync operations
    this.unsubscribeSwitchStart = profileContextManager.onSwitchStart((data: ProfileSwitchStartData) => {
      logger.info('[ContactsService] 🔄 Profile switch starting - pausing sync operations');
      this.isPausedForProfileSwitch = true;

      // Cancel any in-progress sync by clearing the promise
      // (The actual sync will see isPausedForProfileSwitch and return early)
      this.syncInProgress = false;
      this.activeSyncPromise = null;

      logger.debug('[ContactsService] ✅ Sync paused for profile switch');
    });

    // On profile switch COMPLETE: Resume sync capability
    this.unsubscribeSwitchComplete = profileContextManager.onSwitchComplete((data: ProfileSwitchCompleteData) => {
      logger.info(`[ContactsService] ✅ Profile switch complete - resuming sync capability (${data.profileType})`);
      this.isPausedForProfileSwitch = false;
    });

    // On profile switch FAILED: Resume with old context
    profileContextManager.onSwitchFailed(() => {
      logger.warn('[ContactsService] ⚠️ Profile switch failed - resuming with old context');
      this.isPausedForProfileSwitch = false;
    });
  }

  private async loadContactsFromCache(): Promise<void> {
    try {
      logger.debug('[ContactsService] Attempting to load contacts from cache...');
      const [
        matchedPlatformJson, 
        phoneOnlyNormalizedJson, 
        rawDeviceJson, 
        timestampJson
      ] = await Promise.all([
        AsyncStorage.getItem(CACHED_MATCHED_PLATFORM_CONTACTS),
        AsyncStorage.getItem(CACHED_PHONE_ONLY_NORMALIZED_CONTACTS),
        AsyncStorage.getItem(CACHED_RAW_DEVICE_CONTACTS),
        AsyncStorage.getItem(CONTACTS_LAST_SYNC_TIMESTAMP),
      ]);

      if (matchedPlatformJson) {
        this.cachedMatchedPlatformContacts = JSON.parse(matchedPlatformJson);
        logger.debug(`[ContactsService] Loaded ${this.cachedMatchedPlatformContacts?.length || 0} matched platform contacts from cache.`);
      }
      if (phoneOnlyNormalizedJson) {
        this.cachedPhoneOnlyNormalizedContacts = JSON.parse(phoneOnlyNormalizedJson);
        logger.debug(`[ContactsService] Loaded ${this.cachedPhoneOnlyNormalizedContacts?.length || 0} phone-only normalized contacts from cache.`);
      }
      if (rawDeviceJson) {
        this.cachedRawDeviceContacts = JSON.parse(rawDeviceJson);
        logger.debug(`[ContactsService] Loaded ${this.cachedRawDeviceContacts?.length || 0} raw device contacts from cache.`);
      }
      if (timestampJson) {
        this.lastSyncTimestamp = new Date(JSON.parse(timestampJson));
        logger.debug(`[ContactsService] Loaded last sync timestamp: ${this.lastSyncTimestamp?.toISOString()}`);
      }
    } catch (error) {
      logger.error('[ContactsService] Error loading contacts from cache:', error);
      this.cachedMatchedPlatformContacts = null;
      this.cachedPhoneOnlyNormalizedContacts = null;
      this.cachedRawDeviceContacts = null;
      this.lastSyncTimestamp = null;
    }
  }

  private async saveContactsToCache(): Promise<void> {
    try {
      logger.debug('[ContactsService] Saving contacts to cache...');
      const tasks = [];
      if (this.cachedMatchedPlatformContacts) {
        tasks.push(AsyncStorage.setItem(CACHED_MATCHED_PLATFORM_CONTACTS, JSON.stringify(this.cachedMatchedPlatformContacts)));
      }
      if (this.cachedPhoneOnlyNormalizedContacts) {
        tasks.push(AsyncStorage.setItem(CACHED_PHONE_ONLY_NORMALIZED_CONTACTS, JSON.stringify(this.cachedPhoneOnlyNormalizedContacts)));
      }
      if (this.cachedRawDeviceContacts) {
        tasks.push(AsyncStorage.setItem(CACHED_RAW_DEVICE_CONTACTS, JSON.stringify(this.cachedRawDeviceContacts)));
      }
      if (this.lastSyncTimestamp) {
        tasks.push(AsyncStorage.setItem(CONTACTS_LAST_SYNC_TIMESTAMP, JSON.stringify(this.lastSyncTimestamp.toISOString())));
      }
      await Promise.all(tasks);
      logger.debug('[ContactsService] Successfully saved contacts to cache.');
    } catch (error) {
      logger.error('[ContactsService] Error saving contacts to cache:', error);
    }
  }
  
  async requestPermission(): Promise<boolean> {
    try {
      logger.debug('[ContactsService] Requesting contacts permission...');
      const { status } = await Contacts.requestPermissionsAsync();
      this.hasPermission = status === 'granted';
      if (!this.hasPermission) { // If permission denied, clear any potentially stale device contact cache
        this.cachedRawDeviceContacts = null;
        this.cachedPhoneOnlyNormalizedContacts = null; // This depends on device contacts
        await AsyncStorage.removeItem(CACHED_RAW_DEVICE_CONTACTS);
        await AsyncStorage.removeItem(CACHED_PHONE_ONLY_NORMALIZED_CONTACTS);
      }
      logger.info(`[ContactsService] Contacts permission: ${status}`);
      return this.hasPermission;
    } catch (error) {
      logger.error('[ContactsService] Error requesting contacts permission:', error);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      logger.error('[ContactsService] Error checking contacts permission:', error);
      return false;
    }
  }

  // Renamed from getDeviceContacts to avoid confusion, this is the raw fetch.
  private async fetchRawDeviceContacts(): Promise<DeviceContact[]> {
    if (!this.hasPermission) {
      const permGranted = await this.requestPermission();
      if (!permGranted) {
          logger.warn('[ContactsService] Permission denied, cannot fetch device contacts.');
          return [];
      }
    }

    try {
      logger.debug('[ContactsService] Fetching raw device contacts from OS...');
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name, Contacts.Fields.FirstName, Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      const deviceContactsList: DeviceContact[] = data
        .filter(contact => contact.id !== undefined && contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => ({
          id: contact.id!,
          name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          phoneNumbers: contact.phoneNumbers?.map((p: any) => p.number || '').filter((p: string) => this.normalizePhoneNumber(p) !== null) || [],
          emails: contact.emails?.map((e: any) => e.email || '').filter((e: string) => e.length > 0) || [],
          rawPhoneNumbers: contact.phoneNumbers?.map((p: any) => p.number || '') || [],
        }))
        .filter(contact => contact.phoneNumbers.length > 0);

      logger.info(`[ContactsService] Retrieved ${deviceContactsList.length} contacts from device OS.`);
      this.cachedRawDeviceContacts = deviceContactsList; // Cache the raw fetched contacts
      // Note: saveContactsToCache() will be called by syncContacts after all caches are updated.
      return deviceContactsList;
    } catch (error) {
      logger.error('[ContactsService] Error fetching raw device contacts from OS:', error);
      throw error;
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string | null {
    if (!phoneNumber) return null;
    let normalized = phoneNumber.replace(/[^+0-9]/g, '');
    if (normalized.match(/^[0-9]{10}$/)) normalized = '+1' + normalized;
    else if (normalized.match(/^1[0-9]{10}$/)) normalized = '+' + normalized;
    else if (normalized.match(/^[1-9][0-9]{10,14}$/) && !normalized.startsWith('+')) normalized = '+' + normalized;
    return normalized.match(/^\+[1-9][0-9]{10,14}$/) ? normalized : null;
  }

  private normalizeDeviceContactsForSync(deviceContacts: DeviceContact[]): NormalizedContact[] {
    const normalized: NormalizedContact[] = [];
    deviceContacts.forEach(contact => {
      contact.phoneNumbers.forEach((ph, index) => {
        const normalizedPhone = this.normalizePhoneNumber(ph); // Already filtered in fetchRawDeviceContacts, but good practice
        if (normalizedPhone) {
          normalized.push({
            deviceContactId: `${contact.id}_${index}`, // Ensure unique ID for each number
            displayName: contact.name,
            firstName: contact.firstName,
            lastName: contact.lastName,
            phoneNumber: normalizedPhone,
            rawPhoneNumber: contact.rawPhoneNumbers[index] || ph,
            email: contact.emails[0],
            contactSource: 'phone',
          });
        }
      });
    });
    const seen = new Set<string>(); // Deduplicate by normalized phone number
    const deduplicated = normalized.filter(c => {
      if (seen.has(c.phoneNumber)) return false;
      seen.add(c.phoneNumber);
      return true;
    });
    logger.debug(`[ContactsService] Normalized ${deviceContacts.length} raw contacts to ${deduplicated.length} unique entries for sync.`);
    return deduplicated;
  }

  public async syncContacts(forceRefreshDeviceContacts: boolean = false): Promise<ContactSyncResult> {
    if (this.syncInProgress && this.activeSyncPromise) {
      logger.info('[ContactsService] Contact sync already in progress. Returning existing promise for concurrent caller.');
      return this.activeSyncPromise;
    }

    this.syncInProgress = true;
    
    // Create the sync promise
    this.activeSyncPromise = this.performSyncOperation(forceRefreshDeviceContacts);
    
    try {
      const result = await this.activeSyncPromise;
      return result;
    } finally {
      this.syncInProgress = false;
      this.activeSyncPromise = null;
    }
  }

  private async performSyncOperation(forceRefreshDeviceContacts: boolean): Promise<ContactSyncResult> {
    // Check if paused for profile switch
    if (this.isPausedForProfileSwitch) {
      logger.debug('[ContactsService] Sync paused for profile switch - aborting');
      return {
        sessionId: '',
        totalContacts: 0,
        newContacts: 0,
        updatedContacts: 0,
        matchedContacts: 0,
        matches: [],
        errors: ['Sync aborted - profile switch in progress']
      };
    }

    try {
      logger.info(`[ContactsService] Starting contact sync (forceRefreshDevice: ${forceRefreshDeviceContacts})...`);

      // CRITICAL: Ensure we have valid authentication before syncing to prevent 401 cascade
      try {
        const token = await getAccessToken();
        if (!token) {
          console.warn("🔒 [ContactsService] No access token available for contact sync - aborting to prevent 401 errors");
          throw new Error("No access token available");
        }
        
        // Test if token is valid by making a lightweight request first
        try {
          await apiClient.get('/auth/verify-token');
          console.log("✅ [ContactsService] Token validation successful, proceeding with contact sync");
        } catch (tokenValidationError: any) {
          if (tokenValidationError.response?.status === 401) {
            console.warn("🔒 [ContactsService] Token invalid (401), aborting contact sync to prevent cascade failure");
            throw new Error("Token invalid (401)");
          }
          // If it's not a 401, continue anyway (might be network issue)
          console.warn("⚠️ [ContactsService] Token validation failed but not 401, continuing with contact sync");
        }
             } catch (authError) {
         // Return empty result instead of throwing to prevent cascade failures
         logger.warn("[ContactsService] Authentication check failed, returning empty sync result", String(authError));
        return { 
          sessionId: '', 
          totalContacts: 0, 
          newContacts: 0, 
          updatedContacts: 0, 
          matchedContacts: 0, 
          matches: [], 
          errors: ['Authentication check failed'] 
        };
      }
      
      let currentDeviceContacts: DeviceContact[];
      if (forceRefreshDeviceContacts || !this.cachedRawDeviceContacts) {
        logger.debug('[ContactsService] Sync: Forcing device contact fetch or no cache.');
        currentDeviceContacts = await this.fetchRawDeviceContacts();
      } else {
        logger.debug('[ContactsService] Sync: Using cached raw device contacts.');
        currentDeviceContacts = this.cachedRawDeviceContacts;
      }
      
      this.cachedRawDeviceContacts = currentDeviceContacts;

      const allNormalizedDeviceContacts = this.normalizeDeviceContactsForSync(currentDeviceContacts);
      
      if (allNormalizedDeviceContacts.length === 0) {
        logger.warn('[ContactsService] No valid contacts found on device to sync.');
        this.cachedMatchedPlatformContacts = [];
        this.cachedPhoneOnlyNormalizedContacts = [];
        this.lastSyncTimestamp = new Date();
        await this.saveContactsToCache();
        return { sessionId: '', totalContacts: 0, newContacts: 0, updatedContacts: 0, matchedContacts: 0, matches: [], errors: ['No valid contacts found on device'] };
      }

      const syncPayload = { contacts: allNormalizedDeviceContacts, deviceInfo: { platform: Platform.OS, version: Platform.Version }, syncType: 'full' };
      logger.debug(`[ContactsService] Sending ${allNormalizedDeviceContacts.length} normalized contacts to backend (${CONTACTS_API_PATHS.SYNC})...`);
      const response = await apiClient.post(CONTACTS_API_PATHS.SYNC, syncPayload);

      if (!response.data) {
        throw new Error('Backend sync failed: No response data');
      }
      const result: ContactSyncResult = response.data;
      logger.info(`[ContactsService] Backend sync successful. Matched: ${result.matchedContacts}. Total sent: ${allNormalizedDeviceContacts.length}.`);

      this.cachedMatchedPlatformContacts = result.matches || []; // These are ContactMatch[] from backend

      const matchedPhoneNumbers = new Set(
        (this.cachedMatchedPlatformContacts || []).map(match => match.contact.phoneNumber)
      );

      this.cachedPhoneOnlyNormalizedContacts = allNormalizedDeviceContacts.filter(
        normContact => !matchedPhoneNumbers.has(normContact.phoneNumber)
      );
      
      logger.debug(`[ContactsService] Post-sync: Matched Platform Contacts: ${this.cachedMatchedPlatformContacts.length}, Phone-Only Normalized: ${this.cachedPhoneOnlyNormalizedContacts.length}`);

      this.lastSyncTimestamp = new Date();
      await this.saveContactsToCache();
      return result;

    } catch (error) {
      logger.error('[ContactsService] Contact sync process failed:', error);
      throw error; // Re-throw to be caught by callers
    }
  }

  // Public getter for Matched Platform Contacts (ContactMatch[])
  public async getMatchedPlatformContacts(forceRefresh: boolean = false): Promise<ContactMatch[]> {
    logger.debug(`[ContactsService] getMatchedPlatformContacts called (forceRefresh: ${forceRefresh})`);
    const isCacheStale = !this.lastSyncTimestamp || (new Date().getTime() - this.lastSyncTimestamp.getTime()) > CACHE_DURATION_MS;

    if (!forceRefresh && !isCacheStale && this.cachedMatchedPlatformContacts !== null) {
      logger.info('[ContactsService] Returning cached matched platform contacts.');
      return this.cachedMatchedPlatformContacts;
    }
    
    if (this.syncInProgress && this.activeSyncPromise) {
      logger.info('[ContactsService] Sync in progress, waiting for completion to return matched platform contacts.');
      try {
        await this.activeSyncPromise;
        return this.cachedMatchedPlatformContacts || [];
      } catch (error) {
        logger.error('[ContactsService] Active sync failed, returning cached matched platform contacts:', error);
        return this.cachedMatchedPlatformContacts || [];
      }
    }

    try {
      logger.info(`[ContactsService] Matched platform contacts: Cache stale or refresh forced. Triggering sync.`);
      await this.syncContacts(forceRefresh);
      return this.cachedMatchedPlatformContacts || [];
    } catch (error) {
      logger.error('[ContactsService] Error getting matched platform contacts (sync might have failed):', error);
      return this.cachedMatchedPlatformContacts || []; // Return stale if available on error
    }
  }

  // Public getter for Phone-Only Normalized Contacts (NormalizedContact[])
  public async getPhoneOnlyNormalizedContacts(forceRefresh: boolean = false): Promise<NormalizedContact[]> {
    logger.debug(`[ContactsService] getPhoneOnlyNormalizedContacts called (forceRefresh: ${forceRefresh})`);
    const isCacheStale = !this.lastSyncTimestamp || (new Date().getTime() - this.lastSyncTimestamp.getTime()) > CACHE_DURATION_MS;

    if (!forceRefresh && !isCacheStale && this.cachedPhoneOnlyNormalizedContacts !== null) {
      logger.info('[ContactsService] Returning cached phone-only normalized contacts.');
      return this.cachedPhoneOnlyNormalizedContacts;
    }

    if (this.syncInProgress && this.activeSyncPromise) {
      logger.info('[ContactsService] Sync in progress, waiting for completion to return phone-only normalized contacts.');
      try {
        await this.activeSyncPromise;
        return this.cachedPhoneOnlyNormalizedContacts || [];
      } catch (error) {
        logger.error('[ContactsService] Active sync failed, returning cached phone-only normalized contacts:', error);
        return this.cachedPhoneOnlyNormalizedContacts || [];
      }
    }
    
    try {
      logger.info(`[ContactsService] Phone-only contacts: Cache stale or refresh forced. Triggering sync.`);
      await this.syncContacts(forceRefresh);
      return this.cachedPhoneOnlyNormalizedContacts || [];
    } catch (error) {
      logger.error('[ContactsService] Error getting phone-only normalized contacts (sync might have failed):', error);
      return this.cachedPhoneOnlyNormalizedContacts || []; // Return stale if available on error
    }
  }
  
  // Method to get raw device contacts (cached or fetched) - for internal use or specific scenarios
  public async getRawDeviceContacts(forceRefresh: boolean = false): Promise<DeviceContact[]> {
    if (!this.hasPermission) {
        const perm = await this.requestPermission();
        if (!perm) return [];
    }
    if (!forceRefresh && this.cachedRawDeviceContacts) {
        logger.debug('[ContactsService] Returning cached raw device contacts.');
        return this.cachedRawDeviceContacts;
    }
    logger.debug(`[ContactsService] Fetching raw device contacts (forceRefresh: ${forceRefresh})`);
    return this.fetchRawDeviceContacts();
  }


  async searchContacts(query: string): Promise<ContactMatch[]> { // This likely searches platform users
    try {
      logger.debug(`[ContactsService] Searching contacts (platform): ${query} using ${CONTACTS_API_PATHS.SEARCH}`);
      const response = await apiClient.get(`${CONTACTS_API_PATHS.SEARCH}?q=${encodeURIComponent(query)}`);
      return response.data?.data || [];
    } catch (error) {
      logger.error('[ContactsService] Error searching contacts (platform):', error);
      return [];
    }
  }

  getSyncStatus(): { lastSync: Date | null; inProgress: boolean } {
    return { lastSync: this.lastSyncTimestamp, inProgress: this.syncInProgress };
  }

  async clearContactData(): Promise<void> {
    try {
      logger.info('[ContactsService] Clearing all contact data from cache and memory.');
      await Promise.all([
        AsyncStorage.removeItem(CACHED_MATCHED_PLATFORM_CONTACTS),
        AsyncStorage.removeItem(CACHED_PHONE_ONLY_NORMALIZED_CONTACTS),
        AsyncStorage.removeItem(CACHED_RAW_DEVICE_CONTACTS),
        AsyncStorage.removeItem(CONTACTS_LAST_SYNC_TIMESTAMP),
      ]);
      this.cachedMatchedPlatformContacts = null;
      this.cachedPhoneOnlyNormalizedContacts = null;
      this.cachedRawDeviceContacts = null;
      this.lastSyncTimestamp = null;
      this.hasPermission = false;
      logger.info('[ContactsService] Contact data cleared successfully.');
    } catch (error) {
      logger.error('[ContactsService] Error clearing contact data:', error);
    }
  }

  /**
   * Cleanup - unsubscribe from events
   */
  cleanup(): void {
    if (this.unsubscribeSwitchStart) {
      this.unsubscribeSwitchStart();
      this.unsubscribeSwitchStart = null;
    }
    if (this.unsubscribeSwitchComplete) {
      this.unsubscribeSwitchComplete();
      this.unsubscribeSwitchComplete = null;
    }
    logger.debug('[ContactsService] Cleanup completed');
  }

  /**
   * Reset all internal state - primarily for testing
   */
  reset(): void {
    this.hasPermission = false;
    this.lastSyncTimestamp = null;
    this.syncInProgress = false;
    this.activeSyncPromise = null;
    this.cachedMatchedPlatformContacts = null;
    this.cachedPhoneOnlyNormalizedContacts = null;
    this.cachedRawDeviceContacts = null;
    this.isPausedForProfileSwitch = false;
    logger.debug('[ContactsService] Reset completed');
  }
}

const contactsService = new ContactsService();
export default contactsService; 