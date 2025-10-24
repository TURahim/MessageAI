/**
 * Tool Executor
 * 
 * Executes AI function calls with:
 * - Timezone validation at runtime
 * - Retry logic with exponential backoff (1s, 2s, 4s)
 * - Failed operations logging
 * - Error handling and recovery
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { validateTimezone } from '../utils/timezoneUtils';
import { TIMEZONE_REQUIRED_TOOLS } from './toolSchemas';
import type {
  ToolName,
  ToolExecutionResult,
  TimeParseInput,
  TimeParseOutput,
  ScheduleCreateEventInput,
  ScheduleCreateEventOutput,
  ScheduleCheckConflictsInput,
  ScheduleCheckConflictsOutput,
  RSVPCreateInviteInput,
  RSVPCreateInviteOutput,
  RSVPRecordResponseInput,
  RSVPRecordResponseOutput,
  TaskCreateInput,
  TaskCreateOutput,
  RemindersScheduleInput,
  RemindersScheduleOutput,
  MessagesPostSystemInput,
  MessagesPostSystemOutput,
} from '../../../app/src/types/toolTypes';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // ms

/**
 * Executes a tool with retry logic and error handling
 * 
 * @param toolName - Name of the tool to execute
 * @param params - Tool parameters
 * @returns ToolExecutionResult with success/data/error
 * 
 * @example
 * const result = await executeTool('time.parse', {
 *   text: 'tomorrow at 3pm',
 *   timezone: 'America/New_York'
 * });
 */
export async function executeTool(
  toolName: ToolName,
  params: any
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  // CRITICAL: Validate timezone for time/schedule tools
  if (TIMEZONE_REQUIRED_TOOLS.includes(toolName)) {
    try {
      validateTimezone(params.timezone);
    } catch (error: any) {
      logger.error('❌ Timezone validation failed', {
        toolName,
        timezone: params.timezone,
        error: error.message,
      });

      return {
        success: false,
        error: `TIMEZONE_VALIDATION_FAILED: ${error.message}`,
        attempts: 0,
        executionTime: Date.now() - startTime,
      };
    }
  }

  // Execute with retry logic
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      logger.info(`🔧 Executing tool (attempt ${attempt + 1}/${MAX_RETRIES})`, {
        toolName,
        paramsPreview: JSON.stringify(params).substring(0, 100),
      });

      // Route to appropriate handler
      const result = await executeToolHandler(toolName, params);

      const executionTime = Date.now() - startTime;

      logger.info('✅ Tool execution successful', {
        toolName,
        attempts: attempt + 1,
        executionTime,
      });

      return {
        success: true,
        data: result,
        attempts: attempt + 1,
        executionTime,
      };
    } catch (error: any) {
      logger.error(`❌ Tool execution failed (attempt ${attempt + 1}/${MAX_RETRIES})`, {
        toolName,
        error: error.message,
      });

      // If last attempt, log to failed_operations and return error
      if (attempt === MAX_RETRIES - 1) {
        await logFailedOperation(toolName, params, error, MAX_RETRIES);

        return {
          success: false,
          error: error.message,
          attempts: MAX_RETRIES,
          executionTime: Date.now() - startTime,
        };
      }

      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }

  // Should never reach here
  return {
    success: false,
    error: 'UNEXPECTED_ERROR: Retry loop completed without result',
    attempts: MAX_RETRIES,
    executionTime: Date.now() - startTime,
  };
}

/**
 * Routes tool call to appropriate handler
 */
async function executeToolHandler(toolName: ToolName, params: any): Promise<any> {
  switch (toolName) {
    case 'time.parse':
      return handleTimeParse(params as TimeParseInput);
    
    case 'schedule.create_event':
      return handleScheduleCreateEvent(params as ScheduleCreateEventInput);
    
    case 'schedule.check_conflicts':
      return handleScheduleCheckConflicts(params as ScheduleCheckConflictsInput);
    
    case 'rsvp.create_invite':
      return handleRSVPCreateInvite(params as RSVPCreateInviteInput);
    
    case 'rsvp.record_response':
      return handleRSVPRecordResponse(params as RSVPRecordResponseInput);
    
    case 'task.create':
      return handleTaskCreate(params as TaskCreateInput);
    
    case 'reminders.schedule':
      return handleRemindersSchedule(params as RemindersScheduleInput);
    
    case 'messages.post_system':
      return handleMessagesPostSystem(params as MessagesPostSystemInput);
    
    default:
      throw new Error(`UNKNOWN_TOOL: ${toolName}`);
  }
}

/**
 * Tool Handlers (Implementations)
 */

async function handleTimeParse(params: TimeParseInput): Promise<TimeParseOutput> {
  const { text, timezone, referenceDate } = params;

  logger.info('⏰ time.parse called', {
    text: text.substring(0, 50),
    timezone,
  });

  try {
    // Import AI SDK and date utilities
    const { generateObject } = await import('ai');
    const { openai } = await import('@ai-sdk/openai');
    const { z } = await import('zod');
    const { format } = await import('date-fns');

    // Build context for LLM
    const now = referenceDate ? new Date(referenceDate) : new Date();
    const nowInTimezone = format(now, 'PPPP'); // e.g., "Monday, January 15th, 2024"
    
    const enhancedPrompt = `Today is ${nowInTimezone}. The timezone is ${timezone}.

Extract the date and time from this message. Calculate relative dates (tomorrow, Friday, next week) based on today's date.

Message: "${text}"

Return the parsed date/time information.`;

    // Use structured output for reliable JSON parsing
    const result = await generateObject({
      model: openai('gpt-4-turbo'),
      schema: z.object({
        found: z.boolean().describe('Whether a date/time was found in the message'),
        dateTime: z.string().optional().describe('ISO8601 date/time in UTC if found'),
        duration: z.number().optional().describe('Duration in minutes if mentioned'),
        confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
        explanation: z.string().optional().describe('Brief explanation of the parsing'),
      }),
      prompt: enhancedPrompt,
      temperature: 0.3, // Deterministic
      maxTokens: 150,
    });

    const parsed = result.object;

    if (!parsed.found || !parsed.dateTime) {
      return {
        success: false,
        confidence: parsed.confidence,
        error: 'NO_DATE_FOUND: Could not extract date/time from message',
      };
    }

    // Validate the parsed date is in UTC ISO8601 format
    const parsedDate = new Date(parsed.dateTime);
    if (isNaN(parsedDate.getTime())) {
      return {
        success: false,
        confidence: parsed.confidence,
        error: 'INVALID_DATE: LLM returned invalid ISO8601 date',
      };
    }

    logger.info('✅ time.parse successful', {
      text: text.substring(0, 30),
      dateTime: parsed.dateTime,
      confidence: parsed.confidence,
      explanation: parsed.explanation,
    });

    return {
      success: true,
      dateTime: parsed.dateTime,
      confidence: parsed.confidence,
    };
  } catch (error: any) {
    logger.error('❌ time.parse failed', {
      text: text.substring(0, 50),
      error: error.message,
    });

    throw new Error(`TIME_PARSE_FAILED: ${error.message}`);
  }
}

async function handleScheduleCreateEvent(params: ScheduleCreateEventInput): Promise<ScheduleCreateEventOutput> {
  const { title, startTime, endTime, timezone, participants, conversationId, createdBy } = params;

  logger.info('📅 schedule.create_event called', {
    title,
    participants: participants.length,
    timezone,
  });

  try {
    // PR10: Check for conflicts BEFORE creating event
    const { handleEventConflict } = await import('./conflictHandler');
    
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    const conflictResult = await handleEventConflict(
      {
        title,
        startTime: startDate,
        endTime: endDate,
        participants,
        createdBy,
      },
      conversationId,
      timezone
    );

    // If conflict detected, alternatives are already posted to conversation
    // Still create the event but mark it with conflict warning
    const eventRef = await admin.firestore().collection('events').add({
      title,
      startTime: admin.firestore.Timestamp.fromDate(startDate),
      endTime: admin.firestore.Timestamp.fromDate(endDate),
      participants,
      status: conflictResult.hasConflict ? 'pending' : 'pending', // Could use 'conflict' status
      conversationId,
      createdBy,
      rsvps: {},
      hasConflict: conflictResult.hasConflict || false, // Flag for UI
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('✅ Event created in Firestore', {
      eventId: eventRef.id,
      title,
      hasConflict: conflictResult.hasConflict,
    });

    return {
      success: true,
      eventId: eventRef.id,
      hasConflict: conflictResult.hasConflict,
      conflictMessage: conflictResult.conflictMessage,
    };
  } catch (error: any) {
    logger.error('❌ Event creation failed', {
      error: error.message,
      title,
    });

    throw new Error(`SCHEDULE_CREATE_FAILED: ${error.message}`);
  }
}

async function handleScheduleCheckConflicts(params: ScheduleCheckConflictsInput): Promise<ScheduleCheckConflictsOutput> {
  const { userId, startTime, endTime, timezone } = params;

  logger.info('🔍 schedule.check_conflicts called', {
    userId: userId.substring(0, 8),
    startTime,
    endTime,
    timezone,
  });

  try {
    // PR10: Use conflict handler to detect conflicts
    const { handleEventConflict } = await import('./conflictHandler');
    
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    const conflictResult = await handleEventConflict(
      {
        title: 'Proposed Session', // Placeholder
        startTime: startDate,
        endTime: endDate,
        participants: [userId],
        createdBy: userId,
      },
      '', // No conversation context for check-only
      timezone
    );

    if (conflictResult.hasConflict) {
      logger.info('⚠️ Conflicts detected', {
        count: conflictResult.alternatives?.length || 0,
      });

      return {
        success: true,
        hasConflict: true,
        conflictMessage: conflictResult.conflictMessage,
        suggestedAlternatives: conflictResult.alternatives?.map(alt => ({
          startTime: alt.startTime.toISOString(),
          endTime: alt.endTime.toISOString(),
          reason: alt.reason,
        })),
      };
    }

    logger.info('✅ No conflicts detected');

    return {
      success: true,
      hasConflict: false,
    };
  } catch (error: any) {
    logger.error('❌ Conflict check failed', {
      error: error.message,
    });

    throw new Error(`SCHEDULE_CHECK_CONFLICTS_FAILED: ${error.message}`);
  }
}

async function handleRSVPCreateInvite(params: RSVPCreateInviteInput): Promise<RSVPCreateInviteOutput> {
  const { eventId, conversationId, message } = params;

  logger.info('📧 rsvp.create_invite called', {
    eventId: eventId.substring(0, 8),
    conversationId: conversationId.substring(0, 12),
  });

  try {
    // Create assistant message with RSVP invite
    // This message will have meta.event + meta.rsvp which triggers
    // EventCard and RSVPButtons rendering in the UI
    
    const messageRef = await admin.firestore()
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add({
        senderId: 'assistant',
        type: 'text',
        text: message,
        meta: {
          role: 'assistant',
          eventId,
          rsvp: {
            eventId,
            responses: {}, // Empty initially, filled as users respond
          },
        },
        clientTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        retryCount: 0,
        readBy: [],
        readCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    logger.info('✅ RSVP invite created', {
      messageId: messageRef.id.substring(0, 8),
      eventId: eventId.substring(0, 8),
    });

    return {
      success: true,
      messageId: messageRef.id,
    };
  } catch (error: any) {
    logger.error('❌ RSVP invite creation failed', {
      error: error.message,
      eventId,
    });

    throw new Error(`RSVP_CREATE_FAILED: ${error.message}`);
  }
}

async function handleRSVPRecordResponse(params: RSVPRecordResponseInput): Promise<RSVPRecordResponseOutput> {
  const { eventId, userId, response } = params;

  logger.info('✓ rsvp.record_response called', {
    eventId: eventId.substring(0, 8),
    userId: userId.substring(0, 8),
    response,
  });

  try {
    // Update event with RSVP response
    const eventRef = admin.firestore().collection('events').doc(eventId);
    
    await eventRef.update({
      [`rsvps.${userId}`]: {
        response,
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Determine new event status based on responses
    const eventDoc = await eventRef.get();
    const eventData = eventDoc.data();
    const rsvps = eventData?.rsvps || {};
    
    // Simple logic: if all participants responded with 'accepted', status is 'confirmed'
    const participants = eventData?.participants || [];
    const allAccepted = participants.every((pid: string) => rsvps[pid]?.response === 'accepted');
    const anyDeclined = Object.values(rsvps).some((r: any) => r.response === 'declined');
    
    let updatedStatus: 'pending' | 'confirmed' | 'declined' = 'pending';
    if (allAccepted && Object.keys(rsvps).length === participants.length) {
      updatedStatus = 'confirmed';
    } else if (anyDeclined) {
      updatedStatus = 'declined';
    }

    // Update event status
    await eventRef.update({ status: updatedStatus });

    logger.info('✅ RSVP recorded and status updated', {
      eventId: eventId.substring(0, 8),
      userId: userId.substring(0, 8),
      updatedStatus,
    });

    return {
      success: true,
      updatedStatus,
    };
  } catch (error: any) {
    logger.error('❌ RSVP recording failed', {
      error: error.message,
      eventId,
    });

    throw new Error(`RSVP_RECORD_FAILED: ${error.message}`);
  }
}

async function handleTaskCreate(params: TaskCreateInput): Promise<TaskCreateOutput> {
  const { title, dueDate, assignee, conversationId, createdBy } = params;

  logger.info('📝 task.create called', {
    title,
    assignee: assignee.substring(0, 8),
    dueDate,
  });

  try {
    // Get assignee name for display
    const assigneeDoc = await admin.firestore().doc(`users/${assignee}`).get();
    const assigneeName = assigneeDoc.data()?.displayName || 'Unknown';

    // Create deadline in Firestore
    const deadlineRef = await admin.firestore().collection('deadlines').add({
      title,
      dueDate: admin.firestore.Timestamp.fromDate(new Date(dueDate)),
      assignee,
      assigneeName,
      conversationId,
      completed: false,
      createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('✅ Deadline created in Firestore', {
      deadlineId: deadlineRef.id,
      title,
    });

    // Post assistant message with deadline metadata
    await admin.firestore()
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add({
        senderId: 'assistant',
        senderName: 'JellyDM Assistant',
        type: 'text',
        text: `📝 I've added "${title}" to ${assigneeName}'s task list (due ${new Date(dueDate).toLocaleDateString()}).`,
        clientTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        retryCount: 0,
        readBy: [],
        readCount: 0,
        meta: {
          role: 'assistant',
          deadlineId: deadlineRef.id,
          deadline: {
            deadlineId: deadlineRef.id,
            title,
            dueDate: admin.firestore.Timestamp.fromDate(new Date(dueDate)),
            assignee: assigneeName,
          },
        },
      });

    return {
      success: true,
      taskId: deadlineRef.id,
    };
  } catch (error: any) {
    logger.error('❌ Task creation failed', {
      error: error.message,
      title,
    });

    throw new Error(`TASK_CREATE_FAILED: ${error.message}`);
  }
}

async function handleRemindersSchedule(params: RemindersScheduleInput): Promise<RemindersScheduleOutput> {
  const { entityType, entityId, targetUserId, reminderType, scheduledFor } = params;

  logger.info('⏰ reminders.schedule called', {
    entityType,
    entityId: entityId.substring(0, 8),
    targetUserId: targetUserId.substring(0, 8),
    reminderType,
  });

  try {
    // Get entity details for notification content
    let title = '';
    let body = '';
    let data: Record<string, any> = {};

    if (entityType === 'event') {
      const eventDoc = await admin.firestore().collection('events').doc(entityId).get();
      if (!eventDoc.exists) {
        throw new Error('EVENT_NOT_FOUND');
      }

      const event = eventDoc.data();
      const eventStart = event?.startTime.toDate();
      
      if (reminderType === '24h') {
        title = `Reminder: ${event?.title}`;
        body = `You have "${event?.title}" tomorrow at ${formatTime(eventStart)}`;
      } else if (reminderType === '2h') {
        title = `Reminder: ${event?.title} in 2 hours`;
        body = `Your session starts at ${formatTime(eventStart)}`;
      }

      data = {
        eventId: entityId,
        conversationId: event?.conversationId,
        type: 'event_reminder',
      };
    } else if (entityType === 'task') {
      const taskDoc = await admin.firestore().collection('deadlines').doc(entityId).get();
      if (!taskDoc.exists) {
        throw new Error('TASK_NOT_FOUND');
      }

      const task = taskDoc.data();
      const dueDate = task?.dueDate.toDate();

      title = `Reminder: ${task?.title}`;
      body = `Due ${formatDate(dueDate)}`;
      
      data = {
        deadlineId: entityId,
        conversationId: task?.conversationId,
        type: 'task_reminder',
      };
    }

    // Get user's push token
    const userDoc = await admin.firestore().doc(`users/${targetUserId}`).get();
    const pushToken = userDoc.data()?.pushToken;

    if (!pushToken) {
      logger.warn('📵 No push token for user', {
        userId: targetUserId.substring(0, 8),
      });
      return {
        success: false,
        error: 'NO_PUSH_TOKEN',
      };
    }

    // Generate composite key for idempotency
    const compositeKey = `${entityType}_${entityId}_${targetUserId}_${reminderType}`;

    // Check if reminder already exists
    const existingDoc = await admin.firestore()
      .collection('notification_outbox')
      .doc(compositeKey)
      .get();

    if (existingDoc.exists && existingDoc.data()?.status === 'sent') {
      logger.info('⏭️ Reminder already sent', {
        compositeKey: compositeKey.substring(0, 40),
      });
      return {
        success: true,
        reminderId: compositeKey,
      };
    }

    // Create outbox document
    await admin.firestore()
      .collection('notification_outbox')
      .doc(compositeKey)
      .set({
        entityType,
        entityId,
        targetUserId,
        reminderType,
        title,
        body,
        data,
        scheduledFor: admin.firestore.Timestamp.fromDate(new Date(scheduledFor)),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        attempts: 0,
        pushToken,
      });

    logger.info('✅ Reminder scheduled', {
      compositeKey: compositeKey.substring(0, 40),
      scheduledFor,
    });

    return {
      success: true,
      reminderId: compositeKey,
    };
  } catch (error: any) {
    logger.error('❌ Reminder scheduling failed', {
      error: error.message,
    });

    throw new Error(`REMINDERS_SCHEDULE_FAILED: ${error.message}`);
  }
}

function formatTime(date: Date): string {
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

async function handleMessagesPostSystem(params: MessagesPostSystemInput): Promise<MessagesPostSystemOutput> {
  // Implement immediately - this is ready to use
  try {
    const messageRef = await admin.firestore()
      .collection('conversations')
      .doc(params.conversationId)
      .collection('messages')
      .add({
        senderId: 'assistant',
        type: 'text',
        text: params.text,
        meta: params.meta || {},
        clientTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        retryCount: 0,
        readBy: [],
        readCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    logger.info('✅ Assistant message posted', {
      messageId: messageRef.id.substring(0, 8),
      conversationId: params.conversationId.substring(0, 12),
    });

    return {
      success: true,
      messageId: messageRef.id,
    };
  } catch (error: any) {
    throw new Error(`MESSAGES_POST_FAILED: ${error.message}`);
  }
}

/**
 * Logs failed operation to Firestore for debugging
 */
async function logFailedOperation(
  toolName: ToolName,
  params: any,
  error: Error,
  attempts: number
): Promise<void> {
  try {
    // Redact sensitive params
    const redactedParams = { ...params };
    if (redactedParams.text) {
      redactedParams.text = `[REDACTED ${redactedParams.text.length} chars]`;
    }

    await admin.firestore().collection('failed_operations').add({
      toolName,
      params: redactedParams,
      error: error.message,
      attempts,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: params.userId || params.createdBy || 'unknown',
      conversationId: params.conversationId || 'unknown',
    });

    logger.warn('📝 Failed operation logged', {
      toolName,
      attempts,
      error: error.message,
    });
  } catch (logError: any) {
    logger.error('❌ Failed to log failed operation', {
      toolName,
      error: logError.message,
    });
  }
}

