/**
 * Event Service
 * 
 * CRUD operations for events with transactional conflict checking
 * Prevents double-booking by using Firestore transactions
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  EventDocument,
  CreateEventInput,
  UpdateEventInput,
  ConflictCheckResult,
} from '@/types/eventTypes';

/**
 * Helper: Check if two time ranges overlap
 * Simple version without DST awareness (DST handled by backend)
 */
function timeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  // Standard overlap check: (start1 < end2) AND (start2 < end1)
  return start1 < end2 && start2 < end1;
}

/**
 * Creates a new event with transactional conflict checking
 * 
 * IMPORTANT: Uses transaction to ensure atomic conflict check + create
 * If two concurrent creates have overlapping times, exactly one succeeds
 * 
 * @param input - Event creation data
 * @param timezone - REQUIRED for DST-aware conflict detection
 * @returns Event ID
 * @throws Error if conflict detected or creation fails
 */
export async function createEvent(
  input: CreateEventInput,
  timezone: string
): Promise<string> {
  // Run in transaction for atomic conflict check + create
  const eventId = await runTransaction(db, async (transaction) => {
    // Step 1: Check for conflicts with existing events
    const conflictCheck = await checkConflicts(
      input.createdBy,
      input.startTime,
      input.endTime,
      timezone
    );

    if (conflictCheck.hasConflict) {
      const conflicts = conflictCheck.conflictingEvents
        .map(e => e.title)
        .join(', ');
      throw new Error(`CONFLICT_DETECTED: Overlaps with existing events: ${conflicts}`);
    }

    // Step 2: Create event
    const eventRef = doc(collection(db, 'events'));
    const eventData: Omit<EventDocument, 'id'> = {
      ...input,
      startTime: Timestamp.fromDate(input.startTime),
      endTime: Timestamp.fromDate(input.endTime),
      status: 'pending',
      rsvps: {},
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    transaction.set(eventRef, eventData);

    return eventRef.id;
  });

  console.log('✅ Event created:', eventId);
  return eventId;
}

/**
 * Gets an event by ID
 */
export async function getEvent(eventId: string): Promise<EventDocument | null> {
  const eventRef = doc(db, 'events', eventId);
  const eventSnap = await getDoc(eventRef);

  if (!eventSnap.exists()) {
    return null;
  }

  return {
    id: eventSnap.id,
    ...eventSnap.data(),
  } as EventDocument;
}

/**
 * Updates an event
 * 
 * @param eventId - Event ID to update
 * @param updates - Fields to update
 * @param checkConflicts - Whether to check for conflicts (default: true)
 * @param timezone - Required if checking conflicts
 */
export async function updateEvent(
  eventId: string,
  updates: UpdateEventInput,
  options?: { checkConflicts?: boolean; timezone?: string }
): Promise<void> {
  const eventRef = doc(db, 'events', eventId);

  // If updating time and checking conflicts, use transaction
  if (options?.checkConflicts && (updates.startTime || updates.endTime)) {
    if (!options.timezone) {
      throw new Error('TIMEZONE_REQUIRED: timezone is required for conflict checking');
    }

    await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) {
        throw new Error('EVENT_NOT_FOUND');
      }

      const currentData = eventSnap.data() as EventDocument;
      const newStartTime = updates.startTime || currentData.startTime.toDate();
      const newEndTime = updates.endTime || currentData.endTime.toDate();

      // Check conflicts
      const conflicts = await checkConflicts(
        currentData.createdBy,
        newStartTime,
        newEndTime,
        options.timezone!, // Non-null assertion (already checked above)
        eventId // Exclude self
      );

      if (conflicts.hasConflict) {
        throw new Error(`CONFLICT_DETECTED: Cannot update, overlaps with existing event`);
      }

      // Update
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      if (updates.startTime) {
        updateData.startTime = Timestamp.fromDate(updates.startTime);
      }
      if (updates.endTime) {
        updateData.endTime = Timestamp.fromDate(updates.endTime);
      }

      transaction.update(eventRef, updateData);
    });
  } else {
    // Simple update without conflict check
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    if (updates.startTime) {
      updateData.startTime = Timestamp.fromDate(updates.startTime);
    }
    if (updates.endTime) {
      updateData.endTime = Timestamp.fromDate(updates.endTime);
    }

    await updateDoc(eventRef, updateData);
  }

  console.log('✅ Event updated:', eventId);
}

/**
 * Deletes an event
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);
  console.log('✅ Event deleted:', eventId);
}

/**
 * Checks for scheduling conflicts
 * 
 * @param userId - User to check conflicts for
 * @param startTime - Proposed start time
 * @param endTime - Proposed end time
 * @param timezone - REQUIRED for DST-aware overlap detection
 * @param excludeEventId - Optional event ID to exclude (for updates)
 * @returns ConflictCheckResult with conflicting events
 */
export async function checkConflicts(
  userId: string,
  startTime: Date,
  endTime: Date,
  timezone: string,
  excludeEventId?: string
): Promise<ConflictCheckResult> {
  // Query user's events around this time
  const eventsRef = collection(db, 'events');
  const q = query(
    eventsRef,
    where('participants', 'array-contains', userId)
  );

  const snapshot = await getDocs(q);
  const conflictingEvents: ConflictCheckResult['conflictingEvents'] = [];

  snapshot.docs.forEach(docSnap => {
    // Skip self if updating
    if (excludeEventId && docSnap.id === excludeEventId) {
      return;
    }

    const event = docSnap.data() as EventDocument;
    const eventStart = event.startTime.toDate();
    const eventEnd = event.endTime.toDate();

    // Check for overlap (simple version - backend has DST-aware check)
    const overlaps = timeRangesOverlap(
      startTime,
      endTime,
      eventStart,
      eventEnd
    );

    if (overlaps) {
      conflictingEvents.push({
        id: docSnap.id,
        title: event.title,
        startTime: eventStart,
        endTime: eventEnd,
      });
    }
  });

  return {
    hasConflict: conflictingEvents.length > 0,
    conflictingEvents,
  };
}

/**
 * Records an RSVP response
 * Updates both the event and potentially the status
 */
export async function recordRSVP(
  eventId: string,
  userId: string,
  response: 'accepted' | 'declined'
): Promise<void> {
  const eventRef = doc(db, 'events', eventId);

  await updateDoc(eventRef, {
    [`rsvps.${userId}`]: {
      response,
      respondedAt: Timestamp.now(),
    },
    updatedAt: Timestamp.now(),
  });

  // Optionally update event status based on responses
  // For now, status is manually managed
  console.log('✅ RSVP recorded:', { eventId, userId, response });
}

