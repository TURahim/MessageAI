import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

interface TutorCodeCardProps {
  tutorCode: string;
  tutorName?: string;
}

export default function TutorCodeCard({ tutorCode, tutorName }: TutorCodeCardProps) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(tutorCode);
    Alert.alert('Copied!', 'Tutor code copied to clipboard');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${tutorName ? `${tutorName}'s` : 'my'} tutoring sessions!\n\nUse code: ${tutorCode}\n\nDownload MessageAI and enter this code to connect.`,
        title: 'My Tutor Code',
      });
    } catch (error) {
      console.error('Error sharing code:', error);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="key" size={24} color="#007AFF" />
        <Text style={styles.headerText}>Your Tutor Code</Text>
      </View>

      <Text style={styles.code}>{tutorCode}</Text>
      <Text style={styles.subtitle}>Share this code with parents to connect</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
          <Ionicons name="copy-outline" size={20} color="#007AFF" />
          <Text style={styles.copyButtonText}>Copy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  code: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 3,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    gap: 6,
  },
  copyButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    gap: 6,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

