/**
 * Mock eventEmitter for testing
 * Jest automatically uses this when jest.mock('../utils/eventEmitter') is called
 */
export const eventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  removeAllListeners: jest.fn(),
};
