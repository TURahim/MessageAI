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
  avgResponseTimeMinutes: number | null; // null when no responses
  lastResponseDate: Date;
  responseCount: number;
  noResponseCount: number; // Events with no RSVP
}

export interface EngagementPattern {
  conversationId: string;
  lastMessageDate: Date;
  daysSinceLastMessage: number | null; // null when no messages
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
    // 4. Query scale: add limit and index comment
    // Index: events(participants ARRAY, createdAt ASC)
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('participants', 'array-contains', userId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(cutoffDate))
      .limit(2000) // Safety limit
      .get();

    let totalResponseTimeMs = 0;
    let responseCount = 0;
    let noResponseCount = 0;
    let lastResponseDate = new Date(0);

    eventsSnapshot.docs.forEach(doc => {
      const event = doc.data();
      const rsvp = event.rsvps?.[userId];

      // 2. Treat response as any RSVP with response != 'pending'
      if (rsvp && rsvp.response && rsvp.response !== 'pending') {
        responseCount++;
        
        // 1. Guard toDate() calls
        if (!rsvp.respondedAt || !event.createdAt) {
          logger.warn('⚠️ Missing timestamps in RSVP, skipping', {
            eventId: doc.id,
          });
          return;
        }

        const respondedAt = rsvp.respondedAt.toDate();
        const createdAt = event.createdAt.toDate();
        
        // Validate dates
        if (isNaN(respondedAt.getTime()) || isNaN(createdAt.getTime())) {
          logger.error('❌ Invalid timestamps in RSVP, skipping', {
            eventId: doc.id,
          });
          return;
        }

        const responseTime = respondedAt.getTime() - createdAt.getTime();
        totalResponseTimeMs += responseTime;

        if (respondedAt > lastResponseDate) {
          lastResponseDate = respondedAt;
        }
      } else {
        // No response or pending
        noResponseCount++;
      }
    });

    // 2. avgResponseTimeMinutes should be null when responseCount == 0
    const avgResponseTimeMinutes = responseCount > 0 
      ? totalResponseTimeMs / responseCount / (60 * 1000)
      : null;

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
      avgResponseTimeMinutes: null,
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
    // Index: conversations/{id}/messages(serverTimestamp DESC)
    const messagesSnapshot = await admin.firestore()
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .where('serverTimestamp', '>=', admin.firestore.Timestamp.fromDate(cutoffDate))
      .orderBy('serverTimestamp', 'desc')
      .limit(100)
      .get();

    // 3. Filter out assistant/system messages (in memory)
    const userMessages = messagesSnapshot.docs.filter(doc => {
      const data = doc.data();
      const senderId = data.senderId;
      const role = data.meta?.role;
      
      // Exclude assistant and system messages
      return senderId !== 'assistant' && role !== 'assistant' && role !== 'system';
    });

    const messageCount30d = userMessages.length;
    
    // Find last user message
    let lastMessageDate = new Date(0);
    let daysSinceLastMessage: number | null = null;

    if (userMessages.length > 0) {
      const lastMsg = userMessages[0];
      const timestamp = lastMsg.data().serverTimestamp;
      
      // 1. Guard toDate() call
      if (timestamp) {
        const msgDate = timestamp.toDate();
        
        if (!isNaN(msgDate.getTime())) {
          lastMessageDate = msgDate;
          // 3. Use Math.floor for day counts
          daysSinceLastMessage = Math.floor((Date.now() - msgDate.getTime()) / (24 * 60 * 60 * 1000));
        }
      }
    }

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
      daysSinceLastMessage, // null or number
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
      daysSinceLastMessage: null,
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
    const createdBy = event?.createdBy;

    // 5. Exclude event.createdBy from participants by default
    const requiredParticipants = participants.filter((uid: string) => uid !== createdBy);

    // Find participants who haven't responded or are 'pending'
    const noResponse = requiredParticipants.filter((uid: string) => {
      const rsvp = rsvps[uid];
      // Consider 'pending' or missing as no response
      return !rsvp || rsvp.response === 'pending' || !rsvp.response;
    });

    return noResponse;
  } catch (error: any) {
    logger.error('❌ Error getting no-response participants', {
      error: error.message,
      eventId: eventId.substring(0, 8),
    });
    return [];
  }
}

