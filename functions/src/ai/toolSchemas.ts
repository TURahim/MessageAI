/**
 * Tool Schemas for AI Function Calling
 * 
 * Defines all 8 tools with Zod validation
 * CRITICAL: timezone is REQUIRED in time/schedule tools
 * Strict validation: ISO 8601 UTC, IANA timezones, non-empty constraints
 */

import { tool } from 'ai';
import { z } from 'zod';

// 1. Custom validators for stricter validation
const ISO_UTC = z.string().datetime().refine(
  (val) => val.endsWith('Z'),
  { message: 'Must be ISO 8601 UTC (ending with Z)' }
);

const IANATimezone = z.string().refine(
  (val) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: val });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Must be a valid IANA timezone (e.g., America/Toronto)' }
);

const NonEmptyString = z.string().min(1);
const UserId = z.string().min(8); // Firebase UIDs are typically 28 chars
const ConversationId = z.string().min(8);
const EventTitle = z.string().min(1).max(200);

/**
 * 1. time.parse - Parse natural language date/time
 * 
 * CRITICAL: timezone is REQUIRED
 */
export const timeParseSchema = tool({
  description: 'Parse natural language date/time into structured format. MUST include timezone.',
  parameters: z.strictObject({
    text: NonEmptyString.describe('Natural language date/time (e.g., "tomorrow at 3pm")'),
    timezone: IANATimezone.describe('REQUIRED - IANA timezone (e.g., "America/Toronto")'),
    referenceDate: ISO_UTC.optional().describe('ISO8601 reference date in UTC, defaults to now'),
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
  parameters: z.strictObject({
    title: EventTitle.describe('Event title (e.g., "Math Tutoring")'),
    startTime: ISO_UTC.describe('ISO8601 start time in UTC (must end with Z)'),
    endTime: ISO_UTC.describe('ISO8601 end time in UTC (must end with Z)'),
    timezone: IANATimezone.describe('REQUIRED - IANA timezone for display'),
    participants: z.array(UserId).min(1).describe('Array of user IDs (at least 1)'),
    conversationId: ConversationId.describe('Associated conversation ID'),
    createdBy: UserId.describe('Creator user ID'),
  }),
});

/**
 * 3. schedule.check_conflicts - Check for scheduling conflicts
 * 
 * CRITICAL: timezone is REQUIRED
 */
export const scheduleCheckConflictsSchema = tool({
  description: 'Check if a time slot conflicts with existing events',
  parameters: z.strictObject({
    userId: UserId.describe('User ID to check conflicts for'),
    startTime: ISO_UTC.describe('ISO8601 start time in UTC (must end with Z)'),
    endTime: ISO_UTC.describe('ISO8601 end time in UTC (must end with Z)'),
    timezone: IANATimezone.describe('REQUIRED - IANA timezone for DST handling'),
  }),
});

/**
 * 4. rsvp.create_invite - Create event invite message
 */
export const rsvpCreateInviteSchema = tool({
  description: 'Create an event invitation message in the conversation',
  parameters: z.strictObject({
    eventId: NonEmptyString.describe('Event ID from schedule.create_event'),
    conversationId: ConversationId.describe('Conversation to post invite in'),
    message: NonEmptyString.max(1000).describe('AI-generated invitation text'),
  }),
});

/**
 * 5. rsvp.record_response - Record RSVP response
 * 
 * 4. Normalized to 'accept' | 'decline' (matches interpreter output)
 */
export const rsvpRecordResponseSchema = tool({
  description: 'Record a user\'s response to an event invitation',
  parameters: z.strictObject({
    eventId: NonEmptyString.describe('Event ID'),
    userId: UserId.describe('User ID responding'),
    response: z.enum(['accept', 'decline']).describe('Response type (accept or decline)'),
    conversationId: ConversationId.describe('Conversation ID'),
  }),
});

/**
 * 6. task.create - Create homework/deadline
 */
export const taskCreateSchema = tool({
  description: 'Create a homework assignment or deadline',
  parameters: z.strictObject({
    title: NonEmptyString.max(200).describe('Task title (e.g., "Math homework Chapter 5")'),
    dueDate: ISO_UTC.describe('ISO8601 due date in UTC (must end with Z)'),
    assignee: UserId.describe('User ID assigned to'),
    conversationId: ConversationId.describe('Associated conversation ID'),
    createdBy: UserId.describe('Creator user ID (usually assistant)'),
  }),
});

/**
 * 7. reminders.schedule - Schedule reminder notification
 */
export const remindersScheduleSchema = tool({
  description: 'Schedule a reminder notification for an event or task',
  parameters: z.strictObject({
    entityType: z.enum(['event', 'task']).describe('Type of entity'),
    entityId: NonEmptyString.describe('Event or task ID'),
    targetUserId: UserId.describe('User to remind'),
    reminderType: z.enum(['24h', '2h', 'due']).describe('Reminder timing'),
    scheduledFor: ISO_UTC.describe('ISO8601 time to send reminder in UTC (must end with Z)'),
  }),
});

/**
 * 8. messages.post_system - Post assistant message
 * 
 * 6. Strengthened text validation
 */
export const messagesPostSystemSchema = tool({
  description: 'Post a system/assistant message in the conversation',
  parameters: z.strictObject({
    conversationId: ConversationId.describe('Conversation ID'),
    text: z.string().min(1).max(4000).describe('Message text (1-4000 chars)'),
    meta: z.record(z.unknown()).optional().describe('Message metadata (EventMeta, DeadlineMeta, etc.)'),
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
 * 
 * 7. Minimal tool sets to reduce spurious calls
 */
export function getToolsForTaskType(taskType: string) {
  switch (taskType) {
    case 'scheduling':
      // Include rsvp.create_invite for sending invitations
      return {
        'time.parse': timeParseSchema,
        'schedule.create_event': scheduleCreateEventSchema,
        'schedule.check_conflicts': scheduleCheckConflictsSchema,
        'rsvp.create_invite': rsvpCreateInviteSchema,
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
      // Urgent can check conflicts for rescheduling
      return {
        'schedule.check_conflicts': scheduleCheckConflictsSchema,
        'messages.post_system': messagesPostSystemSchema,
      };
    default:
      // 7. Avoid allToolSchemas fallback - only allow posting messages
      return {
        'messages.post_system': messagesPostSystemSchema,
      };
  }
}

