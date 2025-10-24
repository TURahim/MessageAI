/**
 * Smart Nudge Generator
 * 
 * PR14: Smart Nudges
 * 
 * Generates template-based nudges (NO AI-generated messages):
 * - Post-session note prompts
 * - Long gap between sessions alerts
 * - User can disable nudges in settings
 * 
 * Templates only for MVP - no OpenAI calls
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

export type NudgeType = 'post_session_note' | 'long_gap_alert' | 'unconfirmed_event_24h';

export interface NudgePreferences {
  enabled: boolean;
  postSessionNotesEnabled: boolean;
  longGapAlertsEnabled: boolean;
  unconfirmedEventsEnabled: boolean;
}

const DEFAULT_PREFERENCES: NudgePreferences = {
  enabled: true,
  postSessionNotesEnabled: true,
  longGapAlertsEnabled: true,
  unconfirmedEventsEnabled: true,
};

/**
 * Get user's nudge preferences
 * Stored in users/{uid}/nudgePreferences (optional field)
 */
export async function getUserNudgePreferences(
  userId: string
): Promise<NudgePreferences> {
  try {
    const userDoc = await admin.firestore().doc(`users/${userId}`).get();
    const userData = userDoc.data();
    
    if (!userData?.nudgePreferences) {
      return DEFAULT_PREFERENCES;
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...userData.nudgePreferences,
    };
  } catch (error) {
    logger.warn('⚠️ Failed to fetch nudge preferences, using defaults', {
      userId: userId.substring(0, 8),
      error,
    });
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Detect sessions that ended recently (within last 2 hours)
 * Prompts tutor to add session notes
 * 
 * @param userId - Tutor ID
 * @returns Array of recent sessions requiring notes
 */
export async function detectRecentlyEndedSessions(
  userId: string
): Promise<Array<{
  eventId: string;
  title: string;
  endTime: Date;
  conversationId?: string;
}>> {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // 2. Query tuning: add limit and ensure status filter
    // Index required: events(createdBy ASC, status ASC, endTime ASC)
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('createdBy', '==', userId) // Only tutor's events
      .where('status', '==', 'confirmed') // Only confirmed sessions
      .where('endTime', '>=', admin.firestore.Timestamp.fromDate(twoHoursAgo))
      .where('endTime', '<=', admin.firestore.Timestamp.now())
      .limit(200) // Safety limit
      .get();

    const recentSessions = eventsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        
        // 5. Guard toDate() calls
        if (!data.endTime) {
          logger.warn('⚠️ Event missing endTime, skipping', {
            eventId: doc.id,
          });
          return null;
        }

        const endTime = data.endTime.toDate();
        
        // Validate date
        if (isNaN(endTime.getTime())) {
          logger.error('❌ Invalid endTime in event, skipping', {
            eventId: doc.id,
          });
          return null;
        }

        return {
          eventId: doc.id,
          title: data.title || 'Untitled session',
          endTime,
          conversationId: data.conversationId,
        };
      })
      .filter(s => s !== null) as Array<{
        eventId: string;
        title: string;
        endTime: Date;
        conversationId?: string;
      }>;

    logger.info('✅ Recently ended sessions detected', {
      count: recentSessions.length,
      queriedDocs: eventsSnapshot.docs.length,
    });

    return recentSessions;
  } catch (error: any) {
    logger.error('❌ Error detecting recently ended sessions', {
      error: error.message,
    });
    return [];
  }
}

/**
 * Detect conversations with long gaps between sessions
 * Threshold: >14 days since last session
 * 
 * @param userId - Tutor ID
 * @returns Array of conversations with long gaps
 */
export async function detectLongGaps(
  userId: string
): Promise<Array<{
  conversationId: string;
  lastSessionDate: Date;
  daysSinceLastSession: number;
  studentName?: string;
}>> {
  try {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // 2. Query tuning: add status filter, oneYearAgo lower bound, limit
    // Index required: events(createdBy ASC, status ASC, endTime DESC)
    const pastEventsSnapshot = await admin.firestore()
      .collection('events')
      .where('createdBy', '==', userId)
      .where('status', '==', 'confirmed') // Only confirmed sessions
      .where('endTime', '>=', admin.firestore.Timestamp.fromDate(oneYearAgo)) // Lower bound
      .where('endTime', '<=', admin.firestore.Timestamp.now())
      .orderBy('endTime', 'desc')
      .limit(2000) // Safety limit
      .get();

    // Group by conversation and find last session
    const conversationLastSession = new Map<string, Date>();

    pastEventsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const conversationId = data.conversationId;
      if (!conversationId) return;

      // 5. Guard toDate() calls
      if (!data.endTime) {
        logger.warn('⚠️ Event missing endTime, skipping', {
          eventId: doc.id,
        });
        return;
      }

      const endTime = data.endTime.toDate();
      
      // Validate date
      if (isNaN(endTime.getTime())) {
        logger.error('❌ Invalid endTime in event, skipping', {
          eventId: doc.id,
        });
        return;
      }

      if (!conversationLastSession.has(conversationId)) {
        conversationLastSession.set(conversationId, endTime);
      }
    });

    // Find conversations with >14 day gaps
    const longGaps: Array<{
      conversationId: string;
      lastSessionDate: Date;
      daysSinceLastSession: number;
      studentName?: string;
    }> = [];

    for (const [conversationId, lastSessionDate] of conversationLastSession.entries()) {
      if (lastSessionDate < fourteenDaysAgo) {
        // 5. Use Math.floor for whole days
        const daysSince = Math.floor((now.getTime() - lastSessionDate.getTime()) / (24 * 60 * 60 * 1000));

        // Get conversation details for student name
        const convDoc = await admin.firestore().doc(`conversations/${conversationId}`).get();
        const convData = convDoc.data();
        
        // Get other participant (student)
        const otherUserId = convData?.participants?.find((uid: string) => uid !== userId);
        let studentName: string | undefined;
        
        if (otherUserId) {
          const userDoc = await admin.firestore().doc(`users/${otherUserId}`).get();
          studentName = userDoc.data()?.displayName;
        }

        longGaps.push({
          conversationId,
          lastSessionDate,
          daysSinceLastSession: daysSince,
          studentName,
        });
      }
    }

    logger.info('✅ Long gaps detected', {
      count: longGaps.length,
      queriedDocs: pastEventsSnapshot.docs.length,
    });

    return longGaps;
  } catch (error: any) {
    logger.error('❌ Error detecting long gaps', {
      error: error.message,
    });
    return [];
  }
}

/**
 * Send post-session note prompt
 * Template-based message asking tutor to add notes
 */
export async function sendPostSessionNotePrompt(
  eventId: string,
  conversationId: string,
  sessionTitle: string
): Promise<string | null> {
  const correlationId = eventId.substring(0, 8);

  try {
    // 1. Reserve nudge BEFORE writing message (atomic idempotency)
    const reserved = await reserveNudge(eventId, 'post_session_note', conversationId);
    if (!reserved) {
      logger.info('⏭️ Post-session prompt already reserved', {
        correlationId,
      });
      return null;
    }

    const message = `📝 How did the "${sessionTitle}" session go?\n\n` +
      `Feel free to add any notes about topics covered, homework assigned, or areas to focus on next time.`;

    // 4. Add message metadata consistency
    const messageRef = await admin.firestore()
      .collection('conversations')
      .doc(conversationId)
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
          eventId,
          nudgeType: 'post_session_note',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // Explicit createdAt
      });

    logger.info('✅ Post-session prompt sent', {
      correlationId,
      conversationId: conversationId.substring(0, 12),
    });

    return messageRef.id;
  } catch (error: any) {
    logger.error('❌ Error sending post-session prompt', {
      correlationId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Send long gap alert
 * Template-based message about lack of recent sessions
 */
export async function sendLongGapAlert(
  conversationId: string,
  daysSinceLastSession: number,
  studentName?: string
): Promise<string | null> {
  const correlationId = conversationId.substring(0, 12);

  try {
    // 1. Reserve nudge BEFORE writing message (atomic idempotency)
    const reserved = await reserveNudge(conversationId, 'long_gap_alert', conversationId);
    if (!reserved) {
      logger.info('⏭️ Long gap alert already reserved', {
        correlationId,
      });
      return null;
    }

    const studentText = studentName ? ` with ${studentName}` : '';
    const message = `📅 It's been ${daysSinceLastSession} days since your last session${studentText}.\n\n` +
      `Consider scheduling a follow-up session to maintain momentum.`;

    // 4. Add message metadata consistency
    const messageRef = await admin.firestore()
      .collection('conversations')
      .doc(conversationId)
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
          nudgeType: 'long_gap_alert',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // Explicit createdAt
      });

    logger.info('✅ Long gap alert sent', {
      correlationId,
      daysSince: daysSinceLastSession,
    });

    return messageRef.id;
  } catch (error: any) {
    logger.error('❌ Error sending long gap alert', {
      correlationId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Process post-session note prompts
 * Called by scheduled job
 */
export async function processPostSessionNotes(
  userId: string
): Promise<number> {
  // Check user preferences
  const prefs = await getUserNudgePreferences(userId);
  if (!prefs.enabled || !prefs.postSessionNotesEnabled) {
    logger.info('⏭️ Post-session notes disabled for user', {
      userId: userId.substring(0, 8),
    });
    return 0;
  }

  const recentSessions = await detectRecentlyEndedSessions(userId);
  let promptsSent = 0;

  for (const session of recentSessions) {
    if (!session.conversationId) continue;

    const messageId = await sendPostSessionNotePrompt(
      session.eventId,
      session.conversationId,
      session.title
    );

    if (messageId) promptsSent++;
  }

  return promptsSent;
}

/**
 * Process long gap alerts
 * Called by scheduled job (less frequently - daily)
 */
export async function processLongGapAlerts(
  userId: string
): Promise<number> {
  const correlationId = userId.substring(0, 8);

  // Check user preferences
  const prefs = await getUserNudgePreferences(userId);
  if (!prefs.enabled || !prefs.longGapAlertsEnabled) {
    logger.info('⏭️ Long gap alerts disabled for user', {
      correlationId,
    });
    return 0;
  }

  const longGaps = await detectLongGaps(userId);
  let alertsSent = 0;

  // 6. Process with small concurrency pool (10 at a time)
  const BATCH_SIZE = 10;
  for (let i = 0; i < longGaps.length; i += BATCH_SIZE) {
    const batch = longGaps.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(gap => 
        sendLongGapAlert(
          gap.conversationId,
          gap.daysSinceLastSession,
          gap.studentName
        )
      )
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        alertsSent++;
      }
    });
  }

  logger.info('✅ Long gap alerts processed', {
    correlationId,
    gapsFound: longGaps.length,
    alertsSent,
  });

  return alertsSent;
}

/**
 * 1. Reserve nudge slot (atomic idempotency)
 * 
 * Uses doc.create() for atomic check-and-reserve
 * Prevents duplicate nudges via deterministic ID
 * 
 * @param entityId - Event ID or conversation ID
 * @param nudgeType - Type of nudge
 * @param conversationId - Optional conversation context
 * @returns true if reserved, false if already exists
 */
async function reserveNudge(
  entityId: string,
  nudgeType: NudgeType,
  conversationId?: string
): Promise<boolean> {
  // Deterministic ID
  const nudgeId = `${nudgeType}__${entityId}`;
  
  try {
    await admin.firestore()
      .collection('nudge_logs')
      .doc(nudgeId)
      .create({
        entityId,
        conversationId: conversationId || '',
        nudgeType,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    
    return true; // Reserved successfully
  } catch (error: any) {
    // Already exists (code 6 or 'already exists' message)
    if (error.code === 6 || error.message?.includes('already exists')) {
      logger.info('⏭️ Nudge already reserved', {
        nudgeId: nudgeId.substring(0, 40),
      });
      return false;
    }
    
    // Other error - log and fail
    logger.error('❌ Failed to reserve nudge', {
      nudgeId,
      error: error.message,
    });
    return false;
  }
}

