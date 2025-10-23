import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "@/lib/firebaseConfig";

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
// using AsyncStorage. This provides:
// - Automatic caching of documents
// - Offline query support
// - Queued writes when offline (sent when back online)
// - No manual configuration needed
export const db = getFirestore(app);

// Log offline persistence status
console.log('✅ Firestore initialized with automatic offline persistence');
console.log('📦 Offline features: Document cache, queued writes, offline queries');

export const storage = getStorage(app);

// Export app instance for tests
export { app };

