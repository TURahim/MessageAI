/**
 * Conflict Handler
 * 
 * PR10: Conflict Engine
 * 
 * Orchestrates the complete conflict detection and resolution flow:
 * 1. Detects conflicts when events are created
 * 2. Generates AI-powered alternatives
 * 3. Posts conflict warnings to conversation
 * 4. Handles user selection of alternatives
 */

import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import {
  generateAlternatives,
  postConflictWarning,
  type ConflictContext,
  type AlternativeTimeSlot,
} from './conflictResolver';

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictMessage?: string;
  alternatives?: AlternativeTimeSlot[];
  eventId?: string;
}

/**
 * Handle conflict detection for new event
 * 
 * Called when schedule.create_event tool is executed
 * If conflicts detected, generates alternatives and posts warning
 * 
 * @param eventData - Event being created
 * @param conversationId - Conversation context
 * @param timezone - User's timezone
 * @returns Conflict detection result
 */
export async function handleEventConflict(
  eventData: {
    title: string;
    startTime: Date;
    endTime: Date;
    participants: string[];
    createdBy: string;
  },
  conversationId: string,
  timezone: string
): Promise<ConflictDetectionResult> {
  logger.info('🔍 Checking for scheduling conflicts', {
    title: eventData.title,
    startTime: eventData.startTime.toISOString(),
    participants: eventData.participants.length,
  });

  try {
    // Query for conflicting events
    const conflictingEvents = await findConflictingEvents(
      eventData.createdBy,
      eventData.startTime,
      eventData.endTime
    );

    if (conflictingEvents.length === 0) {
      logger.info('✅ No conflicts detected');
      return { hasConflict: false };
    }

    logger.warn('⚠️ Conflicts detected', {
      count: conflictingEvents.length,
      titles: conflictingEvents.map(e => e.title),
    });

    // Calculate session duration
    const duration = Math.round(
      (eventData.endTime.getTime() - eventData.startTime.getTime()) / (60 * 1000)
    );

    // Generate AI alternatives
    const context: ConflictContext = {
      proposedStartTime: eventData.startTime,
      proposedEndTime: eventData.endTime,
      conflictingEvents,
      userId: eventData.createdBy,
      timezone,
      sessionDuration: duration,
    };

    const alternatives = await generateAlternatives(context);

    if (alternatives.length === 0) {
      logger.warn('⚠️ No alternatives generated, using conflict message only');
    }

    // Build conflict message
    const conflictMessage = buildConflictMessage(
      eventData.title,
      conflictingEvents,
      alternatives
    );

    // Post conflict warning to conversation
    await postConflictWarning(
      conversationId,
      conflictMessage,
      alternatives
    );

    return {
      hasConflict: true,
      conflictMessage,
      alternatives,
    };
  } catch (error: any) {
    logger.error('❌ Error handling conflict', {
      error: error.message,
      stack: error.stack,
    });

    return { hasConflict: false };
  }
}

/**
 * Find events that conflict with proposed time
 */
async function findConflictingEvents(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<Array<{ id: string; title: string; startTime: Date; endTime: Date }>> {
  try {
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('participants', 'array-contains', userId)
      .get();

    const conflicts: Array<{ id: string; title: string; startTime: Date; endTime: Date }> = [];

    eventsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const eventStart = data.startTime.toDate();
      const eventEnd = data.endTime.toDate();

      // Check for overlap
      if (timeRangesOverlap(startTime, endTime, eventStart, eventEnd)) {
        conflicts.push({
          id: doc.id,
          title: data.title || 'Unnamed event',
          startTime: eventStart,
          endTime: eventEnd,
        });
      }
    });

    return conflicts;
  } catch (error: any) {
    logger.error('❌ Error finding conflicts', { error: error.message });
    return [];
  }
}

/**
 * Helper: Check if two time ranges overlap
 */
function timeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Build user-friendly conflict message
 */
function buildConflictMessage(
  proposedTitle: string,
  conflicts: Array<{ title: string; startTime: Date; endTime: Date }>,
  alternatives: AlternativeTimeSlot[]
): string {
  const conflictCount = conflicts.length;
  const conflictList = conflicts
    .slice(0, 2) // Show max 2 conflicts
    .map(c => `"${c.title}" (${formatTime(c.startTime)})`)
    .join(' and ');

  const moreText = conflictCount > 2 ? ` and ${conflictCount - 2} more` : '';

  let message = `⚠️ Scheduling conflict detected for "${proposedTitle}".\n\n`;
  message += `This overlaps with ${conflictList}${moreText}.\n\n`;

  if (alternatives.length > 0) {
    message += `I've found ${alternatives.length} alternative time${alternatives.length > 1 ? 's' : ''} that work better. `;
    message += `Tap one below to reschedule automatically.`;
  } else {
    message += `Please choose a different time that doesn't conflict with your schedule.`;
  }

  return message;
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Handle user selecting an alternative time slot
 * 
 * Called when user taps an alternative in ConflictWarning component
 * 
 * @param conflictId - Original event/conflict ID
 * @param alternativeIndex - Index of selected alternative
 * @param conversationId - Conversation context
 * @returns Success boolean
 */
export async function handleAlternativeSelection(
  conflictId: string,
  alternativeIndex: number,
  conversationId: string
): Promise<boolean> {
  logger.info('👆 User selected alternative', {
    conflictId: conflictId.substring(0, 8),
    alternativeIndex,
  });

  try {
    // Find the conflict message to get alternatives
    const messagesSnapshot = await admin.firestore()
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .where('meta.conflict.conflictId', '==', conflictId)
      .orderBy('serverTimestamp', 'desc')
      .limit(1)
      .get();

    if (messagesSnapshot.empty) {
      logger.error('❌ Conflict message not found');
      return false;
    }

    const conflictMessage = messagesSnapshot.docs[0].data();
    const alternatives = conflictMessage.meta?.conflict?.suggestedAlternatives;

    if (!alternatives || alternativeIndex >= alternatives.length) {
      logger.error('❌ Alternative not found', {
        alternativeIndex,
        availableCount: alternatives?.length || 0,
      });
      return false;
    }

    const selectedAlt = alternatives[alternativeIndex];
    const newStartTime = selectedAlt.startTime.toDate();
    const newEndTime = selectedAlt.endTime.toDate();

    // If conflictId is an event ID, update that event
    // Otherwise, this was a warning before creation - handle accordingly
    if (conflictId.startsWith('event-')) {
      const eventId = conflictId.replace('event-', '');
      
      // Update event to new time
      await admin.firestore()
        .collection('events')
        .doc(eventId)
        .update({
          startTime: admin.firestore.Timestamp.fromDate(newStartTime),
          endTime: admin.firestore.Timestamp.fromDate(newEndTime),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      logger.info('✅ Event rescheduled', {
        eventId,
        newStartTime: newStartTime.toISOString(),
      });

      // Post confirmation message
      await admin.firestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add({
          senderId: 'assistant',
          senderName: 'JellyDM Assistant',
          type: 'text',
          text: `✅ Session rescheduled to ${formatTime(newStartTime)}`,
          clientTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent',
          retryCount: 0,
          readBy: [],
          readCount: 0,
          meta: {
            role: 'assistant',
          },
        });
    }

    return true;
  } catch (error: any) {
    logger.error('❌ Error handling alternative selection', {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * Monitor for conflicts in existing schedule
 * Called periodically to detect newly created conflicts
 * 
 * @param userId - User to check
 * @param timezone - User's timezone
 * @returns Array of detected conflicts
 */
export async function monitorScheduleConflicts(
  userId: string,
  timezone: string
): Promise<Array<{
  event1: { id: string; title: string };
  event2: { id: string; title: string };
  overlapMinutes: number;
}>> {
  try {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('participants', 'array-contains', userId)
      .where('startTime', '>=', admin.firestore.Timestamp.fromDate(now))
      .where('startTime', '<=', admin.firestore.Timestamp.fromDate(twoWeeksFromNow))
      .orderBy('startTime', 'asc')
      .get();

    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title || 'Unnamed event',
      startTime: doc.data().startTime.toDate(),
      endTime: doc.data().endTime.toDate(),
    }));

    const conflicts: Array<{
      event1: { id: string; title: string };
      event2: { id: string; title: string };
      overlapMinutes: number;
    }> = [];

    // Check for overlaps between all pairs
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        if (timeRangesOverlap(
          event1.startTime,
          event1.endTime,
          event2.startTime,
          event2.endTime
        )) {
          // Calculate overlap duration
          const overlapStart = event1.startTime > event2.startTime ? event1.startTime : event2.startTime;
          const overlapEnd = event1.endTime < event2.endTime ? event1.endTime : event2.endTime;
          const overlapMinutes = Math.round(
            (overlapEnd.getTime() - overlapStart.getTime()) / (60 * 1000)
          );

          conflicts.push({
            event1: { id: event1.id, title: event1.title },
            event2: { id: event2.id, title: event2.title },
            overlapMinutes,
          });
        }
      }
    }

    if (conflicts.length > 0) {
      logger.warn('⚠️ Schedule conflicts detected', {
        userId: userId.substring(0, 8),
        conflictCount: conflicts.length,
      });
    }

    return conflicts;
  } catch (error: any) {
    logger.error('❌ Error monitoring conflicts', {
      error: error.message,
    });
    return [];
  }
}

