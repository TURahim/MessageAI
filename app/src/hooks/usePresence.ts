import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { setOnline, setOffline, updatePresence } from '@/services/presenceService';
import { useAuth } from './useAuth';

/**
 * Hook to manage user presence with heartbeat pattern
 * - Sets online on mount
 * - Updates presence every 30s
 * - Sets offline on unmount
 * - Handles app state changes (background/foreground)
 */
export function usePresence(activeConversationId: string | null | undefined = null) {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Skip entirely if activeConversationId is undefined (user not authenticated)
    if (activeConversationId === undefined || !user?.uid) return;

    // Set online on mount
    setOnline(user.uid, activeConversationId);

    // Set up 30-second heartbeat
    intervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        updatePresence(user.uid, 'online', activeConversationId);
      }
    }, 30000); // 30 seconds

    // Handle app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === 'active' && previousState !== 'active') {
        // App came to foreground
        setOnline(user.uid, activeConversationId);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background
        setOffline(user.uid);
      }
    });

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
      setOffline(user.uid);
    };
  }, [user?.uid, activeConversationId]);

  // Update active conversation when it changes
  useEffect(() => {
    if (activeConversationId === undefined || !user?.uid) return;
    
    updatePresence(user.uid, 'online', activeConversationId === null ? null : activeConversationId);
  }, [activeConversationId, user?.uid]);
}

