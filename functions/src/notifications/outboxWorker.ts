/**
 * Outbox Worker
 * 
 * PR12: Reminder Service + Outbox Worker
 * 
 * Triggered Cloud Function that:
 * 1. Listens to notification_outbox writes
 * 2. Sends push notifications via FCM/APNs
 * 3. Records attempt count and success/failure
 * 4. Retries with exponential backoff (max 3 attempts)
 */

import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import * as logger from 'firebase-functions/logger';
import type { ReminderOutboxDoc } from './reminderScheduler';

// Initialize Expo SDK
const expo = new Expo();

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // ms: 1s, 2s, 4s

/**
 * Process a single outbox document
 * 
 * Called by Cloud Function trigger on outbox write
 * Implements retry logic with exponential backoff
 * 
 * @param docId - Outbox document ID (composite key)
 * @param outboxDoc - Outbox document data
 * @returns Success boolean
 */
export async function processOutboxNotification(
  docId: string,
  outboxDoc: ReminderOutboxDoc
): Promise<boolean> {
  logger.info('📤 Processing outbox notification', {
    docId: docId.substring(0, 40),
    reminderType: outboxDoc.reminderType,
    attempts: outboxDoc.attempts,
  });

  // Check if already sent
  if (outboxDoc.status === 'sent') {
    logger.info('⏭️ Already sent, skipping', { docId });
    return true;
  }

  // Check max attempts
  if (outboxDoc.attempts >= MAX_ATTEMPTS) {
    logger.error('❌ Max attempts reached, marking as failed', {
      docId: docId.substring(0, 40),
      attempts: outboxDoc.attempts,
    });

    await updateOutboxStatus(docId, 'failed', outboxDoc.attempts, 'MAX_ATTEMPTS_REACHED');
    return false;
  }

  // Check if scheduled for future
  const scheduledFor = outboxDoc.scheduledFor.toDate();
  const now = new Date();
  
  if (scheduledFor > now) {
    const delayMs = scheduledFor.getTime() - now.getTime();
    logger.info('⏰ Scheduled for future, skipping for now', {
      docId: docId.substring(0, 40),
      delayMs,
    });
    return false;
  }

  // Validate push token
  if (!Expo.isExpoPushToken(outboxDoc.pushToken)) {
    logger.error('❌ Invalid push token', {
      docId: docId.substring(0, 40),
    });

    await updateOutboxStatus(docId, 'failed', outboxDoc.attempts + 1, 'INVALID_PUSH_TOKEN');
    return false;
  }

  // Send push notification
  try {
    const message: ExpoPushMessage = {
      to: outboxDoc.pushToken,
      sound: 'default',
      title: outboxDoc.title,
      body: outboxDoc.body,
      data: outboxDoc.data,
      badge: 1,
      priority: 'normal',
      channelId: 'reminders',
    };

    const tickets = await expo.sendPushNotificationsAsync([message]);
    const ticket = tickets[0];

    if (ticket.status === 'ok') {
      logger.info('✅ Notification sent successfully', {
        docId: docId.substring(0, 40),
        reminderType: outboxDoc.reminderType,
      });

      await updateOutboxStatus(docId, 'sent', outboxDoc.attempts + 1);
      return true;
    } else if (ticket.status === 'error') {
      logger.error('❌ Push notification error', {
        docId: docId.substring(0, 40),
        error: ticket.message,
        details: ticket.details,
      });

      // Retry if not max attempts
      if (outboxDoc.attempts + 1 < MAX_ATTEMPTS) {
        await scheduleRetry(docId, outboxDoc.attempts + 1, ticket.message);
      } else {
        await updateOutboxStatus(docId, 'failed', outboxDoc.attempts + 1, ticket.message);
      }

      return false;
    }

    return false;
  } catch (error: any) {
    logger.error('❌ Error sending notification', {
      docId: docId.substring(0, 40),
      error: error.message,
    });

    // Retry if not max attempts
    if (outboxDoc.attempts + 1 < MAX_ATTEMPTS) {
      await scheduleRetry(docId, outboxDoc.attempts + 1, error.message);
    } else {
      await updateOutboxStatus(docId, 'failed', outboxDoc.attempts + 1, error.message);
    }

    return false;
  }
}

/**
 * Update outbox document status
 */
async function updateOutboxStatus(
  docId: string,
  status: 'pending' | 'sent' | 'failed',
  attempts: number,
  error?: string
): Promise<void> {
  try {
    const updateData: any = {
      status,
      attempts,
      lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status === 'sent') {
      updateData.sentAt = admin.firestore.FieldValue.serverTimestamp();
    }

    if (error) {
      updateData.error = error;
    }

    await admin.firestore()
      .collection('notification_outbox')
      .doc(docId)
      .update(updateData);

    logger.info('📝 Outbox status updated', {
      docId: docId.substring(0, 40),
      status,
      attempts,
    });
  } catch (err: any) {
    logger.error('❌ Failed to update outbox status', {
      docId,
      error: err.message,
    });
  }
}

/**
 * Schedule retry with exponential backoff
 */
async function scheduleRetry(
  docId: string,
  attemptNumber: number,
  error: string
): Promise<void> {
  const delayMs = RETRY_DELAYS[attemptNumber - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

  logger.info('🔄 Scheduling retry', {
    docId: docId.substring(0, 40),
    attemptNumber,
    delayMs,
  });

  try {
    // Update status to pending with new scheduled time
    await admin.firestore()
      .collection('notification_outbox')
      .doc(docId)
      .update({
        status: 'pending',
        attempts: attemptNumber,
        scheduledFor: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + delayMs)
        ),
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
        error,
      });

    logger.info('✅ Retry scheduled', {
      docId: docId.substring(0, 40),
      nextAttemptIn: `${delayMs}ms`,
    });
  } catch (err: any) {
    logger.error('❌ Failed to schedule retry', {
      docId,
      error: err.message,
    });
  }
}

/**
 * Manually retry a failed notification
 * Resets status to pending for outbox worker to pick up
 */
export async function manualRetry(docId: string): Promise<boolean> {
  try {
    const docRef = admin.firestore().collection('notification_outbox').doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
      logger.error('❌ Outbox doc not found', { docId });
      return false;
    }

    const data = doc.data() as ReminderOutboxDoc;

    if (data.status === 'sent') {
      logger.warn('⚠️ Cannot retry - already sent', { docId });
      return false;
    }

    // Reset to pending with immediate scheduling
    await docRef.update({
      status: 'pending',
      scheduledFor: admin.firestore.Timestamp.now(),
      error: admin.firestore.FieldValue.delete(),
    });

    logger.info('✅ Manual retry queued', {
      docId: docId.substring(0, 40),
    });

    return true;
  } catch (error: any) {
    logger.error('❌ Manual retry failed', {
      docId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Get failed notifications for admin review
 */
export async function getFailedNotifications(
  limit: number = 100
): Promise<Array<{ id: string; data: ReminderOutboxDoc }>> {
  try {
    const snapshot = await admin.firestore()
      .collection('notification_outbox')
      .where('status', '==', 'failed')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data() as ReminderOutboxDoc,
    }));
  } catch (error: any) {
    logger.error('❌ Error fetching failed notifications', {
      error: error.message,
    });
    return [];
  }
}


