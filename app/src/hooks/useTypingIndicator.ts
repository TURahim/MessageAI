import { useEffect, useRef, useCallback } from 'react';
import { setTyping, clearTyping } from '@/services/typingService';

/**
 * Hook to manage typing indicator with debouncing
 * - Debounce 500ms: trigger typing=true after user types
 * - Clear after 3s of inactivity
 * - Set typing=false on unmount
 */
export function useTypingIndicator(conversationId: string, userId: string | null) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }
  }, []);

  // Stop typing
  const stopTyping = useCallback(async () => {
    if (!userId || !conversationId) return;
    
    if (isTypingRef.current) {
      await clearTyping(conversationId, userId);
      isTypingRef.current = false;
    }
    cleanup();
  }, [userId, conversationId, cleanup]);

  // Start typing (called when user types)
  const startTyping = useCallback(async () => {
    if (!userId || !conversationId) return;

    // Clear any existing timeouts
    cleanup();

    // Set typing immediately if not already typing, or after short debounce
    if (!isTypingRef.current) {
      typingTimeoutRef.current = setTimeout(async () => {
        await setTyping(conversationId, userId, true);
        isTypingRef.current = true;
      }, 200); // Reduced from 500ms to 200ms for faster response
    } else {
      // Already typing, just update the timestamp
      await setTyping(conversationId, userId, true);
    }

    // Auto-clear after 5s of inactivity (increased from 3s)
    clearTimeoutRef.current = setTimeout(async () => {
      await stopTyping();
    }, 5000);
  }, [userId, conversationId, cleanup, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return {
    startTyping,
    stopTyping,
  };
}

