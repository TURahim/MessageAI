import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';

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

