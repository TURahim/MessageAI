import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { Message } from '@/types/index';

interface AssistantBubbleProps {
  message: Message;
  children?: React.ReactNode; // For rendering inline cards
}

export default function AssistantBubble({ message, children }: AssistantBubbleProps) {
  const getTimestamp = () => {
    const timestamp = message.serverTimestamp || message.clientTimestamp;
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return dayjs(date).format('h:mm A');
  };

  const isSystemMessage = message.senderId === 'assistant' || message.meta?.role === 'assistant' || message.meta?.role === 'system';

  return (
    <View style={styles.container}>
      {/* Assistant icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>✨</Text>
      </View>

      {/* Message content */}
      <View style={styles.bubble}>
        {/* Assistant label */}
        <View style={styles.header}>
          <Text style={styles.label}>AI Assistant</Text>
          <Text style={styles.timestamp}>{getTimestamp()}</Text>
        </View>

        {/* Message text */}
        {message.text && (
          <Text style={styles.text}>{message.text}</Text>
        )}

        {/* Inline cards (EventCard, DeadlineCard, etc.) */}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  icon: {
    fontSize: 18,
  },
  bubble: {
    flex: 1,
    backgroundColor: '#F8F5FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D4FF',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    color: '#374151',
  },
});

