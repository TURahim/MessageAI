/**
 * Message Templates
 * 
 * Templated responses for common AI actions
 * Eliminates LLM calls for predictable confirmations
 */

import { DateTime } from 'luxon';

/**
 * Format event scheduling confirmation
 * Template: "I've scheduled {title} for {day}, {month} {date} at {time}."
 */
export function formatEventConfirmation(
  title: string,
  startTimeUTC: string,
  timezone: string
): string {
  const dt = DateTime.fromISO(startTimeUTC).setZone(timezone);
  const formatted = dt.toFormat('EEE, MMM d');
  const time = dt.toFormat('h:mm a');
  
  return `I've scheduled ${title} for ${formatted} at ${time}.`;
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
 */
export function formatConflictWarning(
  title: string,
  conflictCount: number,
  conflictingEvents: Array<{ title: string; startTime: Date }>,
  alternatives: Array<{ startTime: string; endTime: string; reason?: string }>,
  timezone: string
): string {
  const conflictList = conflictingEvents
    .slice(0, 2)
    .map(evt => {
      const dt = DateTime.fromJSDate(evt.startTime).setZone(timezone);
      return `• ${evt.title} (${dt.toFormat('h:mm a')})`;
    })
    .join('\n');

  const altList = alternatives
    .slice(0, 3)
    .map((alt, i) => {
      const dt = DateTime.fromISO(alt.startTime).setZone(timezone);
      const reason = alt.reason ? ` - ${alt.reason}` : '';
      return `${i + 1}. ${dt.toFormat('EEE, MMM d')} at ${dt.toFormat('h:mm a')}${reason}`;
    })
    .join('\n');

  return `⚠️ Scheduling conflict detected for "${title}"

Your proposed time conflicts with:
${conflictList}

Suggested alternatives:
${altList}`;
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
export function formatRescheduleConfirmation(
  title: string,
  newStartTimeUTC: string,
  timezone: string
): string {
  const dt = DateTime.fromISO(newStartTimeUTC).setZone(timezone);
  const formatted = dt.toFormat('EEE, MMM d');
  const time = dt.toFormat('h:mm a');
  
  return `🔄 I've rescheduled ${title} to ${formatted} at ${time}.`;
}

