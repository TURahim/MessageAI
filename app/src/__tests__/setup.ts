import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(() => Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Only initialize if emulator is running
  if (process.env.USE_EMULATOR === 'true') {
    testEnv = await initializeTestEnvironment({
      projectId: 'messageai-test',
      firestore: { host: 'localhost', port: 8080 },
      storage: { host: 'localhost', port: 9199 }
    });
  }
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

afterEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

export { testEnv };

