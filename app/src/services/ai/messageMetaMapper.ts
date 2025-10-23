/**
 * Message Meta Mapper
 * 
 * Maps tool outputs to MessageMeta structure for UI rendering
 * Decouples backend tool outputs from frontend component contracts
 * 
 * Benefits:
 * - Easier schema evolution
 * - Clear contract between AI and UI
 * - Type-safe transformations
 * - Centralized mapping logic
 */

import { Timestamp } from 'firebase/firestore';
import type {
  MessageMeta,
  EventMeta,
  DeadlineMeta,
  RSVPMeta,
  ConflictMeta,
} from '@/types/index';
import type {
  ScheduleCreateEventOutput,
  TaskCreateOutput,
  RSVPCreateInviteOutput,
  ScheduleCheckConflictsOutput,
} from '@/types/toolTypes';

/**
 * Maps schedule.create_event output to EventMeta
 * 
 * @param output - Tool output from schedule.create_event
 * @param additionalData - Additional event data needed for meta
 * @returns EventMeta for message.meta.event
 */
export function mapEventToMeta(
  output: ScheduleCreateEventOutput,
  additionalData: {
    title: string;
    startTime: Date;
    endTime: Date;
    participants: string[];
    status?: 'pending' | 'confirmed' | 'declined';
  }
): EventMeta {
  if (!output.success || !output.eventId) {
    throw new Error('Cannot map unsuccessful event creation to meta');
  }

  return {
    eventId: output.eventId,
    title: additionalData.title,
    startTime: Timestamp.fromDate(additionalData.startTime),
    endTime: Timestamp.fromDate(additionalData.endTime),
    participants: additionalData.participants,
    status: additionalData.status || 'pending',
  };
}

/**
 * Maps task.create output to DeadlineMeta
 * 
 * @param output - Tool output from task.create
 * @param additionalData - Additional task data
 * @returns DeadlineMeta for message.meta.deadline
 */
export function mapTaskToMeta(
  output: TaskCreateOutput,
  additionalData: {
    title: string;
    dueDate: Date;
    assignee?: string;
    completed?: boolean;
  }
): DeadlineMeta {
  if (!output.success || !output.taskId) {
    throw new Error('Cannot map unsuccessful task creation to meta');
  }

  return {
    deadlineId: output.taskId,
    title: additionalData.title,
    dueDate: Timestamp.fromDate(additionalData.dueDate),
    assignee: additionalData.assignee,
    completed: additionalData.completed || false,
  };
}

/**
 * Maps rsvp.create_invite output to RSVPMeta
 * 
 * @param output - Tool output from rsvp.create_invite
 * @param eventId - Event ID for RSVP tracking
 * @returns RSVPMeta for message.meta.rsvp
 */
export function mapRSVPToMeta(
  output: RSVPCreateInviteOutput,
  eventId: string
): RSVPMeta {
  if (!output.success) {
    throw new Error('Cannot map unsuccessful RSVP invite to meta');
  }

  return {
    eventId,
    responses: {}, // Empty initially, filled as users respond
  };
}

/**
 * Maps schedule.check_conflicts output to ConflictMeta
 * 
 * @param output - Tool output from schedule.check_conflicts
 * @param suggestedAlternatives - AI-generated alternatives
 * @param conflictMessage - Conflict description
 * @returns ConflictMeta for message.meta.conflict
 */
export function mapConflictToMeta(
  output: ScheduleCheckConflictsOutput,
  conflictMessage: string,
  suggestedAlternatives?: Array<{
    startTime: Date;
    endTime: Date;
    reason?: string;
  }>
): ConflictMeta {
  if (!output.success || !output.hasConflict) {
    throw new Error('Cannot map no-conflict result to ConflictMeta');
  }

  return {
    conflictId: `conflict_${Date.now()}`,
    message: conflictMessage,
    suggestedAlternatives: suggestedAlternatives?.map(alt => ({
      startTime: Timestamp.fromDate(alt.startTime),
      endTime: Timestamp.fromDate(alt.endTime),
      reason: alt.reason,
    })),
  };
}

/**
 * Creates complete MessageMeta from multiple tool outputs
 * 
 * @param outputs - Map of tool name → output
 * @returns Complete MessageMeta object
 * 
 * @example
 * const meta = mapToolOutputsToMeta({
 *   'schedule.create_event': eventOutput,
 *   'rsvp.create_invite': rsvpOutput,
 * }, additionalData);
 */
export function mapToolOutputsToMeta(
  outputs: Record<string, any>,
  additionalData: Record<string, any>
): MessageMeta {
  const meta: MessageMeta = {
    role: 'assistant',
  };

  // Map event creation
  if (outputs['schedule.create_event'] && outputs['schedule.create_event'].success) {
    meta.event = mapEventToMeta(outputs['schedule.create_event'], additionalData.event);
    meta.eventId = meta.event.eventId;
  }

  // Map RSVP
  if (outputs['rsvp.create_invite'] && outputs['rsvp.create_invite'].success) {
    meta.rsvp = mapRSVPToMeta(outputs['rsvp.create_invite'], additionalData.eventId);
  }

  // Map task
  if (outputs['task.create'] && outputs['task.create'].success) {
    meta.deadline = mapTaskToMeta(outputs['task.create'], additionalData.task);
    meta.deadlineId = meta.deadline.deadlineId;
  }

  // Map conflict
  if (outputs['schedule.check_conflicts'] && outputs['schedule.check_conflicts'].hasConflict) {
    meta.conflict = mapConflictToMeta(
      outputs['schedule.check_conflicts'],
      additionalData.conflictMessage,
      additionalData.suggestedAlternatives
    );
  }

  return meta;
}

