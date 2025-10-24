/**
 * Tool Schemas for AI Function Calling
 * 
 * Defines all 8 tools with Zod validation
 * CRITICAL: timezone is REQUIRED in time/schedule tools
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * 1. time.parse - Parse natural language date/time
 * 
 * CRITICAL: timezone is REQUIRED
 */
export const timeParseSchema = tool({
  description: 'Parse natural language date/time into structured format. MUST include timezone.',
  parameters: z.object({
    text: z.string().describe('Natural language date/time (e.g., "tomorrow at 3pm")'),
    timezone: z.string().describe('REQUIRED - IANA timezone (e.g., "America/New_York")'),
    referenceDate: z.string().optional().describe('ISO8601 reference date, defaults to now'),
  }),
  // execute will be provided by toolExecutor
});

/**
 * 2. schedule.create_event - Create calendar event
 * 
 * CRITICAL: timezone is REQUIRED
 */
export const scheduleCreateEventSchema = tool({
  description: 'Create a new calendar event for a tutoring session',
  parameters: z.object({
    title: z.string().describe('Event title (e.g., "Math Tutoring")'),
    startTime: z.string().describe('ISO8601 start time in UTC'),
    endTime: z.string().describe('ISO8601 end time in UTC'),
    timezone: z.string().describe('REQUIRED - IANA timezone for display'),
    participants: z.array(z.string()).describe('Array of user IDs'),
    conversationId: z.string().describe('Associated conversation ID'),
    createdBy: z.string().describe('Creator user ID'),
  }),
});

/**
 * 3. schedule.check_conflicts - Check for scheduling conflicts
 * 
 * CRITICAL: timezone is REQUIRED
 */
export const scheduleCheckConflictsSchema = tool({
  description: 'Check if a time slot conflicts with existing events',
  parameters: z.object({
    userId: z.string().describe('User ID to check conflicts for'),
    startTime: z.string().describe('ISO8601 start time in UTC'),
    endTime: z.string().describe('ISO8601 end time in UTC'),
    timezone: z.string().describe('REQUIRED - IANA timezone for DST handling'),
  }),
});

/**
 * 4. rsvp.create_invite - Create event invite message
 */
export const rsvpCreateInviteSchema = tool({
  description: 'Create an event invitation message in the conversation',
  parameters: z.object({
    eventId: z.string().describe('Event ID from schedule.create_event'),
    conversationId: z.string().describe('Conversation to post invite in'),
    message: z.string().describe('AI-generated invitation text'),
  }),
});

/**
 * 5. rsvp.record_response - Record RSVP response
 */
export const rsvpRecordResponseSchema = tool({
  description: 'Record a user\'s response to an event invitation',
  parameters: z.object({
    eventId: z.string().describe('Event ID'),
    userId: z.string().describe('User ID responding'),
    response: z.enum(['accepted', 'declined']).describe('Response type'),
    conversationId: z.string().describe('Conversation ID'),
  }),
});

/**
 * 6. task.create - Create homework/deadline
 */
export const taskCreateSchema = tool({
  description: 'Create a homework assignment or deadline',
  parameters: z.object({
    title: z.string().describe('Task title (e.g., "Math homework Chapter 5")'),
    dueDate: z.string().describe('ISO8601 due date in UTC'),
    assignee: z.string().describe('User ID assigned to'),
    conversationId: z.string().describe('Associated conversation ID'),
    createdBy: z.string().describe('Creator user ID (usually assistant)'),
  }),
});

/**
 * 7. reminders.schedule - Schedule reminder notification
 */
export const remindersScheduleSchema = tool({
  description: 'Schedule a reminder notification for an event or task',
  parameters: z.object({
    entityType: z.enum(['event', 'task']).describe('Type of entity'),
    entityId: z.string().describe('Event or task ID'),
    targetUserId: z.string().describe('User to remind'),
    reminderType: z.enum(['24h', '2h', 'due']).describe('Reminder timing'),
    scheduledFor: z.string().describe('ISO8601 time to send reminder in UTC'),
  }),
});

/**
 * 8. messages.post_system - Post assistant message
 */
export const messagesPostSystemSchema = tool({
  description: 'Post a system/assistant message in the conversation',
  parameters: z.object({
    conversationId: z.string().describe('Conversation ID'),
    text: z.string().describe('Message text'),
    meta: z.record(z.any()).optional().describe('Message metadata (EventMeta, DeadlineMeta, etc.)'),
  }),
});

/**
 * All tools export for use in generateText
 */
export const allToolSchemas = {
  'time.parse': timeParseSchema,
  'schedule.create_event': scheduleCreateEventSchema,
  'schedule.check_conflicts': scheduleCheckConflictsSchema,
  'rsvp.create_invite': rsvpCreateInviteSchema,
  'rsvp.record_response': rsvpRecordResponseSchema,
  'task.create': taskCreateSchema,
  'reminders.schedule': remindersScheduleSchema,
  'messages.post_system': messagesPostSystemSchema,
};

/**
 * Tool names that require timezone parameter
 * Used for runtime validation in toolExecutor
 */
export const TIMEZONE_REQUIRED_TOOLS: string[] = [
  'time.parse',
  'schedule.create_event',
  'schedule.check_conflicts',
];

/**
 * Get relevant tools based on task type
 * Used by GPT-4 orchestration to limit tool selection
 */
export function getToolsForTaskType(taskType: string) {
  switch (taskType) {
    case 'scheduling':
      return {
        'time.parse': timeParseSchema,
        'schedule.create_event': scheduleCreateEventSchema,
        'schedule.check_conflicts': scheduleCheckConflictsSchema,
        'messages.post_system': messagesPostSystemSchema,
      };
    case 'rsvp':
      return {
        'rsvp.record_response': rsvpRecordResponseSchema,
        'messages.post_system': messagesPostSystemSchema,
      };
    case 'task':
      return {
        'task.create': taskCreateSchema,
        'messages.post_system': messagesPostSystemSchema,
      };
    case 'deadline':
      // Deadlines are similar to tasks but with required due dates
      return {
        'task.create': taskCreateSchema,
        'messages.post_system': messagesPostSystemSchema,
      };
    case 'reminder':
      // Reminders can create tasks or send notifications
      return {
        'task.create': taskCreateSchema,
        'reminders.schedule': remindersScheduleSchema,
        'messages.post_system': messagesPostSystemSchema,
      };
    case 'urgent':
      return {
        'messages.post_system': messagesPostSystemSchema,
      };
    default:
      return allToolSchemas; // Fallback to all tools
  }
}

