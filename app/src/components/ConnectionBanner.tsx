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
    <View style={styles.banner} testID="offline-banner">
      <Text style={styles.text}>{getMessage()}</Text>
      <Text style={styles.subText}>Messages are queued and will sync automatically</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontWeight: '500',
  },
});

