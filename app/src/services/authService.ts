import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
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
  
  // Create user document in Firestore WITHOUT role
  // User will select role on next screen (selectRole)
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName,
    photoURL: null,
    bio: '',
    friends: [],
    // role: undefined - will be set in selectRole screen
    // timezone: undefined - will be set when role is selected
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
    // NEW USER: Detect timezone
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';
    
    // Create new document
    await setDoc(userRef, {
      ...userData,
      bio: '',
      friends: [],
      timezone: detectedTimezone,
      createdAt: serverTimestamp(),
    });
    console.log('✅ Created user document with timezone:', detectedTimezone);
  } else {
    // EXISTING USER: Backfill timezone if missing (write once)
    const existingData = userDoc.data();
    
    if (!existingData.timezone) {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';
      
      await setDoc(userRef, {
        ...userData,
        timezone: detectedTimezone,
      }, { merge: true });
      
      console.log('✅ Backfilled timezone for legacy user:', detectedTimezone);
    } else {
      // Update existing document (in case email/displayName/photo changed)
      // Don't overwrite bio, friends, or timezone if they already exist
      await setDoc(userRef, userData, { merge: true });
      console.log('✅ Updated user document for:', user.uid);
    }
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

/**
 * Set user role and related data after signup
 * Called from selectRole screen
 */
export async function setUserRole(
  uid: string,
  role: 'tutor' | 'parent',
  data: {
    tutorCode?: string;
    subjects?: string[];
    businessName?: string;
    linkedTutorIds?: string[];
    studentContext?: string;
  }
) {
  // Detect timezone when role is selected
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';
  
  // Filter out undefined values (Firestore doesn't accept undefined)
  const cleanData: Record<string, any> = { role, timezone };
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  });
  
  await setDoc(doc(db, 'users', uid), cleanData, { merge: true });
  
  console.log(`✅ User role set to ${role} with timezone ${timezone}`, cleanData);
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

/**
 * Re-authenticate user with password (required before account deletion)
 */
export async function reauthenticateWithPassword(password: string): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No authenticated user or email not found');
    }

    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    
    console.log('✅ Re-authentication successful');
    return true;
  } catch (error: any) {
    console.error('❌ Re-authentication error:', error);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Incorrect password. Please try again.');
    }
    throw error;
  }
}

/**
 * Delete all user data from Firestore
 */
async function deleteUserData(userId: string): Promise<void> {
  console.log('🗑️ Starting user data deletion for:', userId);

  try {
    // 0. Get user data before deletion (for tutor code cleanup)
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : null;

    // 2. Delete all conversations where user is participant
    const conversationsRef = collection(db, 'conversations');
    const conversationsQuery = query(conversationsRef, where('participants', 'array-contains', userId));
    const conversationsSnapshot = await getDocs(conversationsQuery);
    
    console.log(`📊 Found ${conversationsSnapshot.size} conversations to delete`);
    
    for (const conversationDoc of conversationsSnapshot.docs) {
      // Delete all messages in the conversation
      const messagesRef = collection(db, 'conversations', conversationDoc.id, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      const batch = writeBatch(db);
      messagesSnapshot.docs.forEach((messageDoc) => {
        batch.delete(messageDoc.ref);
      });
      await batch.commit();
      
      // Delete the conversation document
      await deleteDoc(conversationDoc.ref);
      console.log(`✅ Deleted conversation: ${conversationDoc.id}`);
    }

    // 3. Delete all events created by or involving the user
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(eventsRef, where('participants', 'array-contains', userId));
    const eventsSnapshot = await getDocs(eventsQuery);
    
    console.log(`📊 Found ${eventsSnapshot.size} events to delete`);
    
    const eventsBatch = writeBatch(db);
    eventsSnapshot.docs.forEach((eventDoc) => {
      eventsBatch.delete(eventDoc.ref);
    });
    await eventsBatch.commit();
    console.log('✅ Events deleted');

    // 4. Delete all deadlines assigned to the user
    const deadlinesRef = collection(db, 'deadlines');
    const deadlinesQuery = query(deadlinesRef, where('assignee', '==', userId));
    const deadlinesSnapshot = await getDocs(deadlinesQuery);
    
    console.log(`📊 Found ${deadlinesSnapshot.size} deadlines to delete`);
    
    const deadlinesBatch = writeBatch(db);
    deadlinesSnapshot.docs.forEach((deadlineDoc) => {
      deadlinesBatch.delete(deadlineDoc.ref);
    });
    await deadlinesBatch.commit();
    console.log('✅ Deadlines deleted');

    // 5. Delete tutor code registry entry if user is a tutor
    if (userData && userData.tutorCode) {
      const tutorCodeRef = doc(db, 'tutorCodes', userData.tutorCode);
      await deleteDoc(tutorCodeRef);
      console.log('✅ Tutor code registry entry deleted');
    }

    // 6. Finally, delete the user document
    await deleteDoc(userRef);
    console.log('✅ User document deleted');

    console.log('✅ All user data deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting user data:', error);
    throw error;
  }
}

/**
 * Delete user account and all associated data
 * Requires password re-authentication first
 */
export async function deleteAccount(password: string): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }

    console.log('🔐 Re-authenticating user before deletion...');
    await reauthenticateWithPassword(password);

    console.log('🗑️ Deleting user data...');
    await deleteUserData(user.uid);

    console.log('🗑️ Deleting Firebase Auth account...');
    await deleteUser(user);

    console.log('✅ Account deletion complete');
  } catch (error: any) {
    console.error('❌ Account deletion error:', error);
    throw error;
  }
}
