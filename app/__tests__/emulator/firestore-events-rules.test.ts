/**
 * Firestore Security Rules Tests for Events Collection
 * 
 * Tests events collection security rules using Firebase Emulator
 * Requires: @firebase/rules-unit-testing
 * 
 * Run with: cd app && USE_EMULATOR=true npm test -- firestore-events-rules
 * 
 * Setup:
 * 1. Start emulator: firebase emulators:start
 * 2. Run tests
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { setDoc, doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Load Firestore rules
  const rulesPath = path.join(__dirname, '../../../firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: 'test-messageai',
    firestore: {
      rules,
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe('Events Collection Security Rules', () => {
  const mockEvent = {
    title: 'Math Tutoring',
    startTime: Timestamp.now(),
    endTime: Timestamp.now(),
    participants: ['user1', 'user2'],
    status: 'pending',
    createdBy: 'user1',
    rsvps: {},
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  describe('Read Access', () => {
    it('Test 1: Participant CAN read event', async () => {
      const eventRef = testEnv.unauthenticatedContext()
        .firestore()
        .collection('events')
        .doc('event1');

      // Create event as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(context.firestore().collection('events').doc('event1'), mockEvent);
      });

      // Test: user1 (participant) can read
      const user1Context = testEnv.authenticatedContext('user1');
      const readPromise = getDoc(user1Context.firestore().collection('events').doc('event1'));
      
      await assertSucceeds(readPromise);
    });

    it('Test 2: Non-participant CANNOT read event', async () => {
      // Create event as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(context.firestore().collection('events').doc('event1'), mockEvent);
      });

      // Test: user3 (not in participants) cannot read
      const user3Context = testEnv.authenticatedContext('user3');
      const readPromise = getDoc(user3Context.firestore().collection('events').doc('event1'));
      
      await assertFails(readPromise);
    });

    it('Unauthenticated user CANNOT read event', async () => {
      // Create event as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(context.firestore().collection('events').doc('event1'), mockEvent);
      });

      // Test: unauthenticated cannot read
      const unauthContext = testEnv.unauthenticatedContext();
      const readPromise = getDoc(unauthContext.firestore().collection('events').doc('event1'));
      
      await assertFails(readPromise);
    });
  });

  describe('Create Access', () => {
    it('User CAN create event if they are participant and creator', async () => {
      const user1Context = testEnv.authenticatedContext('user1');
      const createPromise = setDoc(
        user1Context.firestore().collection('events').doc('event1'),
        mockEvent
      );
      
      await assertSucceeds(createPromise);
    });

    it('User CANNOT create event if they are not in participants', async () => {
      const user3Context = testEnv.authenticatedContext('user3');
      const invalidEvent = {
        ...mockEvent,
        participants: ['user1', 'user2'], // user3 not in list
        createdBy: 'user3',
      };

      const createPromise = setDoc(
        user3Context.firestore().collection('events').doc('event1'),
        invalidEvent
      );
      
      await assertFails(createPromise);
    });

    it('User CANNOT create event if createdBy does not match auth', async () => {
      const user1Context = testEnv.authenticatedContext('user1');
      const invalidEvent = {
        ...mockEvent,
        participants: ['user1', 'user2'],
        createdBy: 'user2', // Mismatch!
      };

      const createPromise = setDoc(
        user1Context.firestore().collection('events').doc('event1'),
        invalidEvent
      );
      
      await assertFails(createPromise);
    });
  });

  describe('Update Access', () => {
    it('Test 3: Creator CAN update event', async () => {
      // Create event as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(context.firestore().collection('events').doc('event1'), mockEvent);
      });

      // Test: user1 (creator) can update
      const user1Context = testEnv.authenticatedContext('user1');
      const updatePromise = updateDoc(
        user1Context.firestore().collection('events').doc('event1'),
        { title: 'Updated Title' }
      );
      
      await assertSucceeds(updatePromise);
    });

    it('Test 4: Non-creator CANNOT update event', async () => {
      // Create event as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(context.firestore().collection('events').doc('event1'), mockEvent);
      });

      // Test: user2 (participant but not creator) cannot update
      const user2Context = testEnv.authenticatedContext('user2');
      const updatePromise = updateDoc(
        user2Context.firestore().collection('events').doc('event1'),
        { title: 'Hacked Title' }
      );
      
      await assertFails(updatePromise);
    });
  });

  describe('Delete Access', () => {
    it('Creator CAN delete event', async () => {
      // Create event as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(context.firestore().collection('events').doc('event1'), mockEvent);
      });

      // Test: user1 (creator) can delete
      const user1Context = testEnv.authenticatedContext('user1');
      const deletePromise = deleteDoc(
        user1Context.firestore().collection('events').doc('event1')
      );
      
      await assertSucceeds(deletePromise);
    });

    it('Non-creator CANNOT delete event', async () => {
      // Create event as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(context.firestore().collection('events').doc('event1'), mockEvent);
      });

      // Test: user2 (participant but not creator) cannot delete
      const user2Context = testEnv.authenticatedContext('user2');
      const deletePromise = deleteDoc(
        user2Context.firestore().collection('events').doc('event1')
      );
      
      await assertFails(deletePromise);
    });
  });

  describe('Cloud Functions Access', () => {
    it('Test 5: Cloud Function CAN write event (via admin SDK)', async () => {
      // Cloud Functions use admin SDK which bypasses security rules
      // This test verifies we can write via withSecurityRulesDisabled
      
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const eventRef = context.firestore().collection('events').doc('event-admin');
        const writePromise = setDoc(eventRef, {
          ...mockEvent,
          createdBy: 'admin', // Can be anyone when using admin SDK
        });

        // Should succeed
        await writePromise;
        
        // Verify it was written
        const snap = await getDoc(eventRef);
        expect(snap.exists()).toBe(true);
      });
    });
  });
});

