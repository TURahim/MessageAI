import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { User } from '@/types/index';

/**
 * Add a friend (bidirectional relationship)
 */
export async function addFriend(currentUserId: string, friendId: string): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  if (currentUserId === friendId) {
    throw new Error('Cannot add yourself as a friend');
  }

  console.log('👥 Adding friend:', { currentUserId, friendId });

  try {
    const currentUserRef = doc(db, 'users', currentUserId);
    const friendRef = doc(db, 'users', friendId);

    // Use setDoc with merge to handle missing friends field gracefully
    // This creates the field if it doesn't exist, or updates it if it does
    await Promise.all([
      setDoc(
        currentUserRef,
        { friends: arrayUnion(friendId) },
        { merge: true }
      ),
      setDoc(
        friendRef,
        { friends: arrayUnion(currentUserId) },
        { merge: true }
      ),
    ]);

    console.log('✅ Friend added successfully');
  } catch (error: any) {
    console.error('❌ Error adding friend:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      currentUserId,
      friendId,
    });
    throw error;
  }
}

/**
 * Remove a friend (bidirectional)
 */
export async function removeFriend(currentUserId: string, friendId: string): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  console.log('👥 Removing friend:', { currentUserId, friendId });

  try {
    const currentUserRef = doc(db, 'users', currentUserId);
    const friendRef = doc(db, 'users', friendId);

    // Use setDoc with merge to remove friends
    await Promise.all([
      setDoc(
        currentUserRef,
        { friends: arrayRemove(friendId) },
        { merge: true }
      ),
      setDoc(
        friendRef,
        { friends: arrayRemove(currentUserId) },
        { merge: true }
      ),
    ]);

    console.log('✅ Friend removed successfully');
  } catch (error: any) {
    console.error('❌ Error removing friend:', error);
    throw error;
  }
}

/**
 * Get all friends for a user
 */
export async function getFriends(userId: string): Promise<User[]> {
  try {
    // Get user document
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data();
    const friendIds = userData.friends || [];

    if (friendIds.length === 0) {
      return [];
    }

    // Fetch all friend documents
    const friends: User[] = [];
    
    for (const friendId of friendIds) {
      const friendDoc = await getDoc(doc(db, 'users', friendId));
      if (friendDoc.exists()) {
        friends.push({ uid: friendDoc.id, ...friendDoc.data() } as User);
      }
    }

    return friends;
  } catch (error: any) {
    console.error('❌ Error getting friends:', error);
    throw error;
  }
}

/**
 * Check if two users are friends
 */
export async function isFriend(currentUserId: string, userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUserId));
    
    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data();
    const friendIds = userData.friends || [];

    return friendIds.includes(userId);
  } catch (error: any) {
    console.error('❌ Error checking friend status:', error);
    return false;
  }
}

/**
 * Subscribe to friends list in real-time
 */
export function subscribeFriends(
  userId: string,
  onUpdate: (friends: User[]) => void,
  onError?: (error: Error) => void
): () => void {
  // First, listen to the user's document to get friends array
  const userRef = doc(db, 'users', userId);
  
  const unsubscribe = onSnapshot(
    userRef,
    async (userSnapshot) => {
      if (!userSnapshot.exists()) {
        onUpdate([]);
        return;
      }

      const userData = userSnapshot.data();
      const friendIds = userData.friends || [];

      if (friendIds.length === 0) {
        onUpdate([]);
        return;
      }

      // Fetch friend details
      const friends: User[] = [];
      
      for (const friendId of friendIds) {
        try {
          const friendDoc = await getDoc(doc(db, 'users', friendId));
          if (friendDoc.exists()) {
            friends.push({ uid: friendDoc.id, ...friendDoc.data() } as User);
          }
        } catch (error) {
          console.warn('Could not fetch friend:', friendId, error);
        }
      }

      onUpdate(friends);
    },
    (error) => {
      console.error('Error subscribing to friends:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Get suggested contacts (users who are not friends)
 */
export async function getSuggestedContacts(currentUserId: string): Promise<User[]> {
  try {
    // Get current user's friends
    const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
    const friendIds = currentUserDoc.exists() ? (currentUserDoc.data().friends || []) : [];

    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const allUsers: User[] = [];

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      // Exclude current user and existing friends
      if (doc.id !== currentUserId && !friendIds.includes(doc.id)) {
        allUsers.push({ uid: doc.id, ...userData } as User);
      }
    });

    return allUsers;
  } catch (error: any) {
    console.error('❌ Error getting suggested contacts:', error);
    throw error;
  }
}

