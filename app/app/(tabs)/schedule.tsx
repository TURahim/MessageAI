import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import CalendarHeader from '@/components/CalendarHeader';
import EventList from '@/components/EventList';
import EventDetailsSheet from '@/components/EventDetailsSheet';
import AddLessonModal from '@/components/AddLessonModal';
import FAB from '@/components/FAB';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Event } from '@/components/EventListItem';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types/index';
import dayjs from 'dayjs';

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // null = show all
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);

  // Fetch user role data
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

  // Fetch events
  const { events: allEvents, loading } = useEvents(user?.uid || null, undefined);

  // Filter events based on role
  const roleFilteredEvents = useMemo(() => {
    if (!userData?.role) return allEvents;

    // Tutors: Show all events they created (where they are the tutor)
    // Parents: Show events where they are in parentIds
    if (userData.role === 'tutor') {
      // For now, show all events (in real implementation, filter by tutorId === user.uid)
      return allEvents;
    } else {
      // Parent: Show events where user is participant
      // For now, show all events (in real implementation, filter by parentIds.includes(user.uid))
      return allEvents;
    }
  }, [allEvents, userData]);

  // Filter events based on selected date
  const filteredEvents = useMemo(() => {
    if (!selectedDate) return roleFilteredEvents; // Show all when no date selected
    
    return roleFilteredEvents.filter(event => 
      dayjs(event.startTime).isSame(selectedDate, 'day')
    );
  }, [roleFilteredEvents, selectedDate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleShowAll = () => {
    setSelectedDate(null);
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
        onShowAll={handleShowAll}
        events={roleFilteredEvents}
      />

      {/* Event list grouped by day */}
      <EventList
        events={filteredEvents}
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

      {/* Floating action button - Only show for tutors */}
      {userData?.role === 'tutor' && (
        <FAB
          onPress={handleOpenAddLesson}
          icon="+"
          label="Add Lesson"
        />
      )}
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

