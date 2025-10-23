/**
 * Timezone Utilities with DST-Aware Validation
 * 
 * CRITICAL: All date/time operations MUST include explicit timezone parameter.
 * Functions throw error if timezone is missing or invalid (fail fast, don't guess).
 */

import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { addDays } from 'date-fns';

/**
 * Time context with explicit timezone
 * All scheduling operations must use this interface
 */
export interface TimeContext {
  timezone: string; // IANA timezone (e.g., "America/New_York")
  currentTime: Date; // Current time in UTC
}

/**
 * Validates timezone string using Intl API
 * 
 * @param timezone - IANA timezone string
 * @returns true if valid, throws error if invalid
 * @throws Error if timezone is missing, empty, or invalid
 * 
 * @example
 * validateTimezone("America/New_York") // ✅ true
 * validateTimezone("EST") // ❌ throws
 * validateTimezone("") // ❌ throws
 * validateTimezone(undefined) // ❌ throws
 */
export function validateTimezone(timezone: string | undefined): boolean {
  // ENFORCE: timezone is required
  if (!timezone || timezone.trim() === '') {
    throw new Error('TIMEZONE_REQUIRED: timezone parameter is required for all date/time operations');
  }

  // Validate by attempting to format a date in the timezone
  try {
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
    }).format(new Date());
    
    return true;
  } catch (error: any) {
    if (error.message.startsWith('TIMEZONE_REQUIRED')) {
      throw error;
    }
    throw new Error(`INVALID_TIMEZONE: "${timezone}" is not a valid IANA timezone. ${error.message}`);
  }
}

/**
 * Parses natural language date/time text into a Date object
 * REQUIRES explicit timezone parameter
 * 
 * @param text - Natural language date/time (e.g., "tomorrow at 3pm", "Friday 2pm")
 * @param timezone - REQUIRED IANA timezone
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns Date object in UTC
 * @throws Error if timezone missing or invalid
 * 
 * @example
 * parseDateTime("tomorrow at 3pm", "America/New_York") // ✅
 * parseDateTime("Friday 2pm", "America/Los_Angeles", new Date()) // ✅
 * parseDateTime("next week", "") // ❌ throws TIMEZONE_REQUIRED
 */
export function parseDateTime(
  text: string,
  timezone: string,
  referenceDate?: Date
): Date {
  // ENFORCE: timezone validation at runtime
  validateTimezone(timezone);

  const reference = referenceDate || new Date();

  // Simple parsing logic (will be enhanced with LLM in PR4)
  // For now, handle basic cases
  const lowerText = text.toLowerCase().trim();

  let targetDate = reference;
  let targetHour = 12; // Default noon
  let targetMinute = 0;

  // Parse relative dates
  if (lowerText.includes('tomorrow')) {
    targetDate = addDays(reference, 1);
  } else if (lowerText.includes('next week')) {
    targetDate = addDays(reference, 7);
  } else if (lowerText.includes('today')) {
    targetDate = reference;
  }

  // Parse times (simple patterns)
  const time3pm = lowerText.match(/3\s*pm|15:00/);
  const time2pm = lowerText.match(/2\s*pm|14:00/);
  const time4pm = lowerText.match(/4\s*pm|16:00/);
  const time5pm = lowerText.match(/5\s*pm|17:00/);

  if (time3pm) {
    targetHour = 15;
    targetMinute = 0;
  } else if (time2pm) {
    targetHour = 14;
    targetMinute = 0;
  } else if (time4pm) {
    targetHour = 16;
    targetMinute = 0;
  } else if (time5pm) {
    targetHour = 17;
    targetMinute = 0;
  }

  // Create date in the target timezone
  const zonedDate = new Date(targetDate);
  zonedDate.setHours(targetHour, targetMinute, 0, 0);

  // Convert from zoned time to UTC
  const utcDate = fromZonedTime(zonedDate, timezone);

  return utcDate;
}

/**
 * Formats a Date in a specific timezone
 * 
 * @param date - Date to format (in UTC)
 * @param timezone - REQUIRED IANA timezone
 * @param formatString - date-fns format string (default: 'PPpp')
 * @returns Formatted string in target timezone
 * @throws Error if timezone missing or invalid
 * 
 * @example
 * formatInTimezone(new Date(), "America/New_York", "PPpp")
 * // "Apr 7, 2024, 3:30:00 PM"
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  formatString: string = 'PPpp'
): string {
  validateTimezone(timezone);

  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, formatString, { timeZone: timezone });
}

/**
 * Checks if a date falls within a DST transition
 * Important for conflict detection and scheduling
 * 
 * @param date - Date to check
 * @param timezone - REQUIRED IANA timezone
 * @returns true if date is within 24h of DST transition
 * @throws Error if timezone missing or invalid
 */
export function isDSTTransition(date: Date, timezone: string): boolean {
  validateTimezone(timezone);

  // Get offset at date and 24 hours later
  const dateInZone = toZonedTime(date, timezone);
  const dayLaterInZone = toZonedTime(addDays(date, 1), timezone);

  const dateOffsetStr = format(dateInZone, 'xxx', { timeZone: timezone });
  const dayLaterOffsetStr = format(dayLaterInZone, 'xxx', { timeZone: timezone });

  // If offsets differ, DST transition occurred
  return dateOffsetStr !== dayLaterOffsetStr;
}

/**
 * Gets timezone offset in minutes for a specific date
 * 
 * @param date - Date to get offset for
 * @param timezone - REQUIRED IANA timezone
 * @returns Offset in minutes from UTC
 * @throws Error if timezone missing or invalid
 */
export function getTimezoneOffset(date: Date, timezone: string): number {
  validateTimezone(timezone);

  const zonedDate = toZonedTime(date, timezone);
  const offsetStr = format(zonedDate, 'xxx', { timeZone: timezone });
  
  // Parse offset (format: +05:30 or -08:00)
  const match = offsetStr.match(/([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;

  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);

  return sign * (hours * 60 + minutes);
}

/**
 * Checks if two time ranges overlap, accounting for DST
 * 
 * @param start1 - Start of first range (UTC)
 * @param end1 - End of first range (UTC)
 * @param start2 - Start of second range (UTC)
 * @param end2 - End of second range (UTC)
 * @param timezone - REQUIRED IANA timezone for DST awareness
 * @returns true if ranges overlap
 * @throws Error if timezone missing or invalid
 */
export function timeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
  timezone: string
): boolean {
  validateTimezone(timezone);

  // Check for DST transition in either range
  const range1HasDST = isDSTTransition(start1, timezone) || isDSTTransition(end1, timezone);
  const range2HasDST = isDSTTransition(start2, timezone) || isDSTTransition(end2, timezone);

  if (range1HasDST || range2HasDST) {
    console.log('⚠️ DST transition detected in time range comparison');
  }

  // Standard overlap check: (start1 < end2) AND (start2 < end1)
  return start1 < end2 && start2 < end1;
}

/**
 * Creates a TimeContext for the current moment
 * 
 * @param timezone - REQUIRED IANA timezone
 * @returns TimeContext object
 * @throws Error if timezone missing or invalid
 */
export function createTimeContext(timezone: string): TimeContext {
  validateTimezone(timezone);

  return {
    timezone,
    currentTime: new Date(),
  };
}

