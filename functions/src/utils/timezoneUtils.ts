/**
 * Timezone Utilities
 * 
 * Centralized timezone formatting for per-viewer rendering
 * All user-facing times should use these helpers to ensure correct timezone display
 */

import { getUserTimezone } from './timezone';
import { DateTime } from 'luxon';

/**
 * Validate timezone string is a valid IANA timezone
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @throws Error if timezone is invalid
 */
export function validateTimezone(timezone: string): void {
  if (!timezone || typeof timezone !== 'string') {
    throw new Error('Timezone must be a non-empty string');
  }
  
  try {
    // Test if timezone is valid by trying to use it
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch (error) {
    throw new Error(`Invalid IANA timezone: ${timezone}`);
  }
}

/**
 * Format date in user's timezone (per-viewer rendering)
 * Single source of truth for all timezone formatting
 * 
 * @param date - ISO string or Date object  
 * @param userId - User ID to fetch timezone for
 * @param format - Output format style
 * @returns Formatted string in user's local timezone
 * 
 * @example
 * const formatted = await formatInUserTimezone(
 *   '2025-10-27T19:00:00Z',
 *   'user123',
 *   'long'
 * );
 * // Returns: "Mon, Oct 27 at 3:00 PM" (in user's timezone)
 */
export async function formatInUserTimezone(
  date: string | Date,
  userId: string,
  format: 'short' | 'long' | 'time' | 'full' = 'long'
): Promise<string> {
  const timezone = await getUserTimezone(userId);
  const dt = typeof date === 'string' 
    ? DateTime.fromISO(date).setZone(timezone)
    : DateTime.fromJSDate(date).setZone(timezone);
  
  switch (format) {
    case 'short':
      return dt.toFormat('EEE, MMM d'); // "Mon, Oct 27"
    case 'time':
      return dt.toFormat('h:mm a'); // "3:00 PM"
    case 'long':
      return dt.toFormat('EEE, MMM d \'at\' h:mm a'); // "Mon, Oct 27 at 3:00 PM"
    case 'full':
      return dt.toFormat('EEEE, MMMM d, yyyy \'at\' h:mm a'); // "Monday, October 27, 2025 at 3:00 PM"
    default:
      return dt.toFormat('EEE, MMM d \'at\' h:mm a');
  }
}

/**
 * Format time range in user's timezone
 * Used for event confirmations and notifications
 */
export async function formatTimeRangeInUserTimezone(
  startDate: string | Date,
  endDate: string | Date,
  userId: string
): Promise<string> {
  const timezone = await getUserTimezone(userId);
  const start = typeof startDate === 'string'
    ? DateTime.fromISO(startDate).setZone(timezone)
    : DateTime.fromJSDate(startDate).setZone(timezone);
  const end = typeof endDate === 'string'
    ? DateTime.fromISO(endDate).setZone(timezone)
    : DateTime.fromJSDate(endDate).setZone(timezone);
  
  // Same day: "Mon, Oct 27 • 3:00 PM - 4:00 PM"
  if (start.hasSame(end, 'day')) {
    return `${start.toFormat('EEE, MMM d')} • ${start.toFormat('h:mm a')} - ${end.toFormat('h:mm a')}`;
  }
  
  // Different days: "Oct 27, 3:00 PM - Oct 28, 4:00 PM"
  return `${start.toFormat('MMM d, h:mm a')} - ${end.toFormat('MMM d, h:mm a')}`;
}
