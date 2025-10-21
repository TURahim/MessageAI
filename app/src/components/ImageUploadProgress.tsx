import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  progress: number; // 0-100
}

export default function ImageUploadProgress({ progress }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#007AFF" />
      <View style={styles.textContainer}>
        <Text style={styles.text}>Uploading image...</Text>
        <Text style={styles.progress}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  textContainer: {
    marginLeft: 8,
    flex: 1,
  },
  text: {
    fontSize: 14,
    color: '#666',
  },
  progress: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
});

