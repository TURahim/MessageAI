import { useCallback, useRef } from 'react';
import { ViewToken } from 'react-native';
import { markMessagesAsRead } from '@/services/readReceiptService';
import { Message } from '@/types/message';

/**
 * Hook to automatically mark messages as read when they become visible
 * Uses FlashList's onViewableItemsChanged callback
 */
export function useMarkAsRead(conversationId: string, currentUserId: string) {
  const markedAsReadRef = useRef<Set<string>>(new Set());

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    // Filter for messages that:
    // 1. Are from other users (not sent by current user)
    // 2. Haven't been read by current user yet
    // 3. Haven't been marked as read in this session yet (to avoid duplicate calls)
    const messagesToMark = viewableItems
      .map(item => item.item as Message)
      .filter(message => 
        message.senderId !== currentUserId &&
        !message.readBy.includes(currentUserId) &&
        !markedAsReadRef.current.has(message.id)
      );

    if (messagesToMark.length > 0) {
      const messageIds = messagesToMark.map(m => m.id);
      
      // Mark them in our ref to avoid duplicate calls
      messageIds.forEach(id => markedAsReadRef.current.add(id));
      
      // Mark as read in Firestore
      markMessagesAsRead(conversationId, messageIds, currentUserId).catch(err => {
        console.warn('Failed to mark messages as read:', err);
        // Remove from ref so we can retry later
        messageIds.forEach(id => markedAsReadRef.current.delete(id));
      });
    }
  }, [conversationId, currentUserId]);

  // Configuration for FlashList
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // Mark as read when 50% visible
    minimumViewTime: 500, // Must be visible for 500ms
  }).current;

  return {
    onViewableItemsChanged,
    viewabilityConfig,
  };
}

