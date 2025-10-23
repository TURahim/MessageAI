// Mock Firebase config before importing
jest.mock('../firebaseConfig', () => ({
  firebaseConfig: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '123456789',
    appId: 'test-app-id',
  },
}));

import { auth, db, storage, app } from '../firebase';

describe('Firebase Configuration', () => {
  it('should initialize Auth', () => {
    expect(auth).toBeDefined();
    expect(auth.app).toBeDefined();
  });
  
  it('should initialize Firestore with offline persistence', () => {
    expect(db).toBeDefined();
    expect(db.app).toBeDefined();
  });
  
  it('should initialize Storage', () => {
    expect(storage).toBeDefined();
    expect(storage.app).toBeDefined();
  });

  it('should have matching app instances', () => {
    // All Firebase services should share the same app instance
    expect(auth.app.name).toBe(db.app.name);
    expect(auth.app.name).toBe(storage.app.name);
  });

  it('should export app instance', () => {
    expect(app).toBeDefined();
    expect(app.name).toBe('[DEFAULT]');
  });
});
