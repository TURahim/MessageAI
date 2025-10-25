import React from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import EventListItem, { Event } from './EventListItem';
import EmptyState from './EmptyState';

interface EventListProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  selectedDate?: Date | null;
}

interface EventSection {
  title: string;
  data: Event[];
  date: string; // ISO date string for grouping
}

export default function EventList({ events, onEventPress, selectedDate }: EventListProps) {
  // Group events by day
  const groupEventsByDay = (): EventSection[] => {
    if (events.length === 0) return [];

    const grouped = events.reduce((acc, event) => {
      const dateKey = dayjs(event.startTime).format('YYYY-MM-DD');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {} as Record<string, Event[]>);

    // Convert to sections array and sort by date
    return Object.entries(grouped)
      .map(([date, dayEvents]) => ({
        title: formatSectionTitle(date),
        data: dayEvents.sort(
          (a, b) => a.startTime.getTime() - b.startTime.getTime()
        ),
        date,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const formatSectionTitle = (dateStr: string): string => {
    const date = dayjs(dateStr);
    const today = dayjs();
    const tomorrow = today.add(1, 'day');

    if (date.isSame(today, 'day')) {
      return 'Today';
    }
    if (date.isSame(tomorrow, 'day')) {
      return 'Tomorrow';
    }
    if (date.isSame(today, 'year')) {
      return date.format('dddd, MMMM D');
    }
    return date.format('dddd, MMMM D, YYYY');
  };

  const sections = groupEventsByDay();

  if (sections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="📅"
          title="No sessions scheduled"
          subtitle={
            selectedDate
              ? `No sessions on ${dayjs(selectedDate).format('MMM D, YYYY')}`
              : 'Tap + to add your first lesson'
          }
        />
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      renderItem={({ item }) => (
        <EventListItem event={item} onPress={onEventPress} />
      )}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionLine} />
        </View>
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled={false}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginRight: 12,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
});

