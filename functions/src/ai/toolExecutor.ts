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
  ScheduleSuggestTimesInput,
  ScheduleSuggestTimesOutput,
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
} from '../types/toolTypes';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // ms

/**
 * Write-Once Guard: Track writes per execution to prevent duplicates
 * Key: correlationId, Value: Set of write categories that have been executed
 */
const executionWrites = new Map<string, Set<string>>();

/**
 * Get write category for a tool to enforce one-write-per-category rule
 */
function getWriteCategory(toolName: string): string {
  if (toolName.includes('create_event')) return 'event_write';
  if (toolName.includes('task.create')) return 'task_write';
  if (toolName.includes('messages.post_system')) return 'message_write';
  return 'other';
}

/**
 * Check if a write tool can be executed (write-once guard)
 * Returns false if this write category was already executed in this correlation
 */
function canExecuteWrite(correlationId: string | undefined, toolName: string): boolean {
  if (!correlationId) return true; // No tracking if no correlationId
  
  const writeCategory = getWriteCategory(toolName);
  if (writeCategory === 'other') return true; // Not a write tool
  
  if (!executionWrites.has(correlationId)) {
    executionWrites.set(correlationId, new Set());
  }
  
  const writes = executionWrites.get(correlationId)!;
  
  if (writes.has(writeCategory)) {
    logger.warn('🚫 Write already executed this round', {
      correlationId,
      toolName,
      category: writeCategory,
    });
    return false;
  }
  
  writes.add(writeCategory);
  return true;
}

/**
 * Clean up write tracking for a completed execution
 */
export function clearExecutionWrites(correlationId: string) {
  executionWrites.delete(correlationId);
}

/**
 * Executes a tool with retry logic and error handling
 * 
 * @param toolName - Name of the tool to execute
 * @param params - Tool parameters
 * @param context - Optional execution context (correlationId for write-once guard)
 * @returns ToolExecutionResult with success/data/error
 * 
 * @example
 * const result = await executeTool('time.parse', {
 *   text: 'tomorrow at 3pm',
 *   timezone: 'America/New_York'
 * }, { correlationId: '12345' });
 */
export async function executeTool(
  toolName: ToolName,
  params: any,
  context?: { correlationId?: string }
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  // Write-once guard: Check if this write was already executed
  if (!canExecuteWrite(context?.correlationId, toolName)) {
    return {
      success: true,
      data: { success: true, wasDeduped: true },
      attempts: 0,
      executionTime: Date.now() - startTime,
    };
  }

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
    
    case 'schedule.suggest_times':
      return handleScheduleSuggestTimes(params as any);
    
    case 'schedule.check_conflicts':
      return handleScheduleCheckConflicts(params as any);
    
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
  const { text, timezone } = params;

  logger.info('⏰ time.parse called', {
    text: text.substring(0, 50),
    timezone,
  });

  try {
    // Use chrono-node for deterministic parsing (no LLM!)
    const { parseDateTime } = await import('../utils/chronoParser');
    
    const result = parseDateTime(text, timezone);

    if (result.success) {
      logger.info('✅ time.parse successful (chrono-node)', {
        text: text.substring(0, 30),
        dateTime: result.startTime,
        confidence: result.confidence,
        usedLLM: false,
      });

      return {
        success: true,
        dateTime: result.startTime!,
        confidence: result.confidence,
      };
    }

    // If needs disambiguation, fallback to minimal LLM call
    if (result.needsDisambiguation && result.candidates && result.candidates.length > 0) {
      logger.info('🔄 time.parse needs disambiguation, using GPT-4o-mini', {
        text: text.substring(0, 30),
        candidatesCount: result.candidates.length,
      });

      const { generateObject } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      const { z } = await import('zod');

      const disambiguationPrompt = `Pick the most likely date/time for: "${text}"

Candidates:
${result.candidates.map((c, i) => `${i}. ${c.start}`).join('\n')}

Return the index of the best match.`;

      const choice = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({ chosenIndex: z.number().min(0).max(result.candidates.length - 1) }),
        prompt: disambiguationPrompt,
        maxTokens: 50,
        temperature: 0.3,
      });

      const chosen = result.candidates[choice.object.chosenIndex] || result.candidates[0];
      
      logger.info('✅ time.parse disambiguated', {
        chosenIndex: choice.object.chosenIndex,
        dateTime: chosen.start,
      });

      return {
        success: true,
        dateTime: chosen.start,
        confidence: 0.8,
      };
    }

    // Neither deterministic nor disambiguatable  
    logger.warn('❌ time.parse failed', {
      text: text.substring(0, 50),
      error: result.error,
    });

    // Return the specific error (especially PAST_DATE for friendly rejection)
    return {
      success: false,
      confidence: result.confidence,
      error: result.error || 'NO_DATE_FOUND',
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
    // Fetch ALL participants from the conversation
    // This ensures both users see the event, not just the sender
    const convDoc = await admin.firestore().doc(`conversations/${conversationId}`).get();
    const conversationData = convDoc.data();
    const allParticipants = conversationData?.participants || participants;

    logger.info('📋 Participants fetched from conversation', {
      provided: participants.length,
      actual: allParticipants.length,
      participantIds: allParticipants,
    });

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Idempotency: Check if event already exists
    const normalizedTitle = title.toLowerCase().trim();
    const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const idempotencyKey = `${conversationId}_${normalizedTitle}_${dateKey}`;

    // Query by idempotencyKey only (no index required since it's a single equality filter)
    const existingEvent = await admin.firestore()
      .collection('events')
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();

    if (!existingEvent.empty) {
      const existingEventId = existingEvent.docs[0].id;
      logger.info('✅ Event already exists (idempotent)', {
        eventId: existingEventId,
        idempotencyKey,
      });
      
      return {
        success: true,
        eventId: existingEventId,
        hasConflict: false,
        wasDeduped: true,
      };
    }

    // PR10: Check for conflicts BEFORE creating event
    const { handleEventConflict } = await import('./conflictHandler');
    
    const conflictResult = await handleEventConflict(
      {
        title,
        startTime: startDate,
        endTime: endDate,
        participants: allParticipants,
        createdBy,
      },
      conversationId,
      timezone
    );

    // Create the event first (needed for eventId in conflict message)
    const eventRef = await admin.firestore().collection('events').add({
      title,
      startTime: admin.firestore.Timestamp.fromDate(startDate),
      endTime: admin.firestore.Timestamp.fromDate(endDate),
      participants: allParticipants,
      status: conflictResult.hasConflict ? 'pending' : 'pending', // Could use 'conflict' status
      conversationId,
      createdBy,
      rsvps: {},
      hasConflict: conflictResult.hasConflict || false, // Flag for UI
      idempotencyKey, // ADD IDEMPOTENCY KEY
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('✅ Event created in Firestore', {
      eventId: eventRef.id,
      title,
      hasConflict: conflictResult.hasConflict,
    });

    // If conflict was detected, update the conflict message with the actual eventId
    if (conflictResult.hasConflict && conversationId) {
      logger.info('🔄 Updating conflict message with eventId', {
        eventId: eventRef.id,
      });
      
      const { updateConflictWithEventId } = await import('./conflictHandler');
      await updateConflictWithEventId(conversationId, eventRef.id);
    }

    // Skip fallback confirmation if there's a conflict
    // The conflict handler already posted the conflict card
    if (conflictResult.hasConflict) {
      logger.info('⚠️ Conflict detected, skipping fallback confirmation', {
        eventId: eventRef.id,
      });
      
      return {
        success: true,
        eventId: eventRef.id,
        hasConflict: true,
        conflictMessage: conflictResult.conflictMessage,
      };
    }

    // Smart fallback: Wait a moment for GPT-4 to post confirmation, then check if it did
    // This ensures we always have a confirmation without creating duplicates
    setTimeout(async () => {
      try {
        // Check if a confirmation message was already posted with this eventId
        const recentMessages = await admin.firestore()
          .collection('conversations')
          .doc(conversationId)
          .collection('messages')
          .where('senderId', '==', 'assistant')
          .where('meta.eventId', '==', eventRef.id)
          .limit(1)
          .get();
        
        if (recentMessages.empty) {
          // No confirmation found, post fallback message
          logger.warn('⚠️ GPT-4 did not post confirmation, using fallback', {
            eventId: eventRef.id,
          });

          const localDate = new Date(startDate.getTime());
          const dateStr = localDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: timezone,
          });
          const timeStr = localDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: timezone,
          });

          const confirmationText = `I've scheduled ${title} for ${dateStr} at ${timeStr}.`;

          await handleMessagesPostSystem({
            conversationId,
            text: confirmationText,
            meta: {
              type: 'event',
              eventId: eventRef.id,
              title,
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
              status: 'pending',
            },
          });
        } else {
          logger.info('✅ Confirmation already posted by GPT-4', {
            eventId: eventRef.id,
          });
        }
      } catch (fallbackError: any) {
        logger.error('❌ Fallback confirmation failed', {
          error: fallbackError.message,
          eventId: eventRef.id,
        });
      }
    }, 2000); // Wait 2 seconds for GPT-4 to finish

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

async function handleScheduleSuggestTimes(params: ScheduleSuggestTimesInput): Promise<ScheduleSuggestTimesOutput> {
  const { participants, preferences, timezone } = params;

  logger.info('🔍 schedule.suggest_times called', {
    participants: participants.length,
    timeframe: preferences.timeframe,
    timeOfDay: preferences.timeOfDay,
  });

  try {
    // Use conflict resolver's generateAlternatives logic but for open-ended availability
    // This finds free slots across all participants
    const { generateAlternatives } = await import('./conflictResolver');
    const { getUserWorkingHours } = await import('../utils/availability');
    
    // Get working hours for primary user (first participant)
    const primaryUser = participants[0];
    const workingHours = await getUserWorkingHours(primaryUser);
    
    // Create a "fake" conflict context to reuse alternative generation logic
    // The conflict engine will find free slots
    const now = new Date();
    
    const context = {
      proposedStartTime: now, // Not actually proposing, just need context
      proposedEndTime: new Date(now.getTime() + (preferences.duration || 60) * 60 * 1000),
      conflictingEvents: [], // Empty - we want all free slots
      userId: primaryUser,
      timezone,
      sessionDuration: preferences.duration || 60,
      workingHours,
    };
    
    // Generate alternatives (which are actually availability suggestions)
    const alternatives = await generateAlternatives(context);
    
    // Filter by timeOfDay preference if specified
    let filtered = alternatives;
    if (preferences.timeOfDay && preferences.timeOfDay !== 'anytime') {
      filtered = alternatives.filter(alt => {
        const hour = new Date(alt.startTime).getUTCHours();
        
        switch (preferences.timeOfDay) {
          case 'morning':
            return hour >= 6 && hour < 12;
          case 'afternoon':
            return hour >= 12 && hour < 17;
          case 'evening':
            return hour >= 17 && hour < 21;
          default:
            return true;
        }
      });
    }
    
    // Take top 3
    const suggestions = filtered.slice(0, 3).map(alt => ({
      startTime: alt.startTime.toISOString(),
      endTime: alt.endTime.toISOString(),
      label: alt.reason || 'Available slot',
      score: alt.score,
    }));
    
    logger.info('✅ Time suggestions generated', {
      count: suggestions.length,
      timeOfDay: preferences.timeOfDay,
    });
    
    return {
      success: true,
      suggestions,
    };
  } catch (error: any) {
    logger.error('❌ Suggest times failed', {
      error: error.message,
    });
    
    return {
      success: false,
      error: `SUGGEST_TIMES_FAILED: ${error.message}`,
    };
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
  const { eventId, userId, response, conversationId } = params;

  logger.info('✓ rsvp.record_response called', {
    eventId: eventId.substring(0, 8),
    userId: userId.substring(0, 8),
    response,
  });

  try {
    // Try to find the event - first by ID, then by searching recent events in conversation
    let eventRef = admin.firestore().collection('events').doc(eventId);
    let eventDoc = await eventRef.get();
    
    // If event doesn't exist, try to find it by searching recent events in this conversation
    if (!eventDoc.exists) {
      logger.warn('⚠️ Event ID not found, searching by conversation', {
        providedEventId: eventId,
        conversationId: conversationId?.substring(0, 12),
      });

      // Find recent events in this conversation (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const eventsQuery = await admin.firestore()
        .collection('events')
        .where('conversationId', '==', conversationId)
        .where('startTime', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .orderBy('startTime', 'desc')
        .limit(10)
        .get();

      if (!eventsQuery.empty) {
        // Use the most recent upcoming event (best guess)
        const now = new Date();
        const upcomingEvent = eventsQuery.docs.find(doc => doc.data().startTime.toDate() > now);
        
        if (upcomingEvent) {
          eventRef = upcomingEvent.ref;
          eventDoc = upcomingEvent;
          logger.info('✅ Found matching event by conversation lookup', {
            actualEventId: eventRef.id,
            title: upcomingEvent.data().title,
          });
        } else {
          // No upcoming events, use the most recent one
          eventRef = eventsQuery.docs[0].ref;
          eventDoc = eventsQuery.docs[0];
          logger.info('✅ Using most recent event (no upcoming found)', {
            actualEventId: eventRef.id,
            title: eventsQuery.docs[0].data().title,
          });
        }
      }
    }

    // Update event with RSVP response
    await eventRef.update({
      [`rsvps.${userId}`]: {
        response,
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Determine new event status based on responses
    eventDoc = await eventRef.get();
    const eventData = eventDoc.data();
    const rsvps = eventData?.rsvps || {};
    
    // Simple logic: if all participants responded with 'accept', status is 'confirmed'
    const participants = eventData?.participants || [];
    const allAccepted = participants.every((pid: string) => rsvps[pid]?.response === 'accept');
    const anyDeclined = Object.values(rsvps).some((r: any) => r.response === 'decline');
    
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
    // Idempotency: Check if task already exists
    const normalizedTitle = title.toLowerCase().trim();
    const dueDateStr = dueDate ? new Date(dueDate).toISOString().split('T')[0] : 'no-due-date';
    const idempotencyKey = `${conversationId}_${normalizedTitle}_${dueDateStr}`;

    // Query by idempotencyKey only (no index required since it's a single equality filter)
    const existingTask = await admin.firestore()
      .collection('deadlines')
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();

    if (!existingTask.empty) {
      const existingTaskId = existingTask.docs[0].id;
      logger.info('✅ Task already exists (idempotent)', {
        taskId: existingTaskId,
        idempotencyKey,
      });
      
      return {
        success: true,
        taskId: existingTaskId,
        wasDeduped: true,
      };
    }

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
      idempotencyKey, // ADD IDEMPOTENCY KEY
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
    // Remove loading message if it exists
    // Use simple query with NO composite index requirement
    try {
      // Get all recent messages (no where clause = no index needed)
      const recentMessages = await admin.firestore()
        .collection('conversations')
        .doc(params.conversationId)
        .collection('messages')
        .orderBy('serverTimestamp', 'desc')
        .limit(20) // Check last 20 messages (broader net)
        .get();
      
      // Filter client-side for loading messages from assistant
      const loadingMessages = recentMessages.docs.filter(
        doc => doc.data().senderId === 'assistant' && doc.data().meta?.type === 'ai_loading'
      );
      
      if (loadingMessages.length > 0) {
        const deletePromises = loadingMessages.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);
        logger.info('🗑️ Removed loading message(s)', {
          count: loadingMessages.length,
          conversationId: params.conversationId.substring(0, 12),
        });
      } else {
        logger.info('ℹ️ No loading messages found to remove', {
          conversationId: params.conversationId.substring(0, 12),
        });
      }
    } catch (cleanupError: any) {
      logger.warn('⚠️ Could not clean up loading message', {
        error: cleanupError.message,
        conversationId: params.conversationId.substring(0, 12),
      });
      // Continue with posting message even if cleanup fails
    }

    // Message Deduplication: Check if confirmation already exists for this entity
    if (params.meta?.eventId || params.meta?.deadlineId) {
      const entityId = params.meta.eventId || params.meta.deadlineId;
      const entityField = params.meta.eventId ? 'meta.eventId' : 'meta.deadlineId';
      
      const existingConfirmation = await admin.firestore()
        .collection('conversations')
        .doc(params.conversationId)
        .collection('messages')
        .where('senderId', '==', 'assistant')
        .where(entityField, '==', entityId)
        .limit(1)
        .get();
      
      if (!existingConfirmation.empty) {
        logger.info('✅ Confirmation already exists (deduped)', { 
          entityId,
          messageId: existingConfirmation.docs[0].id,
        });
        
        return {
          success: true,
          messageId: existingConfirmation.docs[0].id,
          wasDeduped: true,
        };
      }
    }

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

