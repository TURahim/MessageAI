import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { subscribeToUserPresence } from '@/services/presenceService';
import { PresenceStatus } from '@/types/index';

interface Props {
  userId: string;
  size?: number;
}

export default function OnlineIndicator({ userId, size = 12 }: Props) {
  const [status, setStatus] = useState<PresenceStatus>('offline');

  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = subscribeToUserPresence(
      userId,
      (newStatus: PresenceStatus, lastSeen: Timestamp | null) => {
        setStatus(newStatus);
      },
      (error) => {
        // Silently ignore permission errors (happens after sign out)
        if (error.message?.includes('Missing or insufficient permissions')) {
          return;
        }
        console.warn('Error in OnlineIndicator:', error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  if (status === 'offline') {
    return null; // Don't show indicator for offline users
  }

  return (
    <View
      style={[
        styles.indicator,
        { width: size, height: size, borderRadius: size / 2 },
        status === 'online' ? styles.online : styles.offline
      ]}
    />
  );
}

const styles = StyleSheet.create({
  indicator: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  online: {
    backgroundColor: '#4CAF50', // Green
  },
  offline: {
    backgroundColor: '#9E9E9E', // Gray
  },
});

