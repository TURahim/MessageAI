// Mock expo modules before importing
jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'exp://localhost:8081'),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'expo', // Simulate Expo Go
  },
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

import { signUpWithEmail, signInWithEmail, signOut } from '../authService';

// Mock Firebase modules
jest.mock('../../lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  onAuthStateChanged: jest.fn(),
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
  signInWithCredential: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => false,
    data: () => null,
  })),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUpWithEmail', () => {
    it('should create user with email and password', async () => {
      const { createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');
      const { setDoc } = require('firebase/firestore');
      
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
      };
      
      createUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });
      
      updateProfile.mockResolvedValue(undefined);
      setDoc.mockResolvedValue(undefined);

      const result = await signUpWithEmail('test@example.com', 'password123', 'Test User');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(updateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'Test User' });
      expect(setDoc).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw error for invalid email', async () => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');
      
      createUserWithEmailAndPassword.mockRejectedValue(
        new Error('auth/invalid-email')
      );

      await expect(
        signUpWithEmail('invalid-email', 'password123', 'Test User')
      ).rejects.toThrow();
    });
  });

  describe('signInWithEmail', () => {
    it('should sign in with valid credentials', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');
      
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
      };
      
      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      });

      const result = await signInWithEmail('test@example.com', 'password123');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error for wrong credentials', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');
      
      signInWithEmailAndPassword.mockRejectedValue(
        new Error('auth/wrong-password')
      );

      await expect(
        signInWithEmail('wrong@test.com', 'wrong')
      ).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('should sign out user', async () => {
      const firebaseSignOut = require('firebase/auth').signOut;
      
      firebaseSignOut.mockResolvedValue(undefined);

      await signOut();

      expect(firebaseSignOut).toHaveBeenCalled();
    });
  });
});
