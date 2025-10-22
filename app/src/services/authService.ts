import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';

// Required for web browser to close properly after auth
WebBrowser.maybeCompleteAuthSession();

export async function signUpWithEmail(
  email: string, 
  password: string, 
  displayName: string
) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update profile
  await updateProfile(user, { displayName });
  
  // Create user document in Firestore
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName,
    photoURL: null,
    bio: '',
    friends: [],
    presence: {
      status: 'offline',
      lastSeen: serverTimestamp(),
      activeConversationId: null
    },
    createdAt: serverTimestamp(),
  });
  
  return user;
}

/**
 * Ensure user document exists in Firestore
 * Creates or updates the document with latest auth info
 */
async function ensureUserDocument(user: any) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL || null,
    presence: {
      status: 'offline' as const,
      lastSeen: serverTimestamp(),
      activeConversationId: null
    },
  };

  if (!userDoc.exists()) {
    // Create new document
    await setDoc(userRef, {
      ...userData,
      bio: '',
      friends: [],
      createdAt: serverTimestamp(),
    });
    console.log('✅ Created user document for:', user.uid);
  } else {
    // Update existing document (in case email/displayName/photo changed)
    // Don't overwrite bio or friends if they already exist
    await setDoc(userRef, userData, { merge: true });
    console.log('✅ Updated user document for:', user.uid);
  }
}

export async function signInWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDocument(userCredential.user);
  return userCredential.user;
}

export async function signInWithGoogle(idToken: string) {
  // Create Google credential with the token
  const credential = GoogleAuthProvider.credential(idToken);
  
  // Sign in with Firebase
  const userCredential = await signInWithCredential(auth, credential);
  await ensureUserDocument(userCredential.user);

  return userCredential.user;
}

// Hook for Google Sign-In configuration with runtime detection
export function useGoogleAuth() {
  // Detect runtime: Expo Go vs dev/standalone build
  const inExpoGo = Constants.appOwnership === 'expo';
  const useProxy = inExpoGo;
  
  // Create redirect URI based on runtime
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: inExpoGo ? undefined : 'messageai',
    // If in Expo Go, don't specify scheme (uses proxy)
    // If dev/standalone, use custom scheme
  });

  // Log for debugging
  console.log('🔐 Google Auth Config:', {
    runtime: inExpoGo ? 'Expo Go' : 'Dev/Standalone',
    useProxy,
    redirectUri,
    platform: Platform.OS,
  });

  // Environment variables
  const EXPO_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
  const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const AND_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  // Configuration object
  const config = {
    expoClientId: EXPO_CLIENT_ID,       // For Expo Go
    iosClientId: IOS_CLIENT_ID,         // For iOS dev/standalone
    androidClientId: AND_CLIENT_ID,     // For Android dev/standalone
    webClientId: WEB_CLIENT_ID,         // For web (optional)
    redirectUri,
    scopes: ['profile', 'email'],
  };

  // Runtime guards to prevent cryptic errors
  if (!inExpoGo && Platform.OS === 'ios' && !config.iosClientId) {
    throw new Error(
      '❌ Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID for iOS dev/standalone build. ' +
      'Add it to your .env file or test in Expo Go with expoClientId.'
    );
  }

  if (!inExpoGo && Platform.OS === 'android' && !config.androidClientId) {
    throw new Error(
      '❌ Missing EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID for Android dev/standalone build. ' +
      'Add it to your .env file or test in Expo Go with expoClientId.'
    );
  }

  if (inExpoGo && !config.expoClientId) {
    console.warn('⚠️ Missing EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID for Expo Go.');
    return {
      request: null,
      response: null,
      promptAsync: async () => {
        Alert.alert(
          'Google Sign-In Not Configured',
          'Add EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID to your .env file. See docs/GOOGLE-SIGNIN-SETUP.md'
        );
      }
    };
  }

  // Check if at least one client ID is configured
  const isConfigured = Boolean(EXPO_CLIENT_ID || IOS_CLIENT_ID || AND_CLIENT_ID);

  if (!isConfigured) {
    console.warn('⚠️ Google OAuth not configured. Add client IDs to .env');
    return { 
      request: null, 
      response: null, 
      promptAsync: async () => {
        Alert.alert(
          'Google Sign-In Not Configured',
          'Add Google OAuth client IDs to .env file. See docs/GOOGLE-SIGNIN-SETUP.md'
        );
      }
    };
  }

  const [request, response, promptAsync] = Google.useAuthRequest(config);

  return { request, response, promptAsync };
}

export async function signOut() {
  try {
    console.log('🚪 Signing out...');
    await firebaseSignOut(auth);
    console.log('✅ Sign out successful');
  } catch (error: any) {
    console.error('❌ Sign out error:', error);
    throw error;
  }
}
