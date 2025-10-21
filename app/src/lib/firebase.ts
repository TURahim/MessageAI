import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "./firebaseConfig";

// Initialize Firebase app (only if not already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth
// Note: Auth persistence defaults to memory in React Native.
// To add persistent auth (survive app restarts), install @react-native-async-storage/async-storage
// and use initializeAuth with getReactNativePersistence. 
// For MVP, memory persistence is acceptable (users log in once per session).
export const auth = getAuth(app);

// Use getFirestore for React Native compatibility
// Note: Firestore automatically enables offline persistence in React Native
// using AsyncStorage. No need for manual cache configuration.
export const db = getFirestore(app);

export const storage = getStorage(app);

// Export app instance for tests
export { app };

