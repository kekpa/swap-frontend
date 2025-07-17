// Created: Constants configuration file
// API Configuration
export const API_URL = 'http://localhost:3000'; // Change this based on environment

// App Constants
export const APP_NAME = 'SWAP';
export const APP_VERSION = '1.0.0';

// Feature Flags
export const FEATURES = {
  INTERNATIONAL_TRANSFERS: true,
  PAYMENT_LINKS: true,
  SCHEDULED_TRANSFERS: true,
  CRYPTO_TRANSFERS: false,
};

// Currency Constants
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'HTG', symbol: 'G', name: 'Haitian Gourde' },
];

// Cache Duration Constants (in milliseconds)
export const CACHE_DURATIONS = {
  PROFILE: 5 * 60 * 1000, // 5 minutes
  BALANCES: 60 * 1000, // 1 minute
  TRANSACTIONS: 2 * 60 * 1000, // 2 minutes
  TOKEN_VERIFICATION: 5 * 60 * 1000, // 5 minutes
};

// App Limits
export const LIMITS = {
  MAX_TRANSFER_AMOUNT: 10000, // Maximum amount for a single transfer
  MIN_TRANSFER_AMOUNT: 1, // Minimum amount for a transfer
  MAX_NOTE_LENGTH: 100, // Maximum length for a transfer note
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  GENERIC_ERROR: 'Something went wrong. Please try again later.',
  INSUFFICIENT_FUNDS: 'You don\'t have enough funds to complete this transfer.',
};

// Route Names
export const ROUTES = {
  HOME: 'Home',
  LOGIN: 'Login',
  REGISTER: 'Register',
  WALLET: 'Wallet',
  TRANSFERS: 'Transfers',
  NEW_TRANSFER: 'NewTransfer',
  TRANSFER_AMOUNT: 'TransferAmount',
  TRANSFER_SUCCESS: 'TransferSuccess',
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
}; 