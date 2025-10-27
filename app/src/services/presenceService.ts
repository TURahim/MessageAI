import { doc, updateDoc, writeBatch, serverTimestamp, setDoc, Timestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PresenceStatus } from '@/types/index';

/**
 * Update user presence status
 * CRITICAL: Uses heartbeat pattern, NOT hot writes
 * Only called on: app foreground, send message, switch conversation, 30s heartbeat
 */
export async function updatePresence(
  userId: string,
  status: PresenceStatus,
  activeConversationId: string | null
): Promise<void> {
  try {
    // Verify userId is valid before attempting update
    if (!userId || userId.length === 0) {
      console.warn('⚠️ Invalid userId for presence update, skipping');
      return;
    }
    
    const userRef = doc(db, 'users', userId);
    
    // Use setDoc with merge instead of update to handle non-existent documents
    await setDoc(userRef, {
      presence: {
        lastSeen: serverTimestamp(),
        status: status,
        activeConversationId: activeConversationId
      }
    }, { merge: true });
    
    console.log(`👤 Presence updated: ${userId.substring(0, 8)} → ${status}`, {
      activeConversation: activeConversationId?.substring(0, 12) || 'none'
    });
  } catch (error: any) {
    // Only log if it's not a permission error (which happens during auth initialization)
    if (!error.message?.includes('permission')) {
      console.warn('⚠️ Failed to update presence:', error.message);
    }
    // Don't throw - presence updates should be non-blocking
  }
}

/**
 * Check if user is online based on lastSeen timestamp
 * User is considered online if lastSeen < 90s ago
 */
export function isUserOnline(lastSeen: Timestamp | null): boolean {
  if (!lastSeen) return false;
  
  const now = Timestamp.now().toMillis();
  const lastSeenMs = lastSeen.toMillis();
  const threshold = 90000; // 90 seconds
  
  return (now - lastSeenMs) < threshold;
}

/**
 * Subscribe to user presence updates
 */
export function subscribeToUserPresence(
  userId: string,
  onUpdate: (status: PresenceStatus, lastSeen: Timestamp | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Validate userId before subscribing
  if (!userId || userId.length === 0) {
    console.warn('⚠️ Invalid userId for presence subscription, returning no-op');
    return () => {}; // Return no-op unsubscribe
  }
  
  const userRef = doc(db, 'users', userId);
  
  return onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const presence = data.presence;
        
        if (presence) {
          const isOnline = isUserOnline(presence.lastSeen);
          const status: PresenceStatus = isOnline ? 'online' : 'offline';
          onUpdate(status, presence.lastSeen);
        }
      }
    },
    (error) => {
      // Suppress permission errors during auth initialization
      if (!error.message?.includes('permission')) {
        console.warn('Error subscribing to user presence:', error);
      }
      if (onError) onError(error as Error);
    }
  );
}

/**
 * Set user offline (called on app close/unmount)
 */
export async function setOffline(userId: string): Promise<void> {
  await updatePresence(userId, 'offline', null);
}

/**
 * Set user online (called on app open/mount)
 */
export async function setOnline(userId: string, activeConversationId: string | null = null): Promise<void> {
  await updatePresence(userId, 'online', activeConversationId);
}

