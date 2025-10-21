import { Timestamp } from 'firebase/firestore';

// Mock Firebase to avoid initialization errors in tests
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}));

import { isUserOnline } from '../presenceService';

describe('presenceService', () => {
  describe('isUserOnline', () => {
    it('should return false for null timestamp', () => {
      expect(isUserOnline(null)).toBe(false);
    });

    it('should return true if lastSeen is within 90 seconds', () => {
      const now = Timestamp.now();
      const recent = Timestamp.fromMillis(now.toMillis() - 30000); // 30s ago
      
      expect(isUserOnline(recent)).toBe(true);
    });

    it('should return false if lastSeen is more than 90 seconds ago', () => {
      const now = Timestamp.now();
      const old = Timestamp.fromMillis(now.toMillis() - 120000); // 2min ago
      
      expect(isUserOnline(old)).toBe(false);
    });

    it('should return true for lastSeen exactly at 89 seconds', () => {
      const now = Timestamp.now();
      const recent = Timestamp.fromMillis(now.toMillis() - 89000); // 89s ago
      
      expect(isUserOnline(recent)).toBe(true);
    });

    it('should return false for lastSeen exactly at 91 seconds', () => {
      const now = Timestamp.now();
      const old = Timestamp.fromMillis(now.toMillis() - 91000); // 91s ago
      
      expect(isUserOnline(old)).toBe(false);
    });
  });

  // Note: updatePresence tests would require emulator
  // They are covered in the rules tests when running with USE_EMULATOR=true
  describe('updatePresence (integration - requires emulator)', () => {
    it('should be tested with emulator', () => {
      // This is a placeholder to document that presence updates
      // are tested in the emulator integration tests
      expect(true).toBe(true);
    });
  });
});

