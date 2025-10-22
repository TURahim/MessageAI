import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useUserPresence } from '@/hooks/useUserPresence';

interface Props {
  userId: string;
  size?: number;
}

export default function OnlineIndicator({ userId, size = 12 }: Props) {
  const { status } = useUserPresence(userId);

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

