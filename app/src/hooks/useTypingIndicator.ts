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

    // Debounce: Set typing after 500ms
    typingTimeoutRef.current = setTimeout(async () => {
      if (!isTypingRef.current) {
        await setTyping(conversationId, userId, true);
        isTypingRef.current = true;
      }
    }, 500);

    // Auto-clear after 3s of inactivity
    clearTimeoutRef.current = setTimeout(async () => {
      await stopTyping();
    }, 3000);
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

