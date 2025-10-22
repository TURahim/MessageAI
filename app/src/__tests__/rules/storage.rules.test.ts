import { testEnv } from '../setup';
import { ref, uploadString } from 'firebase/storage';
import { setDoc, doc } from 'firebase/firestore';

describe('Storage Security Rules', () => {
  // Skip all tests if not using emulator
  const describeIfEmulator = process.env.USE_EMULATOR === 'true' ? describe : describe.skip;

  describeIfEmulator('Profile Photos', () => {
    it('should deny unauthenticated uploads', async () => {
      const unauthedStorage = testEnv.unauthenticatedContext().storage();
      
      await expect(
        uploadString(ref(unauthedStorage, 'profilePhotos/alice.jpg'), 'test-data')
      ).rejects.toThrow();
    });
    
    it('should allow users to upload their own profile photo', async () => {
      const alice = testEnv.authenticatedContext('alice').storage();
      
      // This should succeed
      const storageRef = ref(alice, 'profilePhotos/alice.jpg');
      await uploadString(storageRef, 'test-data');
      
      expect(true).toBe(true); // If we get here, upload succeeded
    });
  });

  describeIfEmulator('Message Media', () => {
    it('should allow uploads to conversation message paths for participants', async () => {
      const alice = testEnv.authenticatedContext('alice').storage();
      
      // Seed conversation with alice as participant
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'conversations', 'conv123'), {
          participants: ['alice', 'bob']
        });
      });
      
      // Upload to message path
      const storageRef = ref(alice, 'messages/conv123/msg456.jpg');
      await uploadString(storageRef, 'test-data');
      
      expect(true).toBe(true); // If we get here, upload succeeded
    });
  });
});

