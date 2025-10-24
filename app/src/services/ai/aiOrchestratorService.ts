/**
 * AI Orchestrator Service
 * 
 * Wraps Cloud Functions for React Native
 * CRITICAL: RN doesn't support Next.js /api/ routes - must use httpsCallable
 * 
 * Usage:
 * ```typescript
 * import { parseLesson } from '@/services/ai/aiOrchestratorService';
 * 
 * const result = await parseLesson("tomorrow at 3pm", userId, timezone);
 * ```
 */

import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/lib/firebase';

/**
 * Parse natural language lesson description into structured event
 * 
 * @param text - User input (e.g., "Math tutoring tomorrow at 3pm")
 * @param userId - Current user ID
 * @param timezone - User's IANA timezone
 * @returns Event data or error
 */
export async function parseLesson(
  text: string,
  userId: string,
  timezone: string
): Promise<{
  success: boolean;
  event?: {
    title: string;
    startTime: Date;
    endTime: Date;
    participants: string[];
  };
  error?: string;
}> {
  try {
    const callable = httpsCallable(functions, 'parseLesson');
    const result: HttpsCallableResult = await callable({
      text,
      userId,
      timezone,
    });

    return result.data as any;
  } catch (error: any) {
    console.error('❌ parseLesson failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to parse lesson',
    };
  }
}

/**
 * Reschedule an event with AI assistance
 * 
 * @param eventId - Event to reschedule
 * @param timezone - User's IANA timezone
 * @returns Suggested alternatives
 */
export async function rescheduleEvent(
  eventId: string,
  timezone: string
): Promise<{
  success: boolean;
  alternatives?: Array<{
    startTime: Date;
    endTime: Date;
    reason?: string;
  }>;
  error?: string;
}> {
  try {
    const callable = httpsCallable(functions, 'rescheduleEvent');
    const result: HttpsCallableResult = await callable({
      eventId,
      timezone,
    });

    return result.data as any;
  } catch (error: any) {
    console.error('❌ rescheduleEvent failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to reschedule',
    };
  }
}

/**
 * Generate weekly summary for a conversation
 * 
 * @param userId - User ID
 * @param startDate - ISO string start date
 * @param endDate - ISO string end date
 * @returns Summary text
 */
export async function summarizeWeek(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  success: boolean;
  summary?: string;
  error?: string;
}> {
  try {
    const callable = httpsCallable(functions, 'summarizeWeek');
    const result: HttpsCallableResult = await callable({
      userId,
      startDate,
      endDate,
    });

    return result.data as any;
  } catch (error: any) {
    console.error('❌ summarizeWeek failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate summary',
    };
  }
}

/**
 * Find available time slots
 * 
 * @param conversationId - Conversation to analyze
 * @param duration - Desired duration in minutes
 * @returns Available time slots
 */
export async function suggestTimes(
  conversationId: string,
  duration: number
): Promise<{
  success: boolean;
  suggestions?: Array<{
    startTime: Date;
    endTime: Date;
  }>;
  error?: string;
}> {
  try {
    const callable = httpsCallable(functions, 'suggestTimes');
    const result: HttpsCallableResult = await callable({
      conversationId,
      duration,
    });

    return result.data as any;
  } catch (error: any) {
    console.error('❌ suggestTimes failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to suggest times',
    };
  }
}

