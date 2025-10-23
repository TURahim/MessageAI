import React from 'react';
import { View, Text, TouchableOpacity, SectionList, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import EmptyState from './EmptyState';
import { router } from 'expo-router';

dayjs.extend(relativeTime);

export interface Deadline {
  id: string;
  title: string;
  dueDate: Date;
  assignee?: string;
  assigneeName?: string;
  conversationId?: string;
  completed?: boolean;
  createdAt?: Date;
}

interface DeadlineListProps {
  deadlines: Deadline[];
  onDeadlinePress?: (deadline: Deadline) => void;
  onMarkComplete?: (deadlineId: string) => void;
}

interface DeadlineSection {
  title: string;
  data: Deadline[];
  type: 'overdue' | 'upcoming' | 'completed';
}

export default function DeadlineList({
  deadlines,
  onDeadlinePress,
  onMarkComplete,
}: DeadlineListProps) {
  // Group deadlines into sections
  const sections: DeadlineSection[] = React.useMemo(() => {
    const now = dayjs();
    
    const overdue = deadlines.filter(
      (d) => !d.completed && dayjs(d.dueDate).isBefore(now, 'day')
    );
    
    const upcoming = deadlines.filter(
      (d) => !d.completed && !dayjs(d.dueDate).isBefore(now, 'day')
    );
    
    const completed = deadlines.filter((d) => d.completed);

    const result: DeadlineSection[] = [];

    if (overdue.length > 0) {
      result.push({ title: `Overdue (${overdue.length})`, data: overdue, type: 'overdue' });
    }

    if (upcoming.length > 0) {
      result.push({ title: `Upcoming (${upcoming.length})`, data: upcoming, type: 'upcoming' });
    }

    if (completed.length > 0) {
      result.push({ title: `Completed (${completed.length})`, data: completed, type: 'completed' });
    }

    return result;
  }, [deadlines]);

  const formatDueDate = (date: Date) => {
    const due = dayjs(date);
    const now = dayjs();

    if (due.isBefore(now, 'day')) {
      return `Overdue: ${due.fromNow()}`;
    }

    if (due.isSame(now, 'day')) {
      return `Due today at ${due.format('h:mm A')}`;
    }

    if (due.diff(now, 'day') === 1) {
      return `Due tomorrow at ${due.format('h:mm A')}`;
    }

    if (due.diff(now, 'day') <= 7) {
      return `Due ${due.format('ddd, MMM D')}`;
    }

    return `Due ${due.format('MMM D, YYYY')}`;
  };

  const getDueDateColor = (date: Date, completed: boolean) => {
    if (completed) return '#666';
    
    const due = dayjs(date);
    const now = dayjs();

    if (due.isBefore(now, 'day')) {
      return '#FF3B30'; // Overdue - red
    }

    if (due.isSame(now, 'day')) {
      return '#FF9500'; // Today - orange
    }

    return '#666'; // Future - gray
  };

  const handleDeadlinePress = (deadline: Deadline) => {
    if (onDeadlinePress) {
      onDeadlinePress(deadline);
    } else if (deadline.conversationId) {
      // Navigate to the conversation
      router.push(`/chat/${deadline.conversationId}`);
    }
  };

  const renderDeadlineItem = ({ item, section }: { item: Deadline; section: DeadlineSection }) => (
    <TouchableOpacity
      style={[styles.deadlineItem, item.completed && styles.deadlineItemCompleted]}
      onPress={() => handleDeadlinePress(item)}
      activeOpacity={0.7}
    >
      {/* Checkbox */}
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => onMarkComplete?.(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.checkboxIcon}>{item.completed ? '✅' : '⬜'}</Text>
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, item.completed && styles.completedText]}>
          {item.title}
        </Text>
        <Text
          style={[
            styles.dueDate,
            { color: getDueDateColor(item.dueDate, item.completed || false) },
            item.completed && styles.completedText,
          ]}
        >
          {formatDueDate(item.dueDate)}
        </Text>
        {item.assigneeName && (
          <Text style={[styles.assignee, item.completed && styles.completedText]}>
            Assigned to: {item.assigneeName}
          </Text>
        )}
      </View>

      {/* Arrow indicator */}
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: DeadlineSection }) => (
    <View style={[styles.sectionHeader, styles[`${section.type}Header`]]}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  if (sections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="✅"
          title="No tasks yet"
          subtitle="Create your first task to get started"
        />
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      renderItem={renderDeadlineItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled={true}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  overdueHeader: {
    backgroundColor: '#FFEBEE',
  },
  upcomingHeader: {
    backgroundColor: '#E3F2FD',
  },
  completedHeader: {
    backgroundColor: '#E8F5E9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textTransform: 'uppercase',
  },
  deadlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  deadlineItemCompleted: {
    opacity: 0.6,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxIcon: {
    fontSize: 24,
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
  dueDate: {
    fontSize: 14,
    marginBottom: 2,
  },
  assignee: {
    fontSize: 13,
    color: '#999',
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  arrow: {
    fontSize: 24,
    color: '#C7C7CC',
    marginLeft: 8,
  },
});

