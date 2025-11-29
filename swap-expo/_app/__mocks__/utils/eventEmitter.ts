/**
 * Mock for eventEmitter
 */

export const eventEmitter = {
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
};

export default eventEmitter;
