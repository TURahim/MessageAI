import { FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

let emulatorsConnected = false;

export function useEmulator(app: FirebaseApp) {
  // Only connect emulators in development mode and if not already connected
  if (process.env.USE_EMULATOR === 'true' && !emulatorsConnected) {
    try {
      const db = getFirestore(app);
      const auth = getAuth(app);
      const storage = getStorage(app);
      
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectStorageEmulator(storage, 'localhost', 9199);
      
      emulatorsConnected = true;
      console.log('🔧 Connected to Firebase Emulators');
    } catch (error) {
      console.warn('⚠️ Failed to connect to emulators:', error);
    }
  }
}

