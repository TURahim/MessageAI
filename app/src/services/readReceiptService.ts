import { doc, updateDoc, arrayUnion, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Mark a single message as read by a user
 * Uses arrayUnion for idempotent updates (won't add duplicates)
 */
export async function markMessageAsRead(
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    
    await updateDoc(messageRef, {
      readBy: arrayUnion(userId),
    });
    
    console.log(`👁️ Message ${messageId.substring(0, 8)} marked as read by ${userId.substring(0, 8)}`);
  } catch (error: any) {
    console.warn('⚠️ Failed to mark message as read:', error.message);
    // Don't throw - read receipts should be non-blocking
  }
}

/**
 * Mark multiple messages as read by a user (batch operation)
 * Uses arrayUnion for idempotent updates
 */
export async function markMessagesAsRead(
  conversationId: string,
  messageIds: string[],
  userId: string
): Promise<void> {
  if (messageIds.length === 0) return;

  try {
    const batch = writeBatch(db);
    
    messageIds.forEach((messageId) => {
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      batch.update(messageRef, {
        readBy: arrayUnion(userId),
      });
    });
    
    await batch.commit();
    
    console.log(`👁️ Marked ${messageIds.length} messages as read by ${userId.substring(0, 8)}`);
  } catch (error: any) {
    console.warn('⚠️ Failed to mark messages as read:', error.message);
    // Don't throw - read receipts should be non-blocking
  }
}

/**
 * Get read count for a message (number of unique users who read it)
 */
export function getReadCount(readBy: string[]): number {
  return readBy.length;
}

