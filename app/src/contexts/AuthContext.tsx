import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

/**
 * Ensure user document exists in Firestore
 * This is called whenever auth state changes to make sure the Firestore
 * document exists for presence, profile, etc.
 */
async function ensureUserDocument(user: User) {
  try {
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
        createdAt: serverTimestamp(),
      });
      console.log('✅ Created user document for:', user.uid);
    } else {
      // Update existing document (in case email/displayName/photo changed)
      await setDoc(userRef, userData, { merge: true });
      console.log('✅ Updated user document for:', user.uid);
    }
  } catch (error) {
    console.error('❌ Error ensuring user document:', error);
    // Don't throw - this should not prevent auth
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔐 Auth state changed:', {
        hasUser: !!user,
        uid: user?.uid,
        email: user?.email,
        displayName: user?.displayName,
        photoURL: user?.photoURL,
      });
      
      if (user) {
        // Ensure user document exists in Firestore
        await ensureUserDocument(user);
        
        // Verify we can read the document back
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          console.log('📄 User document after ensure:', {
            exists: userDoc.exists(),
            data: userDoc.data(),
          });
        } catch (error: any) {
          console.error('❌ Failed to read user document:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
        }
      }
      
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

