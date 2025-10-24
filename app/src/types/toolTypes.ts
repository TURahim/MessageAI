/**
 * Tool Type Definitions
 * 
 * Defines all 8 tools for the AI function calling framework
 * Used by both client (TypeScript) and Cloud Functions (runtime validation)
 */

/**
 * Tool names enum for type safety
 */
export type ToolName =
  | 'time.parse'
  | 'schedule.create_event'
  | 'schedule.check_conflicts'
  | 'rsvp.create_invite'
  | 'rsvp.record_response'
  | 'task.create'
  | 'reminders.schedule'
  | 'messages.post_system';

/**
 * time.parse tool - Parse natural language date/time
 */
export interface TimeParseInput {
  text: string; // Natural language time (e.g., "tomorrow at 3pm")
  timezone: string; // REQUIRED - IANA timezone
  referenceDate?: string; // ISO string, defaults to now
}

export interface TimeParseOutput {
  success: boolean;
  dateTime?: string; // ISO8601 in UTC
  confidence: number;
  error?: string;
}

/**
 * schedule.create_event tool - Create calendar event
 */
export interface ScheduleCreateEventInput {
  title: string;
  startTime: string; // ISO8601 in UTC
  endTime: string; // ISO8601 in UTC
  timezone: string; // REQUIRED - IANA timezone
  participants: string[]; // User IDs
  conversationId: string;
  createdBy: string; // User ID
}

export interface ScheduleCreateEventOutput {
  success: boolean;
  eventId?: string;
  hasConflict?: boolean;
  conflictMessage?: string;
  wasDeduped?: boolean; // Idempotency: true if event already existed
  error?: string;
}

/**
 * schedule.check_conflicts tool - Check for scheduling conflicts
 */
export interface ScheduleCheckConflictsInput {
  userId: string;
  startTime: string; // ISO8601 in UTC
  endTime: string; // ISO8601 in UTC
  timezone: string; // REQUIRED - IANA timezone
}

export interface ScheduleCheckConflictsOutput {
  success: boolean;
  hasConflict: boolean;
  conflictMessage?: string;
  suggestedAlternatives?: Array<{
    startTime: string;
    endTime: string;
    reason: string;
  }>;
  conflictingEvents?: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  }>;
  error?: string;
}

/**
 * rsvp.create_invite tool - Create event invite message
 */
export interface RSVPCreateInviteInput {
  eventId: string;
  conversationId: string;
  message: string; // AI-generated invite text
}

export interface RSVPCreateInviteOutput {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * rsvp.record_response tool - Record RSVP response
 */
export interface RSVPRecordResponseInput {
  eventId: string;
  userId: string;
  response: 'accept' | 'decline'; // Normalized to match interpreter output
  conversationId: string;
}

export interface RSVPRecordResponseOutput {
  success: boolean;
  updatedStatus?: 'pending' | 'confirmed' | 'declined';
  error?: string;
}

/**
 * task.create tool - Create homework/deadline
 */
export interface TaskCreateInput {
  title: string;
  dueDate: string; // ISO8601 in UTC
  assignee: string; // User ID
  conversationId: string;
  createdBy: string; // User ID (assistant)
}

export interface TaskCreateOutput {
  success: boolean;
  taskId?: string;
  wasDeduped?: boolean; // Idempotency: true if task already existed
  error?: string;
}

/**
 * reminders.schedule tool - Schedule reminder notification
 */
export interface RemindersScheduleInput {
  entityType: 'event' | 'task';
  entityId: string;
  targetUserId: string;
  reminderType: '24h' | '2h' | 'due';
  scheduledFor: string; // ISO8601 in UTC
}

export interface RemindersScheduleOutput {
  success: boolean;
  reminderId?: string;
  error?: string;
}

/**
 * messages.post_system tool - Post assistant message
 */
export interface MessagesPostSystemInput {
  conversationId: string;
  text: string;
  meta?: Record<string, any>; // EventMeta, DeadlineMeta, etc.
}

export interface MessagesPostSystemOutput {
  success: boolean;
  messageId?: string;
  wasDeduped?: boolean; // Idempotency: true if message already existed
  wasReplacement?: boolean; // Loading card: true if replaced loading message
  error?: string;
}

/**
 * Tool execution result (generic)
 */
export interface ToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  attempts?: number;
  executionTime?: number; // milliseconds
}

