/**
 * Reminder Scheduler
 * 
 * PR12: Reminder Service + Outbox Worker
 * 
 * Scheduled Cloud Function (runs hourly) that:
 * 1. Queries events/tasks in next 24h
 * 2. Writes reminder docs to notification_outbox collection
 * 3. Implements idempotency via composite key
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

export type ReminderType = '24h_before' | '2h_before' | 'task_due_today' | 'task_overdue';
export type EntityType = 'event' | 'task';

export interface ReminderOutboxDoc {
  // Composite key components (for idempotency)
  entityType: EntityType;
  entityId: string;
  targetUserId: string;
  reminderType: ReminderType;
  
  // Notification content
  title: string;
  body: string;
  data: Record<string, any>;
  
  // Scheduling
  scheduledFor: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  
  // Delivery tracking
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastAttemptAt?: admin.firestore.Timestamp;
  sentAt?: admin.firestore.Timestamp;
  error?: string;
  
  // Push token
  pushToken: string;
}

/**
 * Generate composite key for idempotency
 * Ensures we don't send duplicate reminders
 */
function generateCompositeKey(
  entityType: EntityType,
  entityId: string,
  targetUserId: string,
  reminderType: ReminderType
): string {
  return `${entityType}_${entityId}_${targetUserId}_${reminderType}`;
}

/**
 * Schedule event reminders
 * Checks for events happening in the next 24 hours
 */
export async function scheduleEventReminders(): Promise<number> {
  logger.info('📅 Scheduling event reminders');

  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Query events in next 24 hours
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('startTime', '>=', admin.firestore.Timestamp.fromDate(now))
      .where('startTime', '<=', admin.firestore.Timestamp.fromDate(in24Hours))
      .where('status', '==', 'confirmed') // Only confirmed events
      .get();

    let remindersCreated = 0;

    for (const eventDoc of eventsSnapshot.docs) {
      const event = eventDoc.data();
      const eventStart = event.startTime.toDate();
      const participants = event.participants || [];

      // Schedule 24h reminder
      const is24hWindow = eventStart.getTime() > now.getTime() + 23 * 60 * 60 * 1000;
      if (is24hWindow) {
        for (const userId of participants) {
          const created = await createReminderOutbox({
            entityType: 'event',
            entityId: eventDoc.id,
            targetUserId: userId,
            reminderType: '24h_before',
            title: `Reminder: ${event.title}`,
            body: `You have "${event.title}" tomorrow at ${formatTime(eventStart)}`,
            data: {
              eventId: eventDoc.id,
              conversationId: event.conversationId,
              type: 'event_reminder',
            },
            scheduledFor: new Date(now.getTime() + 1000), // Send in 1 second
          });
          if (created) remindersCreated++;
        }
      }

      // Schedule 2h reminder
      const is2hWindow = 
        eventStart.getTime() > now.getTime() + 1.5 * 60 * 60 * 1000 &&
        eventStart.getTime() <= in2Hours.getTime();
      
      if (is2hWindow) {
        for (const userId of participants) {
          const created = await createReminderOutbox({
            entityType: 'event',
            entityId: eventDoc.id,
            targetUserId: userId,
            reminderType: '2h_before',
            title: `Reminder: ${event.title} in 2 hours`,
            body: `Your session starts at ${formatTime(eventStart)}`,
            data: {
              eventId: eventDoc.id,
              conversationId: event.conversationId,
              type: 'event_reminder',
            },
            scheduledFor: new Date(now.getTime() + 1000),
          });
          if (created) remindersCreated++;
        }
      }
    }

    logger.info('✅ Event reminders scheduled', {
      eventsChecked: eventsSnapshot.docs.length,
      remindersCreated,
    });

    return remindersCreated;
  } catch (error: any) {
    logger.error('❌ Error scheduling event reminders', {
      error: error.message,
    });
    return 0;
  }
}

/**
 * Schedule task reminders
 * Checks for tasks due today or overdue
 */
export async function scheduleTaskReminders(): Promise<number> {
  logger.info('📝 Scheduling task reminders');

  try {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Query tasks due today or overdue
    const tasksSnapshot = await admin.firestore()
      .collection('deadlines')
      .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(yesterday))
      .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(endOfToday))
      .where('completed', '==', false)
      .get();

    let remindersCreated = 0;

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      const dueDate = task.dueDate.toDate();
      const assignee = task.assignee;

      // Check if due today
      const isDueToday = 
        dueDate.getDate() === now.getDate() &&
        dueDate.getMonth() === now.getMonth() &&
        dueDate.getFullYear() === now.getFullYear();

      // Check if overdue
      const isOverdue = dueDate < now;

      let reminderType: ReminderType;
      let title: string;
      let body: string;

      if (isOverdue) {
        reminderType = 'task_overdue';
        title = `Overdue: ${task.title}`;
        body = `This task was due ${formatDate(dueDate)}`;
      } else if (isDueToday) {
        reminderType = 'task_due_today';
        title = `Due Today: ${task.title}`;
        body = `Don't forget - this is due today at ${formatTime(dueDate)}`;
      } else {
        continue; // Not due today or overdue
      }

      const created = await createReminderOutbox({
        entityType: 'task',
        entityId: taskDoc.id,
        targetUserId: assignee,
        reminderType,
        title,
        body,
        data: {
          deadlineId: taskDoc.id,
          conversationId: task.conversationId,
          type: 'task_reminder',
        },
        scheduledFor: new Date(now.getTime() + 1000),
      });

      if (created) remindersCreated++;
    }

    logger.info('✅ Task reminders scheduled', {
      tasksChecked: tasksSnapshot.docs.length,
      remindersCreated,
    });

    return remindersCreated;
  } catch (error: any) {
    logger.error('❌ Error scheduling task reminders', {
      error: error.message,
    });
    return 0;
  }
}

/**
 * Create reminder in outbox with idempotency check
 * Returns true if created, false if already exists
 */
async function createReminderOutbox(params: {
  entityType: EntityType;
  entityId: string;
  targetUserId: string;
  reminderType: ReminderType;
  title: string;
  body: string;
  data: Record<string, any>;
  scheduledFor: Date;
}): Promise<boolean> {
  const {
    entityType,
    entityId,
    targetUserId,
    reminderType,
    title,
    body,
    data,
    scheduledFor,
  } = params;

  // Generate composite key for idempotency
  const compositeKey = generateCompositeKey(entityType, entityId, targetUserId, reminderType);

  try {
    // Check if reminder already exists
    const existingDoc = await admin.firestore()
      .collection('notification_outbox')
      .doc(compositeKey)
      .get();

    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      
      // Skip if already sent
      if (existingData?.status === 'sent') {
        logger.info('⏭️ Reminder already sent, skipping', {
          compositeKey: compositeKey.substring(0, 40),
        });
        return false;
      }

      // Skip if pending (retry will handle)
      if (existingData?.status === 'pending') {
        logger.info('⏭️ Reminder already pending, skipping', {
          compositeKey: compositeKey.substring(0, 40),
        });
        return false;
      }
    }

    // Get user's push token
    const userDoc = await admin.firestore().doc(`users/${targetUserId}`).get();
    const pushToken = userDoc.data()?.pushToken;

    if (!pushToken) {
      logger.warn('📵 No push token for user, skipping reminder', {
        userId: targetUserId.substring(0, 8),
      });
      return false;
    }

    // Create outbox doc
    const outboxDoc: ReminderOutboxDoc = {
      entityType,
      entityId,
      targetUserId,
      reminderType,
      title,
      body,
      data,
      scheduledFor: admin.firestore.Timestamp.fromDate(scheduledFor),
      createdAt: admin.firestore.Timestamp.now(),
      status: 'pending',
      attempts: 0,
      pushToken,
    };

    await admin.firestore()
      .collection('notification_outbox')
      .doc(compositeKey)
      .set(outboxDoc);

    logger.info('✅ Reminder created in outbox', {
      compositeKey: compositeKey.substring(0, 40),
      reminderType,
      targetUserId: targetUserId.substring(0, 8),
    });

    return true;
  } catch (error: any) {
    logger.error('❌ Error creating reminder outbox', {
      error: error.message,
      compositeKey,
    });
    return false;
  }
}

/**
 * Helper: Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Helper: Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

