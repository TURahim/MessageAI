import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import CalendarHeader from '@/components/CalendarHeader';
import EventList from '@/components/EventList';
import EventDetailsSheet from '@/components/EventDetailsSheet';
import AddLessonModal from '@/components/AddLessonModal';
import FAB from '@/components/FAB';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Event } from '@/components/EventListItem';

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);

  // Fetch events (currently mock data)
  const { events, loading } = useEvents(user?.uid || null, undefined);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleCloseEventDetails = () => {
    setShowEventDetails(false);
    setSelectedEvent(null);
  };

  const handleOpenAddLesson = () => {
    setShowAddLesson(true);
  };

  const handleCloseAddLesson = () => {
    setShowAddLesson(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Loading schedule..." size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Calendar header with week navigation */}
      <CalendarHeader
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
      />

      {/* Event list grouped by day */}
      <EventList
        events={events}
        onEventPress={handleEventPress}
        selectedDate={selectedDate}
      />

      {/* Event details modal */}
      <EventDetailsSheet
        visible={showEventDetails}
        event={selectedEvent}
        onClose={handleCloseEventDetails}
      />

      {/* Add lesson modal */}
      <AddLessonModal
        visible={showAddLesson}
        onClose={handleCloseAddLesson}
      />

      {/* Floating action button */}
      <FAB
        onPress={handleOpenAddLesson}
        icon="+"
        label="Add Lesson"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

