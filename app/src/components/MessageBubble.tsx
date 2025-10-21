import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Message } from '@/types/index';
import dayjs from 'dayjs';

interface Props {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  onRetry?: (messageId: string) => void;
}

export default function MessageBubble({ message, isOwn, showSenderName = false, onRetry }: Props) {
  const getTimestamp = () => {
    const timestamp = message.serverTimestamp || message.clientTimestamp;
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return dayjs(date).format('h:mm A');
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case 'sending':
        return '🕐';
      case 'sent':
        return '✓';
      case 'failed':
        return '❌';
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble, message.status === 'failed' && styles.failedBubble]}>
        {showSenderName && !isOwn && (
          <Text style={styles.senderName}>{message.senderId}</Text>
        )}
        <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>
          {message.text}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.timestamp, isOwn ? styles.ownTimestamp : styles.otherTimestamp]}>
            {getTimestamp()}
          </Text>
          {getStatusIcon() && (
            <Text style={styles.status}> {getStatusIcon()}</Text>
          )}
        </View>
        
        {/* Retry button for failed messages */}
        {message.status === 'failed' && isOwn && onRetry && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => onRetry(message.id)}
          >
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontWeight: '600',
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: '#666',
  },
  status: {
    fontSize: 11,
  },
  failedBubble: {
    backgroundColor: '#ff6b6b',
    borderWidth: 1,
    borderColor: '#ff0000',
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

