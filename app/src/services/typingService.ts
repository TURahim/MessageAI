import { doc, updateDoc, serverTimestamp, deleteField, onSnapshot, Timestamp, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Update typing state for a user in a conversation
 * Sets typing field to serverTimestamp if typing, removes it if not
 */
export async function setTyping(
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    
    await updateDoc(conversationRef, {
      [`typing.${userId}`]: isTyping ? serverTimestamp() : deleteField()
    });
    
    console.log(`⌨️ Typing status updated: ${userId.substring(0, 8)} → ${isTyping ? 'typing' : 'stopped'}`);
  } catch (error: any) {
    console.warn('⚠️ Failed to update typing status:', error.message);
    // Don't throw - typing indicators should be non-blocking
  }
}

/**
 * Subscribe to typing state changes in a conversation
 * Filters out users who haven't typed in the last 3 seconds
 */
export function subscribeToTyping(
  conversationId: string,
  currentUserId: string,
  onUpdate: (typingUserIds: string[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const conversationRef = doc(db, 'conversations', conversationId);
  
  return onSnapshot(
    conversationRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const typing = data.typing || {};
        const now = Timestamp.now().toMillis();
        const threshold = 3000; // 3 seconds
        
        // Filter users who are actively typing (within last 3s) and not current user
        const typingUsers = Object.entries(typing)
          .filter(([uid, ts]) => {
            if (uid === currentUserId) return false; // Don't show own typing
            if (!ts || typeof ts.toMillis !== 'function') return false;
            return (now - (ts as Timestamp).toMillis()) < threshold;
          })
          .map(([uid]) => uid);
        
        onUpdate(typingUsers);
      }
    },
    (error) => {
      console.warn('Error subscribing to typing status:', error);
      if (onError) onError(error as Error);
    }
  );
}

/**
 * Clear typing state for a user
 */
export async function clearTyping(conversationId: string, userId: string): Promise<void> {
  await setTyping(conversationId, userId, false);
}

