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
  // TODO (PR4): Implement with LLM date parsing
  // For now, placeholder
  logger.info('⏰ time.parse called (TODO: implement in PR4)', params);
  
  return {
    success: false,
    confidence: 0,
    error: 'NOT_IMPLEMENTED: time.parse will be implemented in PR4',
  };
}

async function handleScheduleCreateEvent(params: ScheduleCreateEventInput): Promise<ScheduleCreateEventOutput> {
  // TODO (PR5): Implement with eventService
  logger.info('📅 schedule.create_event called (TODO: implement in PR5)', params);
  
  return {
    success: false,
    error: 'NOT_IMPLEMENTED: schedule.create_event will be implemented in PR5',
  };
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
  // TODO (PR7): Implement with rsvpService
  logger.info('📧 rsvp.create_invite called (TODO: implement in PR7)', params);
  
  return {
    success: false,
    error: 'NOT_IMPLEMENTED: rsvp.create_invite will be implemented in PR7',
  };
}

async function handleRSVPRecordResponse(params: RSVPRecordResponseInput): Promise<RSVPRecordResponseOutput> {
  // TODO (PR7): Implement with rsvpService
  logger.info('✓ rsvp.record_response called (TODO: implement in PR7)', params);
  
  return {
    success: false,
    error: 'NOT_IMPLEMENTED: rsvp.record_response will be implemented in PR7',
  };
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

