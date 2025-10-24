/**
 * Pattern Detector
 * 
 * PR13: Autonomous Monitoring
 * 
 * Detects behavioral patterns in tutoring relationships:
 * - Response time patterns
 * - Session attendance patterns
 * - Engagement patterns
 * - Communication gaps
 * 
 * Used to trigger appropriate nudges and monitoring
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

export interface ResponsePattern {
  userId: string;
  avgResponseTimeMinutes: number;
  lastResponseDate: Date;
  responseCount: number;
  noResponseCount: number; // Events with no RSVP
}

export interface EngagementPattern {
  conversationId: string;
  lastMessageDate: Date;
  daysSinceLastMessage: number;
  messageCount30d: number;
  hasScheduledEvents: boolean;
  hasUnconfirmedEvents: boolean;
}

/**
 * Analyze user's RSVP response patterns
 * Helps identify users who typically don't respond
 * 
 * @param userId - User to analyze
 * @param lookbackDays - Days to look back (default 30)
 * @returns Response pattern analysis
 */
export async function analyzeResponsePattern(
  userId: string,
  lookbackDays: number = 30
): Promise<ResponsePattern> {
  const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  try {
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('participants', 'array-contains', userId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(cutoffDate))
      .get();

    let totalResponseTimeMs = 0;
    let responseCount = 0;
    let noResponseCount = 0;
    let lastResponseDate = new Date(0);

    eventsSnapshot.docs.forEach(doc => {
      const event = doc.data();
      const rsvp = event.rsvps?.[userId];

      if (rsvp) {
        responseCount++;
        const respondedAt = rsvp.respondedAt.toDate();
        const createdAt = event.createdAt.toDate();
        const responseTime = respondedAt.getTime() - createdAt.getTime();
        totalResponseTimeMs += responseTime;

        if (respondedAt > lastResponseDate) {
          lastResponseDate = respondedAt;
        }
      } else {
        // No response yet
        noResponseCount++;
      }
    });

    const avgResponseTimeMinutes = responseCount > 0 
      ? totalResponseTimeMs / responseCount / (60 * 1000)
      : 0;

    return {
      userId,
      avgResponseTimeMinutes,
      lastResponseDate,
      responseCount,
      noResponseCount,
    };
  } catch (error: any) {
    logger.error('❌ Error analyzing response pattern', {
      error: error.message,
      userId: userId.substring(0, 8),
    });

    return {
      userId,
      avgResponseTimeMinutes: 0,
      lastResponseDate: new Date(0),
      responseCount: 0,
      noResponseCount: 0,
    };
  }
}

/**
 * Analyze conversation engagement patterns
 * Detects inactive conversations that may need attention
 * 
 * @param conversationId - Conversation to analyze
 * @returns Engagement pattern analysis
 */
export async function analyzeEngagementPattern(
  conversationId: string
): Promise<EngagementPattern> {
  try {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get recent messages
    const messagesSnapshot = await admin.firestore()
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .where('serverTimestamp', '>=', admin.firestore.Timestamp.fromDate(cutoffDate))
      .orderBy('serverTimestamp', 'desc')
      .limit(100)
      .get();

    const messageCount30d = messagesSnapshot.docs.length;
    const lastMessage = messagesSnapshot.docs[0];
    const lastMessageDate = lastMessage?.data().serverTimestamp?.toDate() || new Date(0);
    const daysSinceLastMessage = (Date.now() - lastMessageDate.getTime()) / (24 * 60 * 60 * 1000);

    // Check for scheduled events
    const futureEventsSnapshot = await admin.firestore()
      .collection('events')
      .where('conversationId', '==', conversationId)
      .where('startTime', '>=', admin.firestore.Timestamp.now())
      .limit(1)
      .get();

    const hasScheduledEvents = !futureEventsSnapshot.empty;

    // Check for unconfirmed events
    const unconfirmedSnapshot = await admin.firestore()
      .collection('events')
      .where('conversationId', '==', conversationId)
      .where('startTime', '>=', admin.firestore.Timestamp.now())
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    const hasUnconfirmedEvents = !unconfirmedSnapshot.empty;

    return {
      conversationId,
      lastMessageDate,
      daysSinceLastMessage: Math.round(daysSinceLastMessage),
      messageCount30d,
      hasScheduledEvents,
      hasUnconfirmedEvents,
    };
  } catch (error: any) {
    logger.error('❌ Error analyzing engagement pattern', {
      error: error.message,
      conversationId: conversationId.substring(0, 12),
    });

    return {
      conversationId,
      lastMessageDate: new Date(0),
      daysSinceLastMessage: 0,
      messageCount30d: 0,
      hasScheduledEvents: false,
      hasUnconfirmedEvents: false,
    };
  }
}

/**
 * Detect events with participants who haven't responded
 * Used for targeted follow-up nudges
 * 
 * @param eventId - Event to check
 * @returns Array of user IDs who haven't responded
 */
export async function getNoResponseParticipants(
  eventId: string
): Promise<string[]> {
  try {
    const eventDoc = await admin.firestore()
      .collection('events')
      .doc(eventId)
      .get();

    if (!eventDoc.exists) {
      return [];
    }

    const event = eventDoc.data();
    const participants = event?.participants || [];
    const rsvps = event?.rsvps || {};

    // Find participants who haven't responded
    const noResponse = participants.filter((uid: string) => !rsvps[uid]);

    return noResponse;
  } catch (error: any) {
    logger.error('❌ Error getting no-response participants', {
      error: error.message,
      eventId: eventId.substring(0, 8),
    });
    return [];
  }
}

