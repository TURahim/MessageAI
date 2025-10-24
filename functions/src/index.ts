import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { analyzeMessage } from './ai/messageAnalyzer';
import { embedMessage } from './rag/embeddingService';
import { sendUrgentNotifications } from './notifications/urgentNotifier';
import { scheduleEventReminders, scheduleTaskReminders } from './notifications/reminderScheduler';
import { processOutboxNotification } from './notifications/outboxWorker';
import type { ReminderOutboxDoc } from './notifications/reminderScheduler';
import { processUnconfirmedEvents } from './ai/autonomousMonitor';
import { processLongGapAlerts } from './ai/nudgeGenerator';

// Export admin viewer (PR3)
export { viewFailedOps } from './admin/failedOpsViewer';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Expo SDK
const expo = new Expo();

/**
 * Cloud Function: Send push notifications when a new message is created
 * Triggers on: /conversations/{conversationId}/messages/{messageId} onCreate
 */
export const sendMessageNotification = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    const conversationId = context.params.conversationId;
    const messageId = context.params.messageId;

    console.log('📬 New message created:', {
      conversationId: conversationId.substring(0, 12),
      messageId: messageId.substring(0, 8),
      sender: message.senderId?.substring(0, 8),
      type: message.type,
    });

    try {
      // Get conversation to find recipients
      const convDoc = await admin.firestore()
        .doc(`conversations/${conversationId}`)
        .get();

      if (!convDoc.exists) {
        console.warn('⚠️ Conversation not found:', conversationId);
        return;
      }

      const conversation = convDoc.data();
      if (!conversation) return;

      // Get recipients (everyone except sender)
      const recipients: string[] = conversation.participants.filter(
        (uid: string) => uid !== message.senderId
      );

      console.log(`📤 Sending notifications to ${recipients.length} recipient(s)`);

      // Fetch user documents for all recipients
      const userDocs = await Promise.all(
        recipients.map((uid: string) =>
          admin.firestore().doc(`users/${uid}`).get()
        )
      );

      // Build push notification messages
      const pushMessages: ExpoPushMessage[] = [];

      for (const userDoc of userDocs) {
        if (!userDoc.exists) {
          console.warn('⚠️ User document not found:', userDoc.id);
          continue;
        }

        const userData = userDoc.data();
        if (!userData) continue;

        const pushToken = userData.pushToken;

        // Skip if user has no push token
        if (!pushToken) {
          console.log(`📵 No push token for user: ${userDoc.id.substring(0, 8)}`);
          continue;
        }

        // Skip if user is currently viewing this conversation (suppression)
        if (userData.presence?.activeConversationId === conversationId) {
          console.log(`🔕 Suppressed for user: ${userDoc.id.substring(0, 8)} (viewing conversation)`);
          continue;
        }

        // Validate Expo push token
        if (!Expo.isExpoPushToken(pushToken)) {
          console.warn(`⚠️ Invalid push token for user: ${userDoc.id.substring(0, 8)}`);
          continue;
        }

        // Format notification body
        const body = message.type === 'image' 
          ? '📷 Image' 
          : (message.text || 'New message');

        // Add to batch
        pushMessages.push({
          to: pushToken,
          sound: 'default',
          title: message.senderName || 'New Message',
          body: body.substring(0, 200), // Limit length
          data: {
            conversationId,
            messageId,
            type: 'message',
          },
          badge: 1, // Increment badge
          priority: 'high',
          channelId: 'messages', // Android notification channel
        });

        console.log(`✅ Queued push for user: ${userDoc.id.substring(0, 8)}`);
      }

      // Send notifications in chunks (Expo recommends batching)
      if (pushMessages.length === 0) {
        console.log('📭 No push notifications to send (all suppressed or no tokens)');
        return;
      }

      const chunks = expo.chunkPushNotifications(pushMessages);
      const tickets = [];

      console.log(`📤 Sending ${pushMessages.length} notification(s) in ${chunks.length} chunk(s)`);

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          console.log(`✅ Chunk sent: ${ticketChunk.length} tickets`);
        } catch (error) {
          console.error('❌ Error sending push notification chunk:', error);
        }
      }

      // Log any errors from tickets
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error('❌ Push notification error:', ticket.message);
        }
      }

      console.log(`🎉 Push notification job complete: ${tickets.length} sent`);
    } catch (error) {
      console.error('❌ Error in sendMessageNotification function:', error);
      // Don't throw - allow message to be created even if notifications fail
    }
  });

/**
 * Cloud Function: Analyze messages for AI processing (PR1 - Gating Only)
 * Triggers on: /conversations/{conversationId}/messages/{messageId} onCreate
 * 
 * Phase 1 (PR1): Just gating classifier
 * Phase 2 (PR2-3): Add RAG + full tool calling
 */
export const onMessageCreated = onDocumentCreated({
  document: 'conversations/{conversationId}/messages/{messageId}',
  region: 'us-central1',
  timeoutSeconds: 30,
  memory: '256MiB',
}, async (event) => {
  const messageId = event.params.messageId;
  const conversationId = event.params.conversationId;
  const messageData = event.data?.data();

  if (!messageData) {
    logger.warn('⚠️ No message data found');
    return;
  }

  // Skip messages from assistant (avoid loops)
  if (messageData.senderId === 'assistant') {
    logger.info('⏭️ Skipping assistant message');
    return;
  }

  // Skip non-text messages (images don't need AI)
  if (messageData.type !== 'text' || !messageData.text) {
    logger.info('⏭️ Skipping non-text message', { type: messageData.type });
    return;
  }

  try {
    // Check for system actions before gating (reschedule, cancel, etc.)
    if (messageData.meta?.action === 'reschedule_event') {
      logger.info('🔄 Reschedule action detected', {
        conflictId: messageData.meta.conflictId,
        alternativeIndex: messageData.meta.alternativeIndex,
      });

      const { handleAlternativeSelection } = await import('./ai/conflictHandler');
      await handleAlternativeSelection(
        messageData.meta.conflictId,
        messageData.meta.alternativeIndex,
        conversationId,
        messageData.senderId
      );

      // Delete the system action message (don't show in chat)
      await admin.firestore()
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId)
        .delete();
      
      return;
    }

    // Check for manual override in metadata
    const bypassGating = messageData.meta?.bypassGating === true;

    // Analyze message with gating classifier
    const analysis = await analyzeMessage({
      id: messageId,
      conversationId,
      senderId: messageData.senderId,
      text: messageData.text,
      createdAt: messageData.serverTimestamp?.toDate() || new Date(),
      meta: messageData.meta,
    }, bypassGating);

    if (analysis.shouldProcess) {
      logger.info('🚀 Message requires AI processing', {
        task: analysis.gating.task,
        confidence: analysis.gating.confidence,
      });

      // PR9: Handle urgent messages
      if (analysis.urgency && analysis.urgency.shouldNotify) {
        logger.info('🚨 Urgent message detected - sending notifications', {
          category: analysis.urgency.category,
          confidence: analysis.urgency.confidence,
        });

        // Send urgent push notifications immediately
        await sendUrgentNotifications({
          messageId,
          conversationId,
          senderId: messageData.senderId,
          senderName: messageData.senderName || 'Someone',
          messageText: messageData.text,
          urgency: analysis.urgency,
        });
      }

      // PR11: Handle task/deadline extraction
      if (analysis.task && analysis.task.found && analysis.task.confidence >= 0.7) {
        logger.info('📝 Task detected - creating deadline', {
          title: analysis.task.title,
          confidence: analysis.task.confidence,
          taskType: analysis.task.taskType,
        });

        const { createDeadlineFromExtraction } = await import('./ai/taskExtractor');

        // Determine assignee (could be sender or mentioned participant)
        // For now, use conversation participants (first non-sender)
        const convDoc = await admin.firestore().doc(`conversations/${conversationId}`).get();
        const participants = convDoc.data()?.participants || [];
        const assignee = participants.find((p: string) => p !== messageData.senderId) || messageData.senderId;

        await createDeadlineFromExtraction(
          conversationId,
          analysis.task,
          assignee,
          messageData.senderId
        );
      }

      // Full AI orchestration for scheduling, RSVP, and reminders
      if (analysis.gating.task === 'scheduling' || 
          analysis.gating.task === 'rsvp' ||
          analysis.gating.task === 'reminder') {
        
        const correlationId = messageId.substring(0, 8);

        // Post loading message immediately for better UX
        try {
          await admin.firestore()
            .collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .add({
              senderId: 'assistant',
              senderName: 'JellyDM Assistant',
              text: '📅 Processing your request...',
              type: 'text',
              status: 'sent',
              meta: {
                role: 'assistant',
                type: 'ai_loading',
                triggerTask: analysis.gating.task,
                correlationId, // Store correlationId for replacement tracking
              },
              clientTimestamp: admin.firestore.FieldValue.serverTimestamp(),
              serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
              readBy: [],
              readCount: 0,
              retryCount: 0,
            });
          logger.info('⏳ Posted loading message for AI orchestration', {
            correlationId,
          });
        } catch (loadingError: any) {
          logger.warn('⚠️ Failed to post loading message', {
            error: loadingError.message,
          });
          // Continue with orchestration even if loading message fails
        }

        // Try fast-path for scheduling first
        const { FEATURE_FLAGS } = await import('./config/features');
        
        logger.info('🔍 Fast-path decision point', {
          correlationId,
          USE_FAST_PATH_SCHEDULING: FEATURE_FLAGS.USE_FAST_PATH_SCHEDULING,
          taskType: analysis.gating.task,
          willAttemptFastPath: FEATURE_FLAGS.USE_FAST_PATH_SCHEDULING && analysis.gating.task === 'scheduling',
        });
        
        if (FEATURE_FLAGS.USE_FAST_PATH_SCHEDULING && analysis.gating.task === 'scheduling') {
          logger.info('⚡ Attempting fast-path scheduling', {
            correlationId,
          });

          const { scheduleFastPath } = await import('./ai/fastPathOrchestrator');
          const fastPathResult = await scheduleFastPath(
            {
              id: messageId,
              conversationId,
              senderId: messageData.senderId,
              senderName: messageData.senderName,
              text: messageData.text,
              createdAt: messageData.serverTimestamp?.toDate() || new Date(),
            },
            correlationId
          );

          if (fastPathResult.usedFastPath) {
            logger.info('✅ Fast-path scheduling succeeded', {
              correlationId,
              eventId: fastPathResult.eventId,
              latency: fastPathResult.latency,
            });
            return; // Done - skip full LLM orchestration
          }

          // Fast-path failed, continue to full orchestration
          logger.warn('⚠️ Fast-path failed, falling back to full LLM orchestration', {
            correlationId,
            reason: fastPathResult.reason,
          });
        }

        // Full LLM orchestration (fallback or non-scheduling tasks)
        logger.info('🎯 Triggering full AI orchestration', {
          task: analysis.gating.task,
          correlationId,
        });

        const { processMessageWithAI } = await import('./ai/messageAnalyzer');
        await processMessageWithAI(
          {
            id: messageId,
            conversationId,
            senderId: messageData.senderId,
            senderName: messageData.senderName,
            text: messageData.text,
            createdAt: messageData.serverTimestamp?.toDate() || new Date(),
            meta: messageData.meta,
          },
          analysis.gating
        );
      }
    } else {
      logger.info('✅ Message gated out', {
        reason: analysis.reason,
        task: analysis.gating.task,
        confidence: analysis.gating.confidence,
      });
    }
  } catch (error: any) {
    logger.error('❌ Error analyzing message', {
      messageId: messageId.substring(0, 8),
      error: error.message,
      stack: error.stack,
    });
    // Don't throw - allow message creation even if AI processing fails
  }
});

/**
 * Cloud Function: Generate embeddings for messages (PR2 - RAG Pipeline)
 * Triggers on: /conversations/{conversationId}/messages/{messageId} onCreate
 * 
 * Batches upserts every 30s for cost efficiency (via batching in extension)
 * Stores in /vector_messages collection for RAG retrieval
 */
export const generateMessageEmbedding = onDocumentCreated({
  document: 'conversations/{conversationId}/messages/{messageId}',
  region: 'us-central1',
  timeoutSeconds: 60,
  memory: '512MiB',
}, async (event) => {
  const messageId = event.params.messageId;
  const conversationId = event.params.conversationId;
  const messageData = event.data?.data();

  if (!messageData) {
    logger.warn('⚠️ No message data found');
    return;
  }

  // Only embed text messages
  if (messageData.type !== 'text' || !messageData.text) {
    logger.info('⏭️ Skipping non-text message for embedding', { type: messageData.type });
    return;
  }

  // Skip assistant messages (don't embed our own responses)
  if (messageData.senderId === 'assistant') {
    logger.info('⏭️ Skipping assistant message for embedding');
    return;
  }

  try {
    // Generate embedding
    const embedding = await embedMessage(messageData.text);

    // Store in vector_messages collection
    await admin.firestore().collection('vector_messages').doc(messageId).set({
      content: messageData.text,
      embedding,
      metadata: {
        conversationId,
        senderId: messageData.senderId,
        timestamp: messageData.serverTimestamp || admin.firestore.FieldValue.serverTimestamp(),
        messageType: messageData.type,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('✅ Embedding stored', {
      messageId: messageId.substring(0, 8),
      conversationId: conversationId.substring(0, 12),
      dimensions: embedding.length,
    });
  } catch (error: any) {
    logger.error('❌ Embedding generation/storage failed', {
      messageId: messageId.substring(0, 8),
      error: error.message,
    });
    // Don't throw - allow message creation even if embedding fails
  }
});

/**
 * Cloud Function: Scheduled Reminder Scheduler (PR12)
 * Runs every hour to schedule reminders for upcoming events and tasks
 */
export const scheduledReminderJob = onSchedule({
  schedule: 'every 1 hours',
  region: 'us-central1',
  timeoutSeconds: 120,
  memory: '256MiB',
}, async () => {
  logger.info('⏰ Running scheduled reminder job');

  try {
    // Schedule event reminders (24h and 2h before)
    const eventReminders = await scheduleEventReminders();

    // Schedule task reminders (due today, overdue)
    const taskReminders = await scheduleTaskReminders();

    // PR13: Check for unconfirmed events and send nudges
    const unconfirmedNudges = await processUnconfirmedEvents();

    // PR14: Post-session note prompts (for all tutors)
    // Note: In production, would iterate through active tutors
    // For now, handled per-user when they're active

    logger.info('✅ Reminder scheduling complete', {
      eventReminders,
      taskReminders,
      unconfirmedNudges,
      total: eventReminders + taskReminders + unconfirmedNudges,
    });
  } catch (error: any) {
    logger.error('❌ Reminder scheduling failed', {
      error: error.message,
      stack: error.stack,
    });
  }
});

/**
 * Cloud Function: Outbox Worker (PR12)
 * Triggers when notification_outbox documents are written
 * Sends push notifications with retry logic
 */
export const outboxWorker = onDocumentWritten({
  document: 'notification_outbox/{docId}',
  region: 'us-central1',
  timeoutSeconds: 30,
  memory: '256MiB',
}, async (event) => {
  const docId = event.params.docId;
  const afterData = event.data?.after?.data();

  if (!afterData) {
    logger.info('⏭️ Document deleted, skipping');
    return;
  }

  const outboxDoc = afterData as ReminderOutboxDoc;

  // Only process pending notifications
  if (outboxDoc.status !== 'pending') {
    logger.info('⏭️ Not pending, skipping', {
      docId: docId.substring(0, 40),
      status: outboxDoc.status,
    });
    return;
  }

  try {
    await processOutboxNotification(docId, outboxDoc);
  } catch (error: any) {
    logger.error('❌ Outbox worker failed', {
      docId: docId.substring(0, 40),
      error: error.message,
    });
  }
});

/**
 * Cloud Function: Daily Nudge Job (PR13-14)
 * Runs once per day to check for long gaps and send alerts
 * Less frequent than reminders to avoid spam
 */
export const dailyNudgeJob = onSchedule({
  schedule: 'every day 09:00',
  region: 'us-central1',
  timeoutSeconds: 300,
  memory: '512MiB',
}, async () => {
  logger.info('📅 Running daily nudge job');

  try {
    // Get all active tutors (users who created events in last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const recentEventsSnapshot = await admin.firestore()
      .collection('events')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
      .get();

    const tutorIds = new Set<string>();
    recentEventsSnapshot.docs.forEach(doc => {
      const createdBy = doc.data().createdBy;
      if (createdBy) tutorIds.add(createdBy);
    });

    logger.info('📊 Processing nudges for active tutors', {
      tutorCount: tutorIds.size,
    });

    let totalLongGapAlerts = 0;

    for (const tutorId of tutorIds) {
      // Process long gap alerts for each tutor
      const alerts = await processLongGapAlerts(tutorId);
      totalLongGapAlerts += alerts;
    }

    logger.info('✅ Daily nudge job complete', {
      tutors: tutorIds.size,
      longGapAlerts: totalLongGapAlerts,
    });
  } catch (error: any) {
    logger.error('❌ Daily nudge job failed', {
      error: error.message,
      stack: error.stack,
    });
  }
});

