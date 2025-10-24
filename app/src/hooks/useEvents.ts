import { useState, useEffect } from 'react';
import { Event } from '@/components/EventListItem';
import dayjs from 'dayjs';

/**
 * Hook to fetch events for the current user
 * Currently returns mock data - will be replaced with real Firestore queries
 * when backend collections are set up
 * 
 * @param userId - Current user's ID
 * @param selectedDate - Optional date to filter events
 * @returns Array of events and loading state
 */
export function useEvents(userId: string | null, selectedDate?: Date) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // BEGIN MOCK_EVENTS
    // TODO: Replace this entire block with Firestore onSnapshot listener
    // See JellyDMTasklist.md PR6.1 for replacement code
    
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real Firestore listener
    const { collection: firestoreCollection, query: firestoreQuery, where, orderBy, onSnapshot } = require('firebase/firestore');
    const { db } = require('@/lib/firebase');

    const eventsRef = firestoreCollection(db, 'events');
    const q = firestoreQuery(
      eventsRef,
      where('participants', 'array-contains', userId),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: any) => {
        const eventsData: Event[] = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          title: doc.data().title,
          startTime: doc.data().startTime.toDate(),
          endTime: doc.data().endTime.toDate(),
          participants: doc.data().participants,
          participantNames: doc.data().participantNames,
          status: doc.data().status,
          color: doc.data().status === 'confirmed' ? '#4CAF50' : doc.data().status === 'declined' ? '#F44336' : '#FF9800',
        }));

        setEvents(eventsData);
        setLoading(false);
        console.log(`✅ Loaded ${eventsData.length} events from Firestore`);
      },
      (error: Error) => {
        console.error('❌ Error loading events:', error);
        setLoading(false);
      }
    );

    // Cleanup to prevent memory leaks
    return () => unsubscribe();
    
    // FALLBACK: Keep mock data as commented fallback
    /* const loadEvents = async () => {
      setLoading(true);

      // Mock delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate mock events for the next 2 weeks
      const mockEvents: Event[] = [
        {
          id: 'event-1',
          title: 'Math Tutoring',
          startTime: dayjs().add(1, 'day').hour(15).minute(0).toDate(),
          endTime: dayjs().add(1, 'day').hour(16).minute(30).toDate(),
          participants: ['user-1', 'user-2'],
          participantNames: ['Sarah Johnson', 'You'],
          status: 'confirmed',
          color: '#4CAF50',
        },
        {
          id: 'event-2',
          title: 'Physics Session',
          startTime: dayjs().add(2, 'day').hour(14).minute(0).toDate(),
          endTime: dayjs().add(2, 'day').hour(15).minute(30).toDate(),
          participants: ['user-1', 'user-3'],
          participantNames: ['Michael Chen'],
          status: 'pending',
          color: '#FF9800',
        },
        {
          id: 'event-3',
          title: 'Chemistry Review',
          startTime: dayjs().add(3, 'day').hour(16).minute(0).toDate(),
          endTime: dayjs().add(3, 'day').hour(17).minute(0).toDate(),
          participants: ['user-1', 'user-4', 'user-5'],
          participantNames: ['Emily Davis', 'John Smith'],
          status: 'confirmed',
          color: '#4CAF50',
        },
        {
          id: 'event-4',
          title: 'English Literature',
          startTime: dayjs().add(5, 'day').hour(10).minute(0).toDate(),
          endTime: dayjs().add(5, 'day').hour(11).minute(30).toDate(),
          participants: ['user-1', 'user-6'],
          participantNames: ['Anna Williams'],
          status: 'pending',
          color: '#FF9800',
        },
        {
          id: 'event-5',
          title: 'Biology Lab Prep',
          startTime: dayjs().add(7, 'day').hour(13).minute(0).toDate(),
          endTime: dayjs().add(7, 'day').hour(14).minute(30).toDate(),
          participants: ['user-1', 'user-7', 'user-8'],
          participantNames: ['David Lee', 'Sophie Martinez', 'You'],
          status: 'confirmed',
          color: '#4CAF50',
        },
        {
          id: 'event-6',
          title: 'History Discussion',
          startTime: dayjs().add(8, 'day').hour(15).minute(0).toDate(),
          endTime: dayjs().add(8, 'day').hour(16).minute(0).toDate(),
          participants: ['user-1', 'user-9'],
          participantNames: ['Lisa Brown'],
          status: 'declined',
          color: '#F44336',
        },
        {
          id: 'event-7',
          title: 'SAT Prep Session',
          startTime: dayjs().add(9, 'day').hour(9).minute(0).toDate(),
          endTime: dayjs().add(9, 'day').hour(11).minute(0).toDate(),
          participants: ['user-1', 'user-10'],
          participantNames: ['Tom Anderson'],
          status: 'confirmed',
          color: '#4CAF50',
        },
      ];

      // Filter by selected date if provided
      let filteredEvents = mockEvents;
      if (selectedDate) {
        const selectedDay = dayjs(selectedDate);
        filteredEvents = mockEvents.filter(event =>
          dayjs(event.startTime).isSame(selectedDay, 'day')
        );
      }

      setEvents(filteredEvents);
      setLoading(false);
    };

    if (userId) {
      loadEvents();
    } else {
      setEvents([]);
      setLoading(false);
    } */
    // END MOCK_EVENTS
  }, [userId]);

  return { events, loading };
}

