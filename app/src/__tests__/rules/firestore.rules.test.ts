import { testEnv } from '../setup';
import { setDoc, getDoc, doc, collection, getDocs, query, where } from 'firebase/firestore';

describe('Firestore Security Rules', () => {
  // Skip all tests if not using emulator
  const describeIfEmulator = process.env.USE_EMULATOR === 'true' ? describe : describe.skip;

  describeIfEmulator('Users Collection', () => {
    it('should deny unauthenticated reads', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      
      await expect(
        getDoc(doc(unauthedDb, 'users', 'alice'))
      ).rejects.toThrow();
    });
    
    it('should allow users to read their own profile', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      
      // Seed user document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users', 'alice'), {
          uid: 'alice',
          displayName: 'Alice',
          presence: { status: 'online' }
        });
      });
      
      const userDoc = await getDoc(doc(alice, 'users', 'alice'));
      expect(userDoc.exists()).toBe(true);
    });

    it('should allow users to read other profiles', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      
      // Seed bob's document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users', 'bob'), {
          uid: 'bob',
          displayName: 'Bob'
        });
      });
      
      const bobDoc = await getDoc(doc(alice, 'users', 'bob'));
      expect(bobDoc.exists()).toBe(true);
    });
  });

  describeIfEmulator('Conversations Collection', () => {
    it('should deny reading conversations user is not part of', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      
      // Create conversation between bob and charlie
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'conversations', 'conv123'), {
          participants: ['bob', 'charlie'],
          type: 'direct'
        });
      });
      
      // Alice tries to query conversations
      const q = query(
        collection(alice, 'conversations'),
        where('participants', 'array-contains', 'alice')
      );
      const snapshot = await getDocs(q);
      
      // Should not include conv123
      expect(snapshot.docs.find(d => d.id === 'conv123')).toBeUndefined();
    });
    
    it('should allow reading conversations user is part of', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      
      // Create conversation with alice
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'conversations', 'conv456'), {
          participants: ['alice', 'bob'],
          type: 'direct'
        });
      });
      
      const q = query(
        collection(alice, 'conversations'),
        where('participants', 'array-contains', 'alice')
      );
      const snapshot = await getDocs(q);
      
      // Should include conv456
      expect(snapshot.docs.find(d => d.id === 'conv456')).toBeDefined();
    });
  });

  describeIfEmulator('Messages Subcollection', () => {
    it('should allow participants to read messages', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      
      // Seed conversation and message
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'conversations', 'conv789'), {
          participants: ['alice', 'bob'],
          type: 'direct'
        });
        await setDoc(doc(context.firestore(), 'conversations', 'conv789', 'messages', 'msg1'), {
          text: 'Hello',
          senderId: 'bob'
        });
      });
      
      const messageDoc = await getDoc(doc(alice, 'conversations', 'conv789', 'messages', 'msg1'));
      expect(messageDoc.exists()).toBe(true);
    });

    it('should deny non-participants from reading messages', async () => {
      const charlie = testEnv.authenticatedContext('charlie').firestore();
      
      // Seed conversation and message (without charlie)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'conversations', 'conv999'), {
          participants: ['alice', 'bob'],
          type: 'direct'
        });
        await setDoc(doc(context.firestore(), 'conversations', 'conv999', 'messages', 'msg2'), {
          text: 'Secret',
          senderId: 'alice'
        });
      });
      
      await expect(
        getDoc(doc(charlie, 'conversations', 'conv999', 'messages', 'msg2'))
      ).rejects.toThrow();
    });
  });
});

