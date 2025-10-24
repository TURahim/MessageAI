import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';

export interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  participants: string[];
  participantNames?: string[];
  status?: 'pending' | 'confirmed' | 'declined';
  hasConflict?: boolean; // Indicates scheduling conflict
  color?: string;
  conversationId?: string; // Link to conversation (PR5)
}

interface EventListItemProps {
  event: Event;
  onPress: (event: Event) => void;
}

export default function EventListItem({ event, onPress }: EventListItemProps) {
  const getStatusColor = () => {
    switch (event.status) {
      case 'confirmed':
        return '#4CAF50';
      case 'declined':
        return '#F44336';
      case 'pending':
        return '#FF9800';
      default:
        return '#007AFF';
    }
  };

  const formatTime = () => {
    const start = dayjs(event.startTime);
    const end = dayjs(event.endTime);
    return `${start.format('h:mm A')} - ${end.format('h:mm A')}`;
  };

  const getParticipantsText = () => {
    const names = event.participantNames || [];
    if (names.length === 0) return `${event.participants.length} participants`;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return `${names[0]} & ${names.length - 1} others`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
    >
      {/* Color indicator */}
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />

      {/* Event content */}
      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.time}>{formatTime()}</Text>
        <Text style={styles.participants}>{getParticipantsText()}</Text>
      </View>

      <View style={styles.badges}>
        {/* Status badge */}
        {event.status && (
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </Text>
          </View>
        )}
        
        {/* Conflict badge */}
        {event.hasConflict && (
          <View style={styles.conflictBadge}>
            <Text style={styles.conflictIcon}>⚠️</Text>
            <Text style={styles.conflictText}>Conflict</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  indicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  participants: {
    fontSize: 13,
    color: '#999',
  },
  badges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  conflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  conflictIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  conflictText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E65100',
  },
});

