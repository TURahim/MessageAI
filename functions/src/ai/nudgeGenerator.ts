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

    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('createdBy', '==', userId) // Only tutor's events
      .where('endTime', '>=', admin.firestore.Timestamp.fromDate(twoHoursAgo))
      .where('endTime', '<=', admin.firestore.Timestamp.now())
      .where('status', '==', 'confirmed') // Only confirmed sessions
      .get();

    const recentSessions = eventsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        eventId: doc.id,
        title: data.title || 'Untitled session',
        endTime: data.endTime.toDate(),
        conversationId: data.conversationId,
      };
    });

    logger.info('✅ Recently ended sessions detected', {
      count: recentSessions.length,
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

    // Get all of tutor's past events
    const pastEventsSnapshot = await admin.firestore()
      .collection('events')
      .where('createdBy', '==', userId)
      .where('endTime', '<=', admin.firestore.Timestamp.now())
      .orderBy('endTime', 'desc')
      .get();

    // Group by conversation and find last session
    const conversationLastSession = new Map<string, Date>();

    pastEventsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const conversationId = data.conversationId;
      if (!conversationId) return;

      const endTime = data.endTime.toDate();

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
        const daysSince = (now.getTime() - lastSessionDate.getTime()) / (24 * 60 * 60 * 1000);

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
          daysSinceLastSession: Math.round(daysSince),
          studentName,
        });
      }
    }

    logger.info('✅ Long gaps detected', {
      count: longGaps.length,
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
  try {
    // Check if prompt already sent
    const alreadySent = await wasNudgeSent(eventId, 'post_session_note');
    if (alreadySent) {
      logger.info('⏭️ Post-session prompt already sent', {
        eventId: eventId.substring(0, 8),
      });
      return null;
    }

    const message = `📝 How did the "${sessionTitle}" session go?\n\n` +
      `Feel free to add any notes about topics covered, homework assigned, or areas to focus on next time.`;

    const messageRef = await admin.firestore()
      .collection('conversations')
      .doc(conversationId)
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
          eventId,
          nudgeType: 'post_session_note',
        },
      });

    await logNudge(eventId, conversationId, 'post_session_note');

    logger.info('✅ Post-session prompt sent', {
      eventId: eventId.substring(0, 8),
      conversationId: conversationId.substring(0, 12),
    });

    return messageRef.id;
  } catch (error: any) {
    logger.error('❌ Error sending post-session prompt', {
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
  try {
    // Check if alert already sent
    const alreadySent = await wasNudgeSent(conversationId, 'long_gap_alert');
    if (alreadySent) {
      logger.info('⏭️ Long gap alert already sent', {
        conversationId: conversationId.substring(0, 12),
      });
      return null;
    }

    const studentText = studentName ? ` with ${studentName}` : '';
    const message = `📅 It's been ${daysSinceLastSession} days since your last session${studentText}.\n\n` +
      `Consider scheduling a follow-up session to maintain momentum.`;

    const messageRef = await admin.firestore()
      .collection('conversations')
      .doc(conversationId)
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
          nudgeType: 'long_gap_alert',
        },
      });

    await logNudge('', conversationId, 'long_gap_alert');

    logger.info('✅ Long gap alert sent', {
      conversationId: conversationId.substring(0, 12),
      daysSince: daysSinceLastSession,
    });

    return messageRef.id;
  } catch (error: any) {
    logger.error('❌ Error sending long gap alert', {
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
  // Check user preferences
  const prefs = await getUserNudgePreferences(userId);
  if (!prefs.enabled || !prefs.longGapAlertsEnabled) {
    logger.info('⏭️ Long gap alerts disabled for user', {
      userId: userId.substring(0, 8),
    });
    return 0;
  }

  const longGaps = await detectLongGaps(userId);
  let alertsSent = 0;

  for (const gap of longGaps) {
    const messageId = await sendLongGapAlert(
      gap.conversationId,
      gap.daysSinceLastSession,
      gap.studentName
    );

    if (messageId) alertsSent++;
  }

  return alertsSent;
}

/**
 * Check if nudge was already sent
 */
async function wasNudgeSent(
  entityId: string,
  nudgeType: string
): Promise<boolean> {
  try {
    const snapshot = await admin.firestore()
      .collection('nudge_logs')
      .where('eventId', '==', entityId)
      .where('nudgeType', '==', nudgeType)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    logger.warn('⚠️ Error checking nudge history', { error });
    return false;
  }
}

/**
 * Log nudge for analytics
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
  } catch (error: any) {
    logger.error('❌ Failed to log nudge', { error: error.message });
  }
}

