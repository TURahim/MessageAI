/**
 * Deterministic Time Parser using Chrono-node
 * 
 * Replaces LLM-based time parsing for fast, reliable date/time extraction
 * Falls back to LLM only when disambiguation is needed
 */

import * as chrono from 'chrono-node';
import { DateTime } from 'luxon';
import * as logger from 'firebase-functions/logger';

export interface ParseResult {
  success: boolean;
  startTime?: string; // ISO UTC
  endTime?: string; // ISO UTC
  confidence: number;
  needsDisambiguation: boolean;
  candidates?: Array<{ start: string; end: string }>;
  error?: string;
}

/**
 * Parse natural language date/time using chrono-node
 * 
 * @param text - Natural language text (e.g., "Sunday 5pm", "tomorrow at 3")
 * @param timezone - IANA timezone (e.g., "America/New_York")
 * @param defaultDurationMinutes - Default event duration (default: 60)
 * @returns ParseResult with success status and parsed times
 */
export function parseDateTime(
  text: string,
  timezone: string,
  defaultDurationMinutes: number = 60
): ParseResult {
  const startTime = Date.now();

  try {
    // Parse with chrono-node
    const now = new Date();
    const results = chrono.parse(text, now);

    if (results.length === 0) {
      logger.info('⏰ Chrono: No date found', {
        text: text.substring(0, 50),
      });
      
      return {
        success: false,
        confidence: 0,
        needsDisambiguation: false,
        error: 'NO_DATE_FOUND',
      };
    }

    // Check if we have a clear, unambiguous result
    const firstResult = results[0];
    const hasHour = firstResult.start.isCertain('hour');
    const hasDay = firstResult.start.isCertain('day');

    // Single result with specific time = confident parse
    if (results.length === 1 && hasHour && hasDay) {
      const startDate = firstResult.start.date();
      let endDate = firstResult.end?.date();

      // If no explicit end time, use default duration
      if (!endDate) {
        endDate = new Date(startDate.getTime() + defaultDurationMinutes * 60 * 1000);
      }

      // Convert to luxon with timezone, then to UTC
      const start = DateTime.fromJSDate(startDate, { zone: timezone });
      const end = DateTime.fromJSDate(endDate, { zone: timezone });

      const parseTime = Date.now() - startTime;

      logger.info('✅ Chrono: Unambiguous parse', {
        text: text.substring(0, 50),
        startTime: start.toISO(),
        confidence: 1.0,
        parseTime,
      });

      return {
        success: true,
        startTime: start.toUTC().toISO()!,
        endTime: end.toUTC().toISO()!,
        confidence: 1.0,
        needsDisambiguation: false,
      };
    }

    // Multiple results or uncertain time = needs disambiguation
    logger.warn('⚠️ Chrono: Ambiguous parse, needs LLM', {
      text: text.substring(0, 50),
      candidatesCount: results.length,
      hasCertainHour: hasHour,
    });

    const candidates = results.slice(0, 3).map(r => {
      const startDate = r.start.date();
      const endDate = r.end?.date() || new Date(startDate.getTime() + defaultDurationMinutes * 60 * 1000);
      
      const start = DateTime.fromJSDate(startDate, { zone: timezone });
      const end = DateTime.fromJSDate(endDate, { zone: timezone });

      return {
        start: start.toUTC().toISO()!,
        end: end.toUTC().toISO()!,
      };
    });

    return {
      success: false,
      confidence: 0.5,
      needsDisambiguation: true,
      candidates,
    };
  } catch (error: any) {
    logger.error('❌ Chrono parsing error', {
      error: error.message,
      text: text.substring(0, 50),
    });

    return {
      success: false,
      confidence: 0,
      needsDisambiguation: false,
      error: `PARSE_ERROR: ${error.message}`,
    };
  }
}

/**
 * Extract event title from message text
 * Looks for patterns like "physics lesson", "math tutoring", etc.
 */
export function extractEventTitle(text: string): string {
  const lowerText = text.toLowerCase();

  // Pattern: "{subject} {session_type}"
  const match = text.match(/(\w+)\s+(lesson|session|class|tutoring|review|meeting)/i);
  if (match) {
    const subject = match[1];
    const type = match[2];
    
    // Capitalize first letter of each word
    return `${subject.charAt(0).toUpperCase() + subject.slice(1)} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  }

  // Fallback: capitalize first word if it looks like a subject
  const firstWord = lowerText.split(' ')[0];
  if (firstWord && firstWord.length > 3 && /^[a-z]+$/.test(firstWord)) {
    return `${firstWord.charAt(0).toUpperCase() + firstWord.slice(1)} Session`;
  }

  return 'Session';
}

