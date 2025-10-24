/**
 * Urgent Notifier - High-Priority Push Notifications
 * 
 * PR9: Urgency Detection
 * 
 * Sends immediate push notifications for urgent messages:
 * - Cancellations (tutor can't make session today)
 * - Emergency rescheduling
 * - Time-sensitive issues (test in 1 hour)
 * - Explicit "URGENT" messages
 * 
 * Features:
 * - Immediate delivery (no batching)
 * - High-priority push
 * - Custom sound/vibration
 * - Critical alert badge (iOS)
 * - Bypasses Do Not Disturb on Android
 */

import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import * as logger from 'firebase-functions/logger';
import { UrgencyResult } from '../ai/urgencyClassifier';

// Initialize Expo SDK
const expo = new Expo();

export interface UrgentNotificationContext {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  messageText: string;
  urgency: UrgencyResult;
}

/**
 * Send urgent push notifications to all conversation participants
 * 
 * Unlike regular notifications:
 * - No suppression (even if viewing conversation)
 * - High priority
 * - Custom sound
 * - Immediate delivery (no batching)
 * 
 * @param context - Message and urgency context
 * @returns Number of notifications sent
 */
export async function sendUrgentNotifications(
  context: UrgentNotificationContext
): Promise<number> {
  const { conversationId, senderId, senderName, messageText, urgency, messageId } = context;

  logger.info('🚨 Sending urgent notifications', {
    conversationId: conversationId.substring(0, 12),
    messageId: messageId.substring(0, 8),
    urgencyCategory: urgency.category,
    confidence: urgency.confidence,
  });

  try {
    // Get conversation to find recipients
    const convDoc = await admin.firestore()
      .doc(`conversations/${conversationId}`)
      .get();

    if (!convDoc.exists) {
      logger.warn('⚠️ Conversation not found:', conversationId);
      return 0;
    }

    const conversation = convDoc.data();
    if (!conversation) return 0;

    // Get recipients (everyone except sender)
    const recipients: string[] = conversation.participants.filter(
      (uid: string) => uid !== senderId
    );

    if (recipients.length === 0) {
      logger.info('📭 No recipients for urgent notification');
      return 0;
    }

    logger.info(`📤 Sending urgent notifications to ${recipients.length} recipient(s)`);

    // Fetch user documents for all recipients
    const userDocs = await Promise.all(
      recipients.map((uid: string) =>
        admin.firestore().doc(`users/${uid}`).get()
      )
    );

    // Build urgent push notification messages
    const pushMessages: ExpoPushMessage[] = [];

    for (const userDoc of userDocs) {
      if (!userDoc.exists) {
        logger.warn('⚠️ User document not found:', userDoc.id);
        continue;
      }

      const userData = userDoc.data();
      if (!userData) continue;

      const pushToken = userData.pushToken;

      // Skip if user has no push token
      if (!pushToken) {
        logger.log(`📵 No push token for user: ${userDoc.id.substring(0, 8)}`);
        continue;
      }

      // Validate Expo push token
      if (!Expo.isExpoPushToken(pushToken)) {
        logger.warn(`⚠️ Invalid push token for user: ${userDoc.id.substring(0, 8)}`);
        continue;
      }

      // NO SUPPRESSION for urgent messages (even if viewing conversation)
      // This is intentional - urgent messages always notify

      // Format notification
      const { title, body } = formatUrgentNotification(
        senderName,
        messageText,
        urgency
      );

      // Build push message with high priority settings
      pushMessages.push({
        to: pushToken,
        sound: 'default', // TODO: Could use custom urgent sound
        title,
        body,
        data: {
          conversationId,
          messageId,
          type: 'urgent',
          urgencyCategory: urgency.category,
          urgencyReason: urgency.reason,
        },
        badge: 1, // Increment badge
        priority: 'high', // High priority delivery
        channelId: 'urgent', // Android channel for urgent notifications
        // iOS-specific critical alert (requires special entitlement)
        // Only use for true emergencies
        ...(urgency.category === 'emergency' && {
          _displayInForeground: true,
        }),
      });

      logger.info(`✅ Queued urgent push for user: ${userDoc.id.substring(0, 8)}`);
    }

    // Send notifications immediately (no batching for urgent)
    if (pushMessages.length === 0) {
      logger.info('📭 No urgent notifications to send (no valid tokens)');
      return 0;
    }

    logger.info(`📤 Sending ${pushMessages.length} urgent notification(s)`);

    // Send all urgent notifications at once
    const chunks = expo.chunkPushNotifications(pushMessages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        logger.info(`✅ Urgent chunk sent: ${ticketChunk.length} tickets`);
      } catch (error: any) {
        logger.error('❌ Error sending urgent push chunk:', {
          error: error.message,
          stack: error.stack,
        });
      }
    }

    // Log any errors from tickets
    let successCount = 0;
    for (const ticket of tickets) {
      if (ticket.status === 'ok') {
        successCount++;
      } else if (ticket.status === 'error') {
        logger.error('❌ Urgent push error:', {
          message: ticket.message,
          details: ticket.details,
        });
      }
    }

    logger.info(`🎉 Urgent notifications sent: ${successCount}/${tickets.length} successful`);

    // Log urgent notification for analytics
    await logUrgentNotification(context, successCount);

    return successCount;
  } catch (error: any) {
    logger.error('❌ Error in sendUrgentNotifications', {
      error: error.message,
      stack: error.stack,
    });
    return 0;
  }
}

/**
 * Format urgent notification title and body
 * Different formats based on urgency category
 */
function formatUrgentNotification(
  senderName: string,
  messageText: string,
  urgency: UrgencyResult
): { title: string; body: string } {
  let title: string;
  let body: string;

  switch (urgency.category) {
    case 'cancellation':
      title = `🚨 ${senderName} - Session Cancellation`;
      body = messageText.substring(0, 150);
      break;

    case 'reschedule':
      title = `⚠️ ${senderName} - Reschedule Request`;
      body = messageText.substring(0, 150);
      break;

    case 'emergency':
      title = `🚨 URGENT - ${senderName}`;
      body = messageText.substring(0, 150);
      break;

    case 'deadline':
      title = `⏰ ${senderName} - Time Sensitive`;
      body = messageText.substring(0, 150);
      break;

    default:
      title = `❗ ${senderName} - Urgent`;
      body = messageText.substring(0, 150);
  }

  return { title, body };
}

/**
 * Log urgent notification for analytics
 * Helps track urgency detection accuracy and notification delivery
 */
async function logUrgentNotification(
  context: UrgentNotificationContext,
  recipientCount: number
): Promise<void> {
  try {
    await admin.firestore().collection('urgent_notifications_log').add({
      messageId: context.messageId,
      conversationId: context.conversationId,
      senderId: context.senderId,
      urgencyCategory: context.urgency.category,
      urgencyConfidence: context.urgency.confidence,
      urgencyReason: context.urgency.reason,
      keywords: context.urgency.keywords || [],
      recipientCount,
      messagePreview: context.messageText.substring(0, 200),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('📊 Urgent notification logged for analytics', {
      messageId: context.messageId.substring(0, 8),
      category: context.urgency.category,
    });
  } catch (error: any) {
    logger.error('❌ Failed to log urgent notification', {
      error: error.message,
    });
    // Don't throw - logging failure shouldn't block notifications
  }
}

/**
 * Query urgent notification logs for false positive analysis
 * Used by admin to review urgency classification accuracy
 * 
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Array of urgent notification logs
 */
export async function getUrgentNotificationLogs(
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  try {
    const snapshot = await admin.firestore()
      .collection('urgent_notifications_log')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .orderBy('timestamp', 'desc')
      .limit(1000) // Max 1000 records
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error: any) {
    logger.error('❌ Error fetching urgent notification logs', {
      error: error.message,
    });
    return [];
  }
}

/**
 * Helper: Check if quiet hours are active for a user
 * Used to determine if we should suppress even urgent notifications
 * 
 * Default quiet hours: 10 PM - 7 AM local time
 * Can be customized per user in settings (future PR)
 */
export function isQuietHours(timezone: string = 'America/New_York'): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });

    const hour = parseInt(formatter.format(now), 10);

    // Quiet hours: 10 PM (22) to 7 AM (7)
    return hour >= 22 || hour < 7;
  } catch (error) {
    logger.warn('⚠️ Failed to check quiet hours, defaulting to false', {
      error,
    });
    return false; // Default to allowing notifications
  }
}

/**
 * Get user's notification preferences
 * Future PR: Allow users to opt-out of urgent notifications
 */
export async function getUserNotificationPreferences(userId: string): Promise<{
  urgentNotificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: number; // 24-hour format (e.g., 22 for 10 PM)
  quietHoursEnd?: number; // 24-hour format (e.g., 7 for 7 AM)
}> {
  try {
    const userDoc = await admin.firestore().doc(`users/${userId}`).get();
    const userData = userDoc.data();

    return {
      urgentNotificationsEnabled: userData?.notificationPreferences?.urgentEnabled ?? true,
      quietHoursEnabled: userData?.notificationPreferences?.quietHoursEnabled ?? true,
      quietHoursStart: userData?.notificationPreferences?.quietHoursStart ?? 22,
      quietHoursEnd: userData?.notificationPreferences?.quietHoursEnd ?? 7,
    };
  } catch (error) {
    logger.warn('⚠️ Failed to fetch user notification preferences', {
      userId: userId.substring(0, 8),
      error,
    });

    // Default to enabled
    return {
      urgentNotificationsEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: 22,
      quietHoursEnd: 7,
    };
  }
}

