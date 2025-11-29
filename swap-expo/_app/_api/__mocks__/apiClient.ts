/**
 * Mock API client for testing
 * Jest automatically uses this when jest.mock('../_api/apiClient') is called
 */
const apiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

export default apiClient;
