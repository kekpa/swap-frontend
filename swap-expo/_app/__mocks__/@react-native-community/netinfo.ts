/**
 * Mock for @react-native-community/netinfo
 */

const mockAddEventListener = jest.fn(() => jest.fn()); // Returns unsubscribe function
const mockFetch = jest.fn().mockResolvedValue({
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
});

const NetInfo = {
  addEventListener: mockAddEventListener,
  fetch: mockFetch,
};

export default NetInfo;
export { mockAddEventListener, mockFetch };
