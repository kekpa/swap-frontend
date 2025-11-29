/**
 * Mock logger for testing
 * Jest automatically uses this when jest.mock('../utils/logger') is called
 */
const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
};

export default logger;
