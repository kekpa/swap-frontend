import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './logger';

// Create a synchronized wrapper for AsyncStorage to make it behave like localStorage
class LocalStoragePolyfill {
  private items: Record<string, string> = {};
  private initialized = false;
  
  // Initialize data from AsyncStorage
  private async init() {
    if (this.initialized) return;
    
    try {
      const keys = await AsyncStorage.getAllKeys();
      const storedItems = await AsyncStorage.multiGet(keys);
      
      storedItems.forEach(([key, value]) => {
        if (value !== null) {
          this.items[key] = value;
        }
      });
      
      this.initialized = true;
      logger.debug('LocalStoragePolyfill initialized', 'data', { itemCount: Object.keys(this.items).length });
    } catch (error) {
      logger.error('Failed to initialize localStorage polyfill', error, 'data');
      this.initialized = true; // Set to true to avoid retrying on failure
    }
  }
  
  // Wait for initialization
  private async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }
  
  // LocalStorage API
  async getItem(key: string): Promise<string | null> {
    await this.ensureInitialized();
    return this.items[key] || null;
  }
  
  async setItem(key: string, value: string): Promise<void> {
    await this.ensureInitialized();
    this.items[key] = value;
    await AsyncStorage.setItem(key, value);
  }
  
  async removeItem(key: string): Promise<void> {
    await this.ensureInitialized();
    delete this.items[key];
    await AsyncStorage.removeItem(key);
  }
  
  async clear(): Promise<void> {
    await this.ensureInitialized();
    this.items = {};
    await AsyncStorage.clear();
  }
  
  // Synchronous versions that are compatible with localStorage API
  // These will work once initialization is complete
  getItemSync(key: string): string | null {
    if (!this.initialized) {
      logger.warn('LocalStoragePolyfill not initialized yet - falling back to null', 'data');
      return null;
    }
    return this.items[key] || null;
  }
  
  setItemSync(key: string, value: string): void {
    if (!this.initialized) {
      logger.warn('LocalStoragePolyfill not initialized yet - operation may be lost', 'data');
      this.init().then(() => {
        this.setItem(key, value);
      });
      return;
    }
    this.items[key] = value;
    AsyncStorage.setItem(key, value).catch(error => {
      logger.error('Error in setItemSync', error, 'data');
    });
  }
  
  removeItemSync(key: string): void {
    if (!this.initialized) {
      logger.warn('LocalStoragePolyfill not initialized yet - operation may be lost', 'data');
      this.init().then(() => {
        this.removeItem(key);
      });
      return;
    }
    delete this.items[key];
    AsyncStorage.removeItem(key).catch(error => {
      logger.error('Error in removeItemSync', error, 'data');
    });
  }
  
  clearSync(): void {
    if (!this.initialized) {
      logger.warn('LocalStoragePolyfill not initialized yet - operation may be lost', 'data');
      this.init().then(() => {
        this.clear();
      });
      return;
    }
    this.items = {};
    AsyncStorage.clear().catch(error => {
      logger.error('Error in clearSync', error, 'data');
    });
  }
  
  // Properties required by localStorage interface
  get length(): number {
    return Object.keys(this.items).length;
  }
  
  key(index: number): string | null {
    const keys = Object.keys(this.items);
    return index >= 0 && index < keys.length ? keys[index] : null;
  }
}

// Create instance
const localStoragePolyfill = new LocalStoragePolyfill();

// Apply polyfill if needed
if (typeof localStorage === 'undefined' || localStorage === null) {
  // @ts-ignore
  global.localStorage = {
    getItem: (key: string): string | null => localStoragePolyfill.getItemSync(key),
    setItem: (key: string, value: string): void => localStoragePolyfill.setItemSync(key, value),
    removeItem: (key: string): void => localStoragePolyfill.removeItemSync(key),
    clear: (): void => localStoragePolyfill.clearSync(),
    key: (index: number): string | null => localStoragePolyfill.key(index),
    get length(): number { return localStoragePolyfill.length; }
  };
  
  logger.debug('localStorage polyfill installed', 'data');
}

export default localStoragePolyfill; 