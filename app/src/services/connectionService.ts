/**
 * Connection Service
 * 
 * Handles connections/disconnections and blocking between tutors and parents
 */

import { doc, updateDoc, arrayRemove, arrayUnion, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Remove a tutor-parent connection
 * - For parents: removes tutor from linkedTutorIds
 * - For tutors: no explicit field, but they can still disconnect
 * - Optionally archives the conversation
 */
export async function disconnectTutorParent(
  userId: string,
  otherUserId: string,
  conversationId?: string
): Promise<void> {
  try {
    // Get current user data to check role
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // If user is a parent, remove tutor from linkedTutorIds
    if (userData.role === 'parent' && userData.linkedTutorIds) {
      await updateDoc(userRef, {
        linkedTutorIds: arrayRemove(otherUserId),
      });
      console.log('✅ Removed tutor from parent linkedTutorIds');
    }
    
    // If user is a tutor, check if other user is parent and update their linkedTutorIds
    if (userData.role === 'tutor') {
      const otherUserRef = doc(db, 'users', otherUserId);
      const otherUserDoc = await getDoc(otherUserRef);
      
      if (otherUserDoc.exists()) {
        const otherUserData = otherUserDoc.data();
        if (otherUserData.role === 'parent' && otherUserData.linkedTutorIds) {
          await updateDoc(otherUserRef, {
            linkedTutorIds: arrayRemove(userId),
          });
          console.log('✅ Removed tutor from parent linkedTutorIds (tutor initiated)');
        }
      }
    }
    
    // Optionally archive the conversation instead of deleting
    // (For now, we keep the conversation but it won't appear in the main list
    // since the relationship is broken)
    if (conversationId) {
      // Option 1: Archive conversation (soft delete)
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        archived: true,
        archivedAt: new Date(),
      });
      console.log('✅ Conversation archived');
      
      // Option 2: Delete conversation completely (uncomment if preferred)
      // await deleteDoc(conversationRef);
      // console.log('✅ Conversation deleted');
    }
    
    console.log('✅ Disconnection successful');
  } catch (error) {
    console.error('❌ Error disconnecting tutor-parent:', error);
    throw error;
  }
}

/**
 * Block a user
 * - Adds user to blockedUserIds array for both users
 * - Removes any existing connection (linkedTutorIds)
 * - Archives the conversation
 */
export async function blockUser(
  userId: string,
  otherUserId: string,
  conversationId?: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const otherUserRef = doc(db, 'users', otherUserId);
    
    // Get both users' data
    const [userDoc, otherUserDoc] = await Promise.all([
      getDoc(userRef),
      getDoc(otherUserRef),
    ]);
    
    if (!userDoc.exists() || !otherUserDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const otherUserData = otherUserDoc.data();
    
    // Add to blocked list for both users
    await Promise.all([
      updateDoc(userRef, {
        blockedUserIds: arrayUnion(otherUserId),
      }),
      updateDoc(otherUserRef, {
        blockedUserIds: arrayUnion(userId),
      }),
    ]);
    
    console.log('✅ User blocked from both sides');
    
    // Remove connection if exists
    if (userData.role === 'parent' && userData.linkedTutorIds) {
      await updateDoc(userRef, {
        linkedTutorIds: arrayRemove(otherUserId),
      });
      console.log('✅ Removed from parent linkedTutorIds');
    }
    
    if (userData.role === 'tutor' && otherUserData.role === 'parent' && otherUserData.linkedTutorIds) {
      await updateDoc(otherUserRef, {
        linkedTutorIds: arrayRemove(userId),
      });
      console.log('✅ Removed from other user linkedTutorIds');
    }
    
    // Archive conversation
    if (conversationId) {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        archived: true,
        archivedAt: new Date(),
      });
      console.log('✅ Conversation archived');
    }
    
    console.log('✅ Block successful');
  } catch (error) {
    console.error('❌ Error blocking user:', error);
    throw error;
  }
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(userId: string, otherUserId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    const blockedUserIds = userData.blockedUserIds || [];
    
    return blockedUserIds.includes(otherUserId);
  } catch (error) {
    console.error('❌ Error checking block status:', error);
    return false;
  }
}

/**
 * Check if two users are connected (tutor-parent relationship)
 */
export async function areUsersConnected(userId: string, otherUserId: string): Promise<boolean> {
  try {
    const [userDoc, otherUserDoc] = await Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDoc(doc(db, 'users', otherUserId)),
    ]);
    
    if (!userDoc.exists() || !otherUserDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    const otherUserData = otherUserDoc.data();
    
    // Check if parent has tutor in linkedTutorIds
    if (userData.role === 'parent' && userData.linkedTutorIds) {
      return userData.linkedTutorIds.includes(otherUserId);
    }
    
    // Check if other user is parent and has this tutor in linkedTutorIds
    if (userData.role === 'tutor' && otherUserData.role === 'parent' && otherUserData.linkedTutorIds) {
      return otherUserData.linkedTutorIds.includes(userId);
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking connection status:', error);
    return false;
  }
}

