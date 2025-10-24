import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';

// Set mock Firebase env vars BEFORE any Firebase imports
process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'AIzaSyTest-MockApiKey-ForTestingOnly123456789';
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789012';
process.env.EXPO_PUBLIC_FIREBASE_APP_ID = '1:123456789012:web:abcdef123456';

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

