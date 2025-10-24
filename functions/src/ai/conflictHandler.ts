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
  const correlationId = `conflict_${Date.now().toString(36)}`;
  const t_start = Date.now();

  logger.info('🔍 Checking for scheduling conflicts', {
    correlationId,
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
      logger.info('✅ No conflicts detected', { correlationId });
      return { hasConflict: false };
    }

    logger.warn('⚠️ Conflicts detected', {
      correlationId,
      count: conflictingEvents.length,
      titles: conflictingEvents.map(e => e.title).slice(0, 3), // Max 3 in log
    });

    // Calculate session duration
    const duration = Math.round(
      (eventData.endTime.getTime() - eventData.startTime.getTime()) / (60 * 1000)
    );

    // Get user's working hours for AI context
    const { getUserWorkingHours } = await import('../utils/availability');
    const workingHours = await getUserWorkingHours(eventData.createdBy);

    // Generate AI alternatives
    const t_aiStart = Date.now();
    const context: ConflictContext = {
      proposedStartTime: eventData.startTime,
      proposedEndTime: eventData.endTime,
      conflictingEvents,
      userId: eventData.createdBy,
      timezone,
      sessionDuration: duration,
      workingHours,
    };

    const alternatives = await generateAlternatives(context);
    const t_aiEnd = Date.now();

    if (alternatives.length === 0) {
      logger.warn('⚠️ No alternatives generated, using conflict message only', {
        correlationId,
      });
    }

    // 5. Build conflict message with user timezone
    const conflictMessage = await buildConflictMessage(
      eventData.title,
      conflictingEvents,
      alternatives,
      eventData.createdBy
    );

    // 6. Idempotent conflict logging
    const conflictLogId = `${correlationId}__${eventData.createdBy}`;
    
    try {
      await admin.firestore()
        .collection('conflict_logs')
        .doc(conflictLogId)
        .create({
          userId: eventData.createdBy,
          proposedTitle: eventData.title,
          conflictCount: conflictingEvents.length,
          alternativesGenerated: alternatives.length,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (createError: any) {
      // Already logged - skip posting duplicate warning
      if (createError.code === 6 || createError.message?.includes('already exists')) {
        logger.info('⏭️ Conflict already logged; skipping duplicate warning', {
          correlationId,
        });
        return {
          hasConflict: true,
          conflictMessage,
          alternatives,
        };
      }
    }

    // Post conflict warning to conversation (if not duplicate)
    if (conversationId) {
      await postConflictWarning(
        conversationId,
        conflictMessage,
        alternatives,
        eventData.createdBy
      );
    }

    const t_end = Date.now();

    logger.info('⏱️ Conflict handling complete', {
      correlationId,
      detectionDuration: t_aiStart - t_start,
      aiDuration: t_aiEnd - t_aiStart,
      totalDuration: t_end - t_start,
    });

    return {
      hasConflict: true,
      conflictMessage,
      alternatives,
    };
  } catch (error: any) {
    logger.error('❌ Error handling conflict', {
      correlationId,
      error: error.message,
      stack: error.stack,
    });

    return { hasConflict: false };
  }
}

/**
 * Find events that conflict with proposed time
 * Optimized with time window and limits
 */
async function findConflictingEvents(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<Array<{ id: string; title: string; startTime: Date; endTime: Date }>> {
  const correlationId = `conflict_${Date.now().toString(36)}`;
  
  try {
    // Simplified query to avoid composite index requirement
    // Get all user's events and filter for conflicts client-side
    const oneDayBefore = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
    const oneDayAfter = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);

    // Only use participants + startTime (existing index)
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('participants', 'array-contains', userId)
      .where('startTime', '>=', admin.firestore.Timestamp.fromDate(oneDayBefore))
      .where('startTime', '<=', admin.firestore.Timestamp.fromDate(oneDayAfter))
      .limit(100) // Narrower window for performance
      .get();

    const conflicts: Array<{ id: string; title: string; startTime: Date; endTime: Date }> = [];

    eventsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // 7. Safety check: Handle missing timestamps
      if (!data.startTime || !data.endTime) {
        logger.warn('⚠️ Event missing timestamps, skipping', {
          correlationId,
          eventId: doc.id,
        });
        return;
      }

      const eventStart = data.startTime.toDate();
      const eventEnd = data.endTime.toDate();

      // Validate dates
      if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
        logger.error('❌ Invalid timestamps in event, skipping', {
          correlationId,
          eventId: doc.id,
        });
        return;
      }

      // Check for overlap (improved logic)
      if (timeRangesOverlap(startTime, endTime, eventStart, eventEnd)) {
        conflicts.push({
          id: doc.id,
          title: data.title || 'Unnamed event',
          startTime: eventStart,
          endTime: eventEnd,
        });
      }
    });

    logger.info('✅ Conflict search complete', {
      correlationId,
      eventsQueried: eventsSnapshot.docs.length,
      conflictsFound: conflicts.length,
    });

    return conflicts;
  } catch (error: any) {
    logger.error('❌ Error finding conflicts', {
      correlationId,
      error: error.message,
    });
    return [];
  }
}

/**
 * Helper: Check if two time ranges overlap
 * 3. Improved: Ignore boundary-only overlaps and zero-duration events
 */
function timeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  // Ignore boundary-only overlaps (end == start is OK)
  if (end1.getTime() === start2.getTime() || end2.getTime() === start1.getTime()) {
    return false; // Back-to-back is not a conflict
  }

  // Ignore zero-duration events (start == end)
  if (start1.getTime() === end1.getTime() || start2.getTime() === end2.getTime()) {
    return false;
  }

  // Standard overlap check
  return start1 < end2 && start2 < end1;
}

/**
 * Build user-friendly conflict message with timezone info
 * 5. Localize with user timezone
 */
async function buildConflictMessage(
  proposedTitle: string,
  conflicts: Array<{ title: string; startTime: Date; endTime: Date }>,
  alternatives: AlternativeTimeSlot[],
  userId: string
): Promise<string> {
  // Get user's timezone
  const { getUserTimezone } = await import('../utils/timezone');
  const userTimezone = await getUserTimezone(userId);

  // Format times in user's timezone
  const formatTimeInTz = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: userTimezone,
    });
  };

  const conflictCount = conflicts.length;
  
  // 5. Limit to 2 conflicts with "and X more"
  const conflictList = conflicts
    .slice(0, 2)
    .map(c => `"${c.title}" (${formatTimeInTz(c.startTime)})`)
    .join(' and ');

  const moreText = conflictCount > 2 ? ` and ${conflictCount - 2} more` : '';

  let message = `⚠️ Scheduling conflict detected for "${proposedTitle}".\n\n`;
  message += `This overlaps with ${conflictList}${moreText}.\n\n`;

  if (alternatives.length > 0) {
    message += `I've found ${alternatives.length} alternative time${alternatives.length > 1 ? 's' : ''} that work better. `;
    message += `Tap one below to reschedule automatically.\n\n`;
  } else {
    message += `Please choose a different time that doesn't conflict with your schedule.\n\n`;
  }

  // Include timezone note
  message += `(Times shown in ${userTimezone})`;

  return message;
}

/**
 * Format time for display in user's timezone
 * 2. Timezone-aware formatting
 * Currently unused - replaced by messageTemplates.formatRescheduleConfirmation
 */
/* async function formatTime(date: Date, userId?: string): Promise<string> {
  if (!userId) {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  const { getUserTimezone } = await import('../utils/timezone');
  const userTimezone = await getUserTimezone(userId);

  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: userTimezone,
  });
} */

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
  conversationId: string,
  userId?: string
): Promise<boolean> {
  const correlationId = conflictId.substring(0, 8);

  logger.info('👆 User selected alternative', {
    correlationId,
    conflictId,
    alternativeIndex,
  });

  try {
    // Idempotency: Check if this reschedule was already processed
    const rescheduleKey = `${conflictId}_${alternativeIndex}`;
    const existing = await admin.firestore()
      .collection('reschedule_operations')
      .doc(rescheduleKey)
      .get();

    if (existing.exists) {
      logger.info('✅ Reschedule already processed (idempotent)', {
        correlationId,
        conflictId,
        alternativeIndex,
      });
      return true;
    }

    // Mark as processing
    await admin.firestore()
      .collection('reschedule_operations')
      .doc(rescheduleKey)
      .set({
        processed: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        conflictId,
        alternativeIndex,
        userId: userId || 'unknown',
      });

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
      logger.error('❌ Conflict message not found', { correlationId });
      return false;
    }

    const conflictMessage = messagesSnapshot.docs[0].data();
    const alternatives = conflictMessage.meta?.conflict?.suggestedAlternatives;

    if (!alternatives || alternativeIndex >= alternatives.length) {
      logger.error('❌ Alternative not found', {
        correlationId,
        alternativeIndex,
        availableCount: alternatives?.length || 0,
      });
      return false;
    }

    const selectedAlt = alternatives[alternativeIndex];
    const newStartTime = selectedAlt.startTime.toDate();
    const newEndTime = selectedAlt.endTime.toDate();

    // 4. Fix: Check if conflictId is an actual event ID
    const eventDoc = await admin.firestore()
      .collection('events')
      .doc(conflictId)
      .get();

    if (eventDoc.exists) {
      // Update existing event to new time and clear conflict flag
      await admin.firestore()
        .collection('events')
        .doc(conflictId)
        .update({
          startTime: admin.firestore.Timestamp.fromDate(newStartTime),
          endTime: admin.firestore.Timestamp.fromDate(newEndTime),
          hasConflict: false, // Clear conflict flag
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      logger.info('✅ Event rescheduled', {
        correlationId,
        eventId: conflictId,
        newStartTime: newStartTime.toISOString(),
      });

      // Get event details for confirmation
      const eventData = eventDoc.data();
      const timezone = 'America/New_York'; // TODO: Get from user settings
      const title = eventData?.title || 'Session';

      // Use template for confirmation
      const { formatRescheduleConfirmation } = await import('./messageTemplates');
      const confirmationText = formatRescheduleConfirmation(
        title,
        newStartTime.toISOString(),
        timezone
      );

      // Post confirmation message
      await admin.firestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add({
          senderId: 'assistant',
          senderName: 'JellyDM Assistant',
          type: 'text',
          messageType: 'confirmation',
          text: confirmationText,
          clientTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent',
          retryCount: 0,
          readBy: [],
          readCount: 0,
          meta: {
            role: 'assistant',
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } else {
      logger.warn('⚠️ Conflict ID is not an event; skipping reschedule', {
        correlationId,
        conflictId,
      });
    }

    return true;
  } catch (error: any) {
    logger.error('❌ Error handling alternative selection', {
      correlationId,
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
  const correlationId = `monitor_${userId.substring(0, 8)}`;
  const t_start = Date.now();

  try {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // 6. Performance guard: limit results
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('participants', 'array-contains', userId)
      .where('startTime', '>=', admin.firestore.Timestamp.fromDate(now))
      .where('startTime', '<=', admin.firestore.Timestamp.fromDate(twoWeeksFromNow))
      .orderBy('startTime', 'asc')
      .limit(500) // Safety limit
      .get();

    const events = eventsSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // 7. Safety check: validate timestamps
      if (!data.startTime || !data.endTime) {
        return null;
      }

      const startTime = data.startTime.toDate();
      const endTime = data.endTime.toDate();

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return null;
      }

      return {
        id: doc.id,
        title: data.title || 'Unnamed event',
        startTime,
        endTime,
      };
    }).filter(e => e !== null) as Array<{ id: string; title: string; startTime: Date; endTime: Date }>;

    const conflicts: Array<{
      event1: { id: string; title: string };
      event2: { id: string; title: string };
      overlapMinutes: number;
    }> = [];

    // 6. Optional: Sweep-line algorithm (O(n log n) instead of O(n²))
    // For now, keep O(n²) but with early termination
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        // Early termination: if event2 starts after event1 ends + 1 day, skip rest
        if (event2.startTime.getTime() > event1.endTime.getTime() + 24 * 60 * 60 * 1000) {
          break;
        }

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

    const t_end = Date.now();

    if (conflicts.length > 0) {
      logger.warn('⚠️ Schedule conflicts detected', {
        correlationId,
        userId: userId.substring(0, 8),
        conflictCount: conflicts.length,
        duration: t_end - t_start,
      });
    } else {
      logger.info('✅ No schedule conflicts found', {
        correlationId,
        duration: t_end - t_start,
      });
    }

    return conflicts;
  } catch (error: any) {
    logger.error('❌ Error monitoring conflicts', {
      correlationId,
      error: error.message,
    });
    return [];
  }
}

