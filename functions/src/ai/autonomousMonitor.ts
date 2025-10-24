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
 * - No RSVP responses OR not all participants responded
 * - Happening in 20-28 hours (24h window with buffer)
 * 
 * @returns Array of unconfirmed events requiring follow-up
 */
export async function detectUnconfirmedEvents24h(): Promise<UnconfirmedEvent[]> {
  logger.info('🔍 Detecting unconfirmed events (24h window)');

  try {
    const now = new Date();
    const in20Hours = new Date(now.getTime() + 20 * 60 * 60 * 1000);
    const in28Hours = new Date(now.getTime() + 28 * 60 * 60 * 1000);

    // Query events in 20-28 hour window that are still pending
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('startTime', '>=', admin.firestore.Timestamp.fromDate(in20Hours))
      .where('startTime', '<=', admin.firestore.Timestamp.fromDate(in28Hours))
      .where('status', '==', 'pending')
      .get();

    const unconfirmedEvents: UnconfirmedEvent[] = [];

    for (const eventDoc of eventsSnapshot.docs) {
      const event = eventDoc.data();
      const startTime = event.startTime.toDate();
      const participants = event.participants || [];
      const rsvps = event.rsvps || {};

      // Check if all participants have responded
      const participantsResponded = participants.filter((uid: string) => 
        rsvps[uid]?.response
      ).length;

      const allResponded = participantsResponded === participants.length;

      // If not all responded, this is unconfirmed
      if (!allResponded) {
        const hoursTillStart = (startTime.getTime() - now.getTime()) / (60 * 60 * 1000);

        unconfirmedEvents.push({
          eventId: eventDoc.id,
          title: event.title || 'Untitled session',
          startTime,
          participants,
          createdBy: event.createdBy,
          conversationId: event.conversationId,
          hoursTillStart: Math.round(hoursTillStart),
        });
      }
    }

    logger.info('✅ Unconfirmed events detected', {
      count: unconfirmedEvents.length,
      events: unconfirmedEvents.map(e => ({
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
  if (!event.conversationId) {
    logger.warn('⚠️ No conversation ID for event, skipping nudge', {
      eventId: event.eventId,
    });
    return null;
  }

  try {
    // Create template-based nudge message
    const message = await buildUnconfirmedEventMessage(event);

    // Post to conversation as assistant message
    const messageRef = await admin.firestore()
      .collection('conversations')
      .doc(event.conversationId)
      .collection('messages')
      .add({
        senderId: 'assistant',
        senderName: 'JellyDM Assistant',
        type: 'text',
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
      });

    logger.info('✅ Unconfirmed event nudge sent', {
      eventId: event.eventId,
      conversationId: event.conversationId.substring(0, 12),
      messageId: messageRef.id.substring(0, 8),
    });

    // Log nudge for analytics
    await logNudge(event.eventId, event.conversationId, 'unconfirmed_event_24h');

    return messageRef.id;
  } catch (error: any) {
    logger.error('❌ Error sending unconfirmed event nudge', {
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
  // Fetch tutor's timezone
  const { getUserTimezone } = await import('../utils/timezone');
  const tz = await getUserTimezone(event.createdBy);
  
  const startTime = event.startTime.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,  // Use tutor's timezone
  });

  const hoursTillStart = event.hoursTillStart;

  return `📌 Reminder: "${event.title}" is scheduled for ${startTime} (in ~${hoursTillStart} hours).\n\n` +
    `This session hasn't been confirmed yet. You may want to follow up with participants to confirm attendance.`;
}

/**
 * Log nudge for analytics
 * Helps track effectiveness of autonomous monitoring
 */
async function logNudge(
  eventId: string,
  conversationId: string,
  nudgeType: string
): Promise<void> {
  try {
    await admin.firestore().collection('nudge_logs').add({
      eventId,
      conversationId,
      nudgeType,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('📊 Nudge logged for analytics', {
      nudgeType,
      eventId: eventId.substring(0, 8),
    });
  } catch (error: any) {
    logger.error('❌ Failed to log nudge', {
      error: error.message,
    });
    // Don't throw - logging failure shouldn't block nudges
  }
}

/**
 * Check if nudge was already sent for this event
 * Prevents duplicate nudges
 */
async function wasNudgeSent(
  eventId: string,
  nudgeType: string
): Promise<boolean> {
  try {
    const snapshot = await admin.firestore()
      .collection('nudge_logs')
      .where('eventId', '==', eventId)
      .where('nudgeType', '==', nudgeType)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    logger.warn('⚠️ Error checking nudge history', { error });
    return false; // Default to not sent (allow nudge)
  }
}

/**
 * Process all unconfirmed events and send nudges
 * Called by scheduled Cloud Function
 * 
 * @returns Number of nudges sent
 */
export async function processUnconfirmedEvents(): Promise<number> {
  logger.info('🤖 Processing unconfirmed events');

  try {
    const unconfirmedEvents = await detectUnconfirmedEvents24h();

    if (unconfirmedEvents.length === 0) {
      logger.info('✅ No unconfirmed events requiring nudges');
      return 0;
    }

    let nudgesSent = 0;

    for (const event of unconfirmedEvents) {
      // Check if nudge already sent
      const alreadySent = await wasNudgeSent(event.eventId, 'unconfirmed_event_24h');
      
      if (alreadySent) {
        logger.info('⏭️ Nudge already sent for event', {
          eventId: event.eventId.substring(0, 8),
        });
        continue;
      }

      // Send nudge
      const messageId = await sendUnconfirmedEventNudge(event);
      
      if (messageId) {
        nudgesSent++;
      }
    }

    logger.info('✅ Unconfirmed event processing complete', {
      eventsChecked: unconfirmedEvents.length,
      nudgesSent,
    });

    return nudgesSent;
  } catch (error: any) {
    logger.error('❌ Error processing unconfirmed events', {
      error: error.message,
    });
    return 0;
  }
}

