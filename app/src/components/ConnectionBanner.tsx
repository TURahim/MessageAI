import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function ConnectionBanner() {
  const { isOnline, isConnected, isInternetReachable } = useNetworkStatus();

  // Don't show banner if online
  if (isOnline) {
    return null;
  }

  // Determine message based on network state
  const getMessage = () => {
    if (!isConnected) {
      return '📡 No internet connection';
    }
    if (!isInternetReachable) {
      return '📡 Connected but no internet access';
    }
    return '📡 Connection issues';
  };

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{getMessage()}</Text>
      <Text style={styles.subText}>Messages will send when connection is restored</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#ff9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e68900',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
  },
});

