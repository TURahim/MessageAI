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
    // Create event in Firestore
    const eventRef = await admin.firestore().collection('events').add({
      title,
      startTime: admin.firestore.Timestamp.fromDate(new Date(startTime)),
      endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
      participants,
      status: 'pending',
      conversationId,
      createdBy,
      rsvps: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('✅ Event created in Firestore', {
      eventId: eventRef.id,
      title,
    });

    return {
      success: true,
      eventId: eventRef.id,
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
  // TODO (PR10): Implement with conflictService
  logger.info('⚠️ schedule.check_conflicts called (TODO: implement in PR10)', params);
  
  return {
    success: false,
    hasConflict: false,
    error: 'NOT_IMPLEMENTED: schedule.check_conflicts will be implemented in PR10',
  };
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
  // TODO (PR11): Implement with taskService
  logger.info('✅ task.create called (TODO: implement in PR11)', params);
  
  return {
    success: false,
    error: 'NOT_IMPLEMENTED: task.create will be implemented in PR11',
  };
}

async function handleRemindersSchedule(params: RemindersScheduleInput): Promise<RemindersScheduleOutput> {
  // TODO (PR12): Implement with reminderService
  logger.info('⏰ reminders.schedule called (TODO: implement in PR12)', params);
  
  return {
    success: false,
    error: 'NOT_IMPLEMENTED: reminders.schedule will be implemented in PR12',
  };
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

