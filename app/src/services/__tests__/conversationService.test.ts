// Mock Firebase to avoid initialization errors in tests
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user' }
  },
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(() => ({ id: 'mock-conversation-id' })),
  setDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn((query, onSuccess) => {
    onSuccess({ forEach: jest.fn() });
    return jest.fn(); // mock unsubscribe
  }),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now() }))
  },
}));

import { createGroupConversation } from '../conversationService';

describe('conversationService', () => {
  describe('createGroupConversation', () => {
    it('should reject groups with less than 3 participants', async () => {
      await expect(
        createGroupConversation(['user1', 'user2'], 'Test Group', 'user1')
      ).rejects.toThrow('Group conversations require at least 3 participants');
    });

    it('should reject groups with more than 20 participants', async () => {
      const participants = Array.from({ length: 21 }, (_, i) => `user${i}`);
      
      await expect(
        createGroupConversation(participants, 'Test Group', 'user0')
      ).rejects.toThrow('Group conversations cannot have more than 20 participants');
    });

    it('should reject groups without a name', async () => {
      await expect(
        createGroupConversation(['user1', 'user2', 'user3'], '', 'user1')
      ).rejects.toThrow('Group name is required');
    });

    it('should reject if creator is not in participants', async () => {
      await expect(
        createGroupConversation(['user1', 'user2', 'user3'], 'Test Group', 'user4')
      ).rejects.toThrow('Creator must be included in participants');
    });

    it('should create group with valid parameters', async () => {
      const participants = ['user1', 'user2', 'user3'];
      const groupName = 'Test Group';
      const creatorId = 'user1';

      const conversationId = await createGroupConversation(participants, groupName, creatorId);
      
      expect(conversationId).toBe('mock-conversation-id');
    });

    it('should trim group name', async () => {
      const { setDoc } = require('firebase/firestore');
      
      await createGroupConversation(
        ['user1', 'user2', 'user3'],
        '  Test Group  ',
        'user1'
      );

      expect(setDoc).toHaveBeenCalled();
      const callArgs = setDoc.mock.calls[setDoc.mock.calls.length - 1];
      expect(callArgs[1].name).toBe('Test Group');
    });

    it('should accept exactly 3 participants', async () => {
      const conversationId = await createGroupConversation(
        ['user1', 'user2', 'user3'],
        'Test Group',
        'user1'
      );
      
      expect(conversationId).toBeTruthy();
    });

    it('should accept exactly 20 participants', async () => {
      const participants = Array.from({ length: 20 }, (_, i) => `user${i}`);
      
      const conversationId = await createGroupConversation(
        participants,
        'Large Group',
        'user0'
      );
      
      expect(conversationId).toBeTruthy();
    });
  });
});

