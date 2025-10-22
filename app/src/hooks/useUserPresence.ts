import { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { subscribeToUserPresence } from '@/services/presenceService';
import { PresenceStatus } from '@/types/index';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface PresenceInfo {
  status: PresenceStatus;
  lastSeen: Timestamp | null;
  displayText: string;
}

/**
 * Hook to get real-time user presence with consistent status calculation
 * Returns: { status, lastSeen, displayText }
 */
export function useUserPresence(userId: string): PresenceInfo {
  const [status, setStatus] = useState<PresenceStatus>('offline');
  const [lastSeen, setLastSeen] = useState<Timestamp | null>(null);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserPresence(
      userId,
      (newStatus, newLastSeen) => {
        setStatus(newStatus);
        setLastSeen(newLastSeen);
      },
      (error) => {
        // Silently ignore permission errors
        if (error.message?.includes('Missing or insufficient permissions')) {
          return;
        }
        console.warn('Error in useUserPresence:', error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Generate display text
  const displayText = status === 'online' 
    ? 'Online' 
    : lastSeen 
      ? `Last seen ${dayjs(lastSeen.toDate()).fromNow()}`
      : 'Offline';

  return { status, lastSeen, displayText };
}

