import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { EventMeta } from '@/types/index';

interface EventCardProps {
  event: EventMeta;
  onPress?: () => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  const formatTimeRange = () => {
    const start = dayjs(event.startTime.toDate());
    const end = dayjs(event.endTime.toDate());
    
    // If same day, show: "Mon, Jan 15 • 3:00 PM - 4:30 PM"
    if (start.isSame(end, 'day')) {
      return `${start.format('ddd, MMM D')} • ${start.format('h:mm A')} - ${end.format('h:mm A')}`;
    }
    // If different days, show full dates
    return `${start.format('MMM D, h:mm A')} - ${end.format('MMM D, h:mm A')}`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Calendar icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📅</Text>
      </View>

      {/* Event details */}
      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.time}>{formatTimeRange()}</Text>
        {event.participants && event.participants.length > 0 && (
          <Text style={styles.participants}>
            {event.participants.length} {event.participants.length === 1 ? 'participant' : 'participants'}
          </Text>
        )}
      </View>

      {/* Action hint */}
      {onPress && (
        <View style={styles.actionHint}>
          <Text style={styles.actionText}>View →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  time: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  participants: {
    fontSize: 12,
    color: '#999',
  },
  actionHint: {
    paddingLeft: 8,
  },
  actionText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
});

