import { useEffect, useRef } from 'react';
import { useConversations } from './useConversations';
import { showMessageNotification } from '@/services/notificationService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Global notification listener that watches ALL conversations
 * Triggers local notifications when new messages arrive in any conversation
 * that the user is not currently viewing
 */
export function useGlobalNotificationListener(currentUserId?: string) {
  const { conversations } = useConversations(currentUserId);
  const previousLastMessages = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!currentUserId || !conversations) return;

    const checkForNewMessages = async () => {
      for (const conv of conversations) {
        const currentLastMessage = conv.lastMessage;
        const previousLastMessage = previousLastMessages.current.get(conv.id);

        // Skip if no lastMessage yet
        if (!currentLastMessage) continue;

        // Detect new message (different ID from previous)
        const isNewMessage = 
          previousLastMessage &&
          currentLastMessage.senderId &&
          currentLastMessage.senderId !== currentUserId &&
          (
            !previousLastMessage.timestamp ||
            currentLastMessage.timestamp?.toMillis() !== previousLastMessage.timestamp?.toMillis()
          );

        if (isNewMessage) {
          console.log('🔔 New message detected in conversation:', conv.id.substring(0, 12));
          
          try {
            // Fetch sender's display name
            const senderDoc = await getDoc(doc(db, 'users', currentLastMessage.senderId));
            const senderName = senderDoc.exists()
              ? senderDoc.data().displayName || 'Someone'
              : 'Someone';

            // Show notification
            // Suppression logic is handled inside showMessageNotification()
            await showMessageNotification(
              conv.id,
              senderName,
              currentLastMessage.text || '📷 Image',
              currentLastMessage.type || 'text'
            );
          } catch (error) {
            console.warn('Failed to show notification for new message:', error);
          }
        }

        // Update tracking
        previousLastMessages.current.set(conv.id, currentLastMessage);
      }
    };

    checkForNewMessages();
  }, [conversations, currentUserId]);

  return null; // This hook doesn't render anything
}

