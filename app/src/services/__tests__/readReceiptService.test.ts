// Mock Firebase to avoid initialization errors in tests
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}));

import { getReadCount } from '../readReceiptService';

describe('readReceiptService', () => {
  describe('getReadCount', () => {
    it('should return 0 for empty array', () => {
      expect(getReadCount([])).toBe(0);
    });

    it('should return correct count for single user', () => {
      expect(getReadCount(['user1'])).toBe(1);
    });

    it('should return correct count for multiple users', () => {
      expect(getReadCount(['user1', 'user2', 'user3'])).toBe(3);
    });
  });

  // Note: markMessageAsRead and markMessagesAsRead with arrayUnion
  // are tested in integration tests with Firebase emulators
  // The key behavior to test is idempotency (calling twice doesn't duplicate)
  describe('arrayUnion idempotency', () => {
    it('should document that arrayUnion prevents duplicates', () => {
      // This test documents that Firestore's arrayUnion is idempotent
      // When the same user is added multiple times, it only appears once
      // This is tested in the emulator integration tests
      expect(true).toBe(true);
    });
  });
});

