import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DeadlineMeta } from '@/types/index';

dayjs.extend(relativeTime);

interface DeadlineCardProps {
  deadline: DeadlineMeta;
  onMarkDone?: () => void;
  onPress?: () => void;
}

export default function DeadlineCard({ deadline, onMarkDone, onPress }: DeadlineCardProps) {
  const formatDueDate = () => {
    const due = dayjs(deadline.dueDate.toDate());
    const now = dayjs();
    
    // If overdue
    if (due.isBefore(now, 'day')) {
      return {
        text: `Overdue: ${due.format('MMM D')}`,
        color: '#FF3B30',
        isOverdue: true,
      };
    }
    
    // If today
    if (due.isSame(now, 'day')) {
      return {
        text: `Due today at ${due.format('h:mm A')}`,
        color: '#FF9500',
        isOverdue: false,
      };
    }
    
    // If tomorrow
    if (due.diff(now, 'day') === 1) {
      return {
        text: `Due tomorrow at ${due.format('h:mm A')}`,
        color: '#FF9500',
        isOverdue: false,
      };
    }
    
    // If within a week
    if (due.diff(now, 'day') <= 7) {
      return {
        text: `Due ${due.format('ddd, MMM D')}`,
        color: '#666',
        isOverdue: false,
      };
    }
    
    // Future
    return {
      text: `Due ${due.format('MMM D, YYYY')}`,
      color: '#666',
      isOverdue: false,
    };
  };

  const dueInfo = formatDueDate();

  return (
    <TouchableOpacity
      style={[styles.card, deadline.completed && styles.completedCard]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Checkbox icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{deadline.completed ? '✅' : '⬜'}</Text>
      </View>

      {/* Deadline details */}
      <View style={styles.content}>
        <Text style={[styles.title, deadline.completed && styles.completedText]}>
          {deadline.title}
        </Text>
        <Text style={[styles.dueDate, { color: dueInfo.color }, deadline.completed && styles.completedText]}>
          {dueInfo.text}
        </Text>
        {deadline.assignee && (
          <Text style={[styles.assignee, deadline.completed && styles.completedText]}>
            Assigned to: {deadline.assignee}
          </Text>
        )}
      </View>

      {/* Mark done button */}
      {!deadline.completed && onMarkDone && (
        <TouchableOpacity
          style={styles.markDoneButton}
          onPress={(e) => {
            e.stopPropagation();
            onMarkDone();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.markDoneText}>Done</Text>
        </TouchableOpacity>
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
  completedCard: {
    backgroundColor: '#F5F5F5',
    opacity: 0.7,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9E6',
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
  dueDate: {
    fontSize: 13,
    marginBottom: 2,
  },
  assignee: {
    fontSize: 12,
    color: '#999',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  markDoneButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  markDoneText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

