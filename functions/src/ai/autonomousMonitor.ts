/**
 * Autonomous Monitor
 * 
 * PR13: Autonomous Monitoring
 * 
 * Proactively monitors user schedules and detects situations requiring attention:
 * - Unconfirmed events 24h before session
 * - Events with no RSVP responses
 * - Long gaps between sessions (detected in PR14)
 * 
 * Does NOT send unsolicited AI-generated messages
 * Only sends template-based nudges to tutors
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

export interface UnconfirmedEvent {
  eventId: string;
  title: string;
  startTime: Date;
  participants: string[];
  createdBy: string;
  conversationId?: string;
  hoursTillStart: number;
}

/**
 * Detect events happening in 24 hours that are still unconfirmed
 * 
 * Criteria for "unconfirmed":
 * - status = 'pending' (not confirmed or declined)
 * - Not all REQUIRED participants explicitly accepted (organizer excluded)
 * - Happening in 20-28 hours (24h window with buffer)
 * 
 * @returns Array of unconfirmed events requiring follow-up
 */
export async function detectUnconfirmedEvents24h(): Promise<UnconfirmedEvent[]> {
  const t_start = Date.now();
  
  logger.info('🔍 Detecting unconfirmed events (24h window)');

  try {
    const now = new Date();
    const in20Hours = new Date(now.getTime() + 20 * 60 * 60 * 1000);
    const in28Hours = new Date(now.getTime() + 28 * 60 * 60 * 1000);

    // Firestore index required: events(status ASC, startTime ASC)
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('startTime', '>=', admin.firestore.Timestamp.fromDate(in20Hours))
      .where('startTime', '<=', admin.firestore.Timestamp.fromDate(in28Hours))
      .where('status', '==', 'pending')
      .limit(500) // Safety limit
      .get();

    const t_queryEnd = Date.now();

    const unconfirmedEvents: UnconfirmedEvent[] = [];

    for (const eventDoc of eventsSnapshot.docs) {
      const correlationId = eventDoc.id.substring(0, 8);
      const event = eventDoc.data();
      const startTime = event.startTime.toDate();
      const participants = event.participants || [];
      const rsvps = event.rsvps || {};

      // 1. Fix: Only count REQUIRED participants (exclude organizer)
      const required = participants.filter((uid: string) => uid !== event.createdBy);
      
      // Skip events with no participants
      if (required.length === 0) {
        logger.warn('⚠️ Event has no participants; skipping', {
          correlationId,
          eventId: eventDoc.id,
        });
        continue;
      }

      // Check if all REQUIRED participants explicitly accepted
      const accepted = required.filter((uid: string) => 
        rsvps[uid]?.response === 'accepted'
      ).length;

      const allAccepted = accepted === required.length;

      // If not all accepted, this is unconfirmed
      if (!allAccepted) {
        // 5. Use Math.floor for hours (not rounding)
        const hoursTillStart = Math.floor((startTime.getTime() - now.getTime()) / (60 * 60 * 1000));

        unconfirmedEvents.push({
          eventId: eventDoc.id,
          title: event.title || 'Untitled session',
          startTime,
          participants,
          createdBy: event.createdBy,
          conversationId: event.conversationId,
          hoursTillStart,
        });
      }
    }

    const t_end = Date.now();

    logger.info('✅ Unconfirmed events detected', {
      count: unconfirmedEvents.length,
      eventsQueried: eventsSnapshot.docs.length,
      detectionDuration: t_queryEnd - t_start,
      totalDuration: t_end - t_start,
      events: unconfirmedEvents.map(e => ({
        correlationId: e.eventId.substring(0, 8),
        title: e.title,
        hoursTillStart: e.hoursTillStart,
      })),
    });

    return unconfirmedEvents;
  } catch (error: any) {
    logger.error('❌ Error detecting unconfirmed events', {
      error: error.message,
    });
    return [];
  }
}

/**
 * Send nudge to tutor about unconfirmed event
 * 
 * Posts a gentle reminder message to the conversation
 * Template-based (no AI-generated content)
 * 
 * @param event - Unconfirmed event details
 * @returns Message ID if sent, null otherwise
 */
export async function sendUnconfirmedEventNudge(
  event: UnconfirmedEvent
): Promise<string | null> {
  const correlationId = event.eventId.substring(0, 8);
  
  if (!event.conversationId) {
    logger.warn('⚠️ No conversation ID for event, skipping nudge', {
      correlationId,
      eventId: event.eventId,
    });
    return null;
  }

  try {
    // 3. Atomic idempotent check-and-create
    const nudgeType = 'unconfirmed_event_24h';
    const nudgeId = `${event.eventId}__${nudgeType}`;
    
    try {
      await admin.firestore()
        .collection('nudge_logs')
        .doc(nudgeId)
        .create({
          eventId: event.eventId,
          conversationId: event.conversationId,
          nudgeType,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error: any) {
      // Already exists - skip sending
      if (error.code === 6 || error.message?.includes('already exists')) {
        logger.info('⏭️ Nudge already logged; skipping send', {
          correlationId,
          eventId: event.eventId,
        });
        return null;
      }
      throw error; // Re-throw other errors
    }

    // Create template-based nudge message
    const message = await buildUnconfirmedEventMessage(event);

    // 6. Add message metadata consistency
    const messageRef = await admin.firestore()
      .collection('conversations')
      .doc(event.conversationId)
      .collection('messages')
      .add({
        senderId: 'assistant',
        senderName: 'JellyDM Assistant',
        type: 'text',
        messageType: 'system_nudge', // NEW: For client rendering
        text: message,
        clientTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        retryCount: 0,
        readBy: [],
        readCount: 0,
        meta: {
          role: 'assistant',
          eventId: event.eventId,
          nudgeType: 'unconfirmed_event_24h',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // NEW: Explicit createdAt
      });

    logger.info('✅ Unconfirmed event nudge sent', {
      correlationId,
      eventId: event.eventId,
      conversationId: event.conversationId.substring(0, 12),
      messageId: messageRef.id.substring(0, 8),
    });

    return messageRef.id;
  } catch (error: any) {
    logger.error('❌ Error sending unconfirmed event nudge', {
      correlationId,
      error: error.message,
      eventId: event.eventId,
    });
    return null;
  }
}

/**
 * Build template message for unconfirmed event
 * No AI generation - uses predefined templates
 * Uses tutor's timezone for time display
 */
async function buildUnconfirmedEventMessage(event: UnconfirmedEvent): Promise<string> {
  // 2. Fetch tutor's timezone and format with Intl.DateTimeFormat
  const { getUserTimezone } = await import('../utils/timezone');
  const tz = await getUserTimezone(event.createdBy);
  
  const fmt = new Intl.DateTimeFormat('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  });
  
  const startLabel = fmt.format(event.startTime);
  const hoursTillStart = event.hoursTillStart;

  // Include timezone in message for clarity
  return `📌 Reminder: "${event.title}" is scheduled for ${startLabel} (${tz}) (in ~${hoursTillStart} hours).\n\n` +
    `This session hasn't been confirmed yet. You may want to follow up with participants to confirm attendance.`;
}

/**
 * Check if event is unconfirmed
 * Encapsulates RSVP logic (extracted utility)
 * 
 * @param event - Event data with participants and rsvps
 * @returns true if event needs confirmation
 */
export function isEventUnconfirmed(event: any): boolean {
  const participants = event.participants || [];
  const rsvps = event.rsvps || {};
  
  // Required participants (exclude organizer)
  const required = participants.filter((uid: string) => uid !== event.createdBy);
  
  if (required.length === 0) {
    return false; // No participants to confirm
  }

  // Check if all required participants explicitly accepted
  const accepted = required.filter((uid: string) => 
    rsvps[uid]?.response === 'accepted'
  ).length;

  return accepted !== required.length;
}

/**
 * Process all unconfirmed events and send nudges
 * Called by scheduled Cloud Function
 * 
 * @returns Number of nudges sent
 */
export async function processUnconfirmedEvents(): Promise<number> {
  const t_processStart = Date.now();
  
  logger.info('🤖 Processing unconfirmed events');

  try {
    const unconfirmedEvents = await detectUnconfirmedEvents24h();

    if (unconfirmedEvents.length === 0) {
      logger.info('✅ No unconfirmed events requiring nudges');
      return 0;
    }

    let nudgesSent = 0;

    for (const event of unconfirmedEvents) {
      const correlationId = event.eventId.substring(0, 8);

      // Send nudge (idempotency handled inside sendUnconfirmedEventNudge)
      const messageId = await sendUnconfirmedEventNudge(event);
      
      if (messageId) {
        nudgesSent++;
        logger.info('📤 Nudge sent', {
          correlationId,
          messageId: messageId.substring(0, 8),
        });
      }
    }

    const t_processEnd = Date.now();

    logger.info('✅ Unconfirmed event processing complete', {
      eventsChecked: unconfirmedEvents.length,
      nudgesSent,
      totalProcessingDuration: t_processEnd - t_processStart,
    });

    return nudgesSent;
  } catch (error: any) {
    logger.error('❌ Error processing unconfirmed events', {
      error: error.message,
    });
    return 0;
  }
}

