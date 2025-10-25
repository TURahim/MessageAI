/**
 * Message Templates
 * 
 * Templated responses for common AI actions
 * Eliminates LLM calls for predictable confirmations
 * 
 * POLICY: All times rendered per-viewer using formatInUserTimezone
 */

import { formatInUserTimezone } from '../utils/timezoneUtils';

/**
 * Format event scheduling confirmation
 * Template: "I've scheduled {title} for {day}, {month} {date} at {time}."
 * 
 * @param title - Event title
 * @param startTimeUTC - ISO UTC string
 * @param userId - User ID for timezone formatting
 */
export async function formatEventConfirmation(
  title: string,
  startTimeUTC: string,
  userId: string
): Promise<string> {
  const formatted = await formatInUserTimezone(startTimeUTC, userId, 'long');
  return `I've scheduled ${title} for ${formatted}.`;
}

/**
 * Format decline notification for group chat
 */
export function formatDeclineNotification(
  userName: string,
  eventTitle: string
): string {
  return `📅 ${userName} has declined "${eventTitle}". The event status has been updated.`;
}

/**
 * Format accept notification for group chat
 */
export function formatAcceptNotification(
  userName: string,
  eventTitle: string
): string {
  return `✅ ${userName} has confirmed attendance for "${eventTitle}".`;
}

/**
 * Format conflict warning with alternatives
 * NOTE: Conflict warnings are now rendered client-side in ConflictWarning component
 * This function is deprecated - keeping for backward compatibility
 */
export function formatConflictWarning(
  title: string,
  conflictCount: number,
  conflictingEvents: Array<{ title: string; startTime: Date }>,
  alternatives: Array<{ startTime: string; endTime: string; reason?: string }>,
  timezone: string
): string {
  // Conflicts are now shown via ConflictWarning component (per-viewer rendering)
  // This function returns empty string - component handles all formatting
  return '';
}

/**
 * Format event cancellation confirmation
 */
export function formatCancellationConfirmation(
  title: string,
  userName: string
): string {
  return `❌ ${userName} has cancelled "${title}".`;
}

/**
 * Format reschedule confirmation
 */
export async function formatRescheduleConfirmation(
  title: string,
  newStartTimeUTC: string,
  userId: string
): Promise<string> {
  const formatted = await formatInUserTimezone(newStartTimeUTC, userId, 'long');
  return `🔄 I've rescheduled ${title} to ${formatted}.`;
}

