/**
 * AI Conflict Resolver
 * 
 * PR10: Conflict Engine
 * 
 * Uses GPT-4 to generate intelligent alternative time suggestions when
 * scheduling conflicts are detected. Considers:
 * - User's existing schedule
 * - Time of day preferences
 * - Buffer time between sessions
 * - DST transitions
 * - Weekend vs weekday availability
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import * as logger from 'firebase-functions/logger';
import { z } from 'zod';
import * as admin from 'firebase-admin';

export type WorkingHours = {
  [day: string]: { start: string; end: string }[];
};

export interface ConflictContext {
  proposedStartTime: Date;
  proposedEndTime: Date;
  conflictingEvents: Array<{
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
  }>;
  userId: string;
  timezone: string;
  sessionDuration: number; // minutes
  workingHours?: WorkingHours; // User's availability preferences
}

export interface AlternativeTimeSlot {
  startTime: Date;
  endTime: Date;
  reason: string;
  score: number; // 0-100, higher is better
  dayType: 'weekday' | 'weekend';
  timeOfDay: 'morning' | 'midday' | 'afternoon' | 'evening';
}

/**
 * Generate AI-powered alternative time suggestions
 * 
 * Uses GPT-4 to intelligently suggest 2-3 alternative times that:
 * 1. Don't conflict with existing schedule
 * 2. Respect user's working hours
 * 3. Consider time of day preferences
 * 4. Provide helpful reasoning
 * 
 * @param context - Conflict context with schedule and availability
 * @returns 2-3 alternative time slots with reasoning
 */
export async function generateAlternatives(
  context: ConflictContext
): Promise<AlternativeTimeSlot[]> {
  const correlationId = `alt_${Date.now().toString(36)}`;
  
  logger.info('🤖 Generating conflict alternatives with AI', {
    correlationId,
    userId: context.userId.substring(0, 8),
    conflicts: context.conflictingEvents.length,
  });

  try {
    // Source of truth: Resolve timezone and working hours once at start
    const { getUserWorkingHours, isWithinWorkingHours } = await import('../utils/availability');
    const { getUserTimezone } = await import('../utils/timezone');
    
    const tz = context.timezone || await getUserTimezone(context.userId);
    const workingHours = context.workingHours || await getUserWorkingHours(context.userId);

    // Get user's schedule for next 7 days
    const scheduleBlocks = await getScheduleBlocks(context.userId, tz);

    // Get user's schedule context for prompt
    const scheduleContext = await getUserScheduleContext(context.userId, tz);

    // Build working hours context
    const workingHoursContext = formatWorkingHoursForPrompt(workingHours, tz);

    // Build prompt for GPT-4 with timezone-aware formatting
    const prompt = await buildConflictResolutionPrompt(context, scheduleContext, workingHoursContext, tz);

    // Model call with generateObject + zod (no JSON parsing needed)
    const schema = z.object({
      alternatives: z.array(z.object({
        startTime: z.string(), // ISO 8601
        endTime: z.string(), // ISO 8601
        reason: z.string(),
        score: z.number().min(0).max(100),
        dayType: z.enum(['weekday', 'weekend']),
        timeOfDay: z.enum(['morning', 'midday', 'afternoon', 'evening']),
      })).min(2).max(5), // Allow up to 5 for filtering
    });

    // Optional 5s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      logger.warn('⏰ AI alternative generation timeout', { correlationId });
    }, 5000);

    const result = await generateObject({
      model: openai('gpt-4-turbo'),
      schema,
      prompt,
      temperature: 0.4, // Lower for consistency
      maxTokens: 800,
      abortSignal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse result (already validated by zod)
    const parsed = result.object;

    // Convert to AlternativeTimeSlot objects
    const alternatives: AlternativeTimeSlot[] = parsed.alternatives.map(alt => ({
      startTime: new Date(alt.startTime),
      endTime: new Date(alt.endTime),
      reason: alt.reason,
      score: alt.score,
      dayType: alt.dayType,
      timeOfDay: alt.timeOfDay,
    }));

    // Validation: Check against schedule blocks with 15-min buffer
    const BUFFER_MINUTES = 15;
    const validAlternatives = alternatives.filter(alt => {
      // Must differ from proposed window (with buffer)
      const differentFromProposed = 
        Math.abs(alt.startTime.getTime() - context.proposedStartTime.getTime()) > BUFFER_MINUTES * 60 * 1000 ||
        Math.abs(alt.endTime.getTime() - context.proposedEndTime.getTime()) > BUFFER_MINUTES * 60 * 1000;

      if (!differentFromProposed) {
        logger.warn('⚠️ Alternative too similar to proposed time', {
          correlationId,
          altStart: alt.startTime.toISOString(),
        });
        return false;
      }

      // Check against all schedule blocks with buffer
      for (const block of scheduleBlocks) {
        const blockStart = new Date(block.start.getTime() - BUFFER_MINUTES * 60 * 1000);
        const blockEnd = new Date(block.end.getTime() + BUFFER_MINUTES * 60 * 1000);
        
        // Check if alternative overlaps with buffered block
        if (alt.startTime < blockEnd && alt.endTime > blockStart) {
          logger.warn('⚠️ Alternative conflicts with schedule block', {
            correlationId,
            altStart: alt.startTime.toISOString(),
            blockTitle: block.title,
          });
          return false;
        }
      }

      // Validate both start AND end are within working hours
      const startInHours = isWithinWorkingHours(alt.startTime, workingHours, tz);
      const endInHours = isWithinWorkingHours(alt.endTime, workingHours, tz);

      if (!startInHours || !endInHours) {
        logger.warn('⚠️ Alternative outside working hours', {
          correlationId,
          altStart: alt.startTime.toISOString(),
          startInHours,
          endInHours,
        });
        return false;
      }

      return true;
    });

    // Post-processing: De-duplicate, sort by score, cap at 3
    const seen = new Set<string>();
    const deduped = validAlternatives.filter(alt => {
      const key = `${alt.startTime.toISOString()}_${alt.endTime.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const sorted = deduped.sort((a, b) => b.score - a.score);
    const final = sorted.slice(0, 3); // Cap at 3

    logger.info('✅ Generated alternatives', {
      correlationId,
      aiGenerated: alternatives.length,
      afterValidation: validAlternatives.length,
      afterDedup: deduped.length,
      final: final.length,
      scores: final.map(a => a.score),
    });

    return final;
  } catch (error: any) {
    logger.error('❌ Failed to generate alternatives', {
      error: error.message,
      stack: error.stack,
    });

    // Fallback: Generate simple alternatives based on rules
    return generateFallbackAlternatives(context);
  }
}

/**
 * Format working hours for AI prompt
 */
function formatWorkingHoursForPrompt(workingHours: any, timezone: string): string {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const lines: string[] = [];
  
  days.forEach((day, index) => {
    const slots = workingHours[day];
    if (slots && slots.length > 0) {
      const ranges = slots.map((s: any) => `${s.start}–${s.end}`).join(', ');
      lines.push(`${dayNames[index]}: ${ranges}`);
    } else {
      lines.push(`${dayNames[index]}: Not available`);
    }
  });

  return lines.join('\n') + `\n(All times in ${timezone})`;
}

/**
 * Get schedule blocks for validation (next 7 days)
 */
async function getScheduleBlocks(
  userId: string,
  timezone: string
): Promise<Array<{ start: Date; end: Date; title: string }>> {
  try {
    const now = new Date();
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const snapshot = await admin.firestore()
      .collection('events')
      .where('participants', 'array-contains', userId)
      .where('startTime', '>=', admin.firestore.Timestamp.fromDate(now))
      .where('startTime', '<=', admin.firestore.Timestamp.fromDate(sevenDaysOut))
      .limit(100)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        start: data.startTime.toDate(),
        end: data.endTime.toDate(),
        title: data.title || 'Event',
      };
    });
  } catch (error) {
    logger.warn('⚠️ Failed to fetch schedule blocks', { error });
    return [];
  }
}

/**
 * Format time with timezone
 * Timezone-aware version
 */
function formatTime(date: Date, tz?: string): string {
  if (!tz) {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  });
}

/**
 * Build prompt for GPT-4 conflict resolution
 */
async function buildConflictResolutionPrompt(
  context: ConflictContext,
  scheduleContext: string,
  workingHoursContext: string,
  tz: string
): Promise<string> {
  const conflictList = context.conflictingEvents
    .map(e => `- ${e.title}: ${formatTime(e.startTime, tz)} - ${formatTime(e.endTime, tz)}`)
    .join('\n');

  return `You are helping reschedule a tutoring session that conflicts with existing appointments.

**Proposed Session:**
- Start: ${formatTime(context.proposedStartTime, tz)} (${tz})
- End: ${formatTime(context.proposedEndTime, tz)} (${tz})
- Duration: ${context.sessionDuration} minutes

**Conflicting Events:**
${conflictList}

**User's Schedule (Next 7 Days):**
${scheduleContext}

**User's Working Hours:**
${workingHoursContext}

**Requirements:**
1. Suggest 2-3 alternative times that DON'T conflict
2. **CRITICAL:** Only suggest times within the user's working hours shown above
3. Consider time of day:
   - Morning (9-11 AM): Good for focused work
   - Midday (11 AM - 2 PM): Peak hours, most preferred
   - Afternoon (2-5 PM): Good for review sessions
   - Evening (5-6 PM): Less ideal, students may be tired
4. Prefer weekdays over weekends for tutoring
5. Include 15-minute buffer between sessions
6. Be considerate of DST if applicable

**Return JSON:**
{
  "alternatives": [
    {
      "startTime": "ISO 8601 string",
      "endTime": "ISO 8601 string",
      "reason": "Brief explanation (1-2 sentences)",
      "score": 0-100 (higher = better fit),
      "dayType": "weekday" | "weekend",
      "timeOfDay": "morning" | "midday" | "afternoon" | "evening"
    }
  ]
}

**Example reasoning:**
- "Tomorrow at 2 PM avoids your morning class and gives you a break after lunch"
- "Thursday morning is clear and provides good focus time"
- "Weekend afternoon as a backup, though weekdays are preferred"

Be practical and considerate of a tutor's schedule. Prioritize times that are:
1. Soon but not immediate (give 24h+ notice when possible)
2. During peak tutoring hours (10 AM - 4 PM)
3. With adequate buffer from other commitments`;
}

/**
 * Get user's schedule context for AI
 */
async function getUserScheduleContext(
  userId: string,
  timezone: string
): Promise<string> {
  try {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('participants', 'array-contains', userId)
      .where('startTime', '>=', admin.firestore.Timestamp.fromDate(now))
      .where('startTime', '<=', admin.firestore.Timestamp.fromDate(weekFromNow))
      .orderBy('startTime', 'asc')
      .limit(20)
      .get();

    if (eventsSnapshot.empty) {
      return 'No scheduled events in the next 7 days (very flexible)';
    }

    const events = eventsSnapshot.docs.map(doc => {
      const data = doc.data();
      const start = data.startTime.toDate();
      const end = data.endTime.toDate();
      return `- ${data.title || 'Session'}: ${formatTime(start, timezone)} - ${formatTime(end, timezone)}`;
    });

    return events.join('\n');
  } catch (error) {
    logger.warn('⚠️ Failed to get schedule context', { error });
    return 'Schedule unavailable (assuming some flexibility)';
  }
}




/**
 * Fallback: Generate simple rule-based alternatives
 * Used if AI generation fails
 */
function generateFallbackAlternatives(
  context: ConflictContext
): AlternativeTimeSlot[] {
  const alternatives: AlternativeTimeSlot[] = [];
  const duration = context.sessionDuration;

  // Alternative 1: Same time, next day
  const nextDay = new Date(context.proposedStartTime);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayEnd = new Date(nextDay.getTime() + duration * 60 * 1000);

  alternatives.push({
    startTime: nextDay,
    endTime: nextDayEnd,
    reason: 'Same time tomorrow - easiest to remember',
    score: 80,
    dayType: nextDay.getDay() === 0 || nextDay.getDay() === 6 ? 'weekend' : 'weekday',
    timeOfDay: getTimeOfDay(nextDay.getHours()),
  });

  // Alternative 2: Two days later, morning (10 AM)
  const twoDaysLater = new Date(context.proposedStartTime);
  twoDaysLater.setDate(twoDaysLater.getDate() + 2);
  twoDaysLater.setHours(10, 0, 0, 0);
  const twoDaysLaterEnd = new Date(twoDaysLater.getTime() + duration * 60 * 1000);

  alternatives.push({
    startTime: twoDaysLater,
    endTime: twoDaysLaterEnd,
    reason: 'Morning slot for better focus',
    score: 85,
    dayType: twoDaysLater.getDay() === 0 || twoDaysLater.getDay() === 6 ? 'weekend' : 'weekday',
    timeOfDay: 'morning',
  });

  // Alternative 3: Three days later, midday (2 PM)
  const threeDaysLater = new Date(context.proposedStartTime);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  threeDaysLater.setHours(14, 0, 0, 0);
  const threeDaysLaterEnd = new Date(threeDaysLater.getTime() + duration * 60 * 1000);

  alternatives.push({
    startTime: threeDaysLater,
    endTime: threeDaysLaterEnd,
    reason: 'Afternoon session with more notice',
    score: 75,
    dayType: threeDaysLater.getDay() === 0 || threeDaysLater.getDay() === 6 ? 'weekend' : 'weekday',
    timeOfDay: 'afternoon',
  });

  logger.info('📋 Generated fallback alternatives (rule-based)', {
    count: alternatives.length,
  });

  return alternatives;
}

/**
 * Helper: Get time of day category
 */
function getTimeOfDay(hour: number): 'morning' | 'midday' | 'afternoon' | 'evening' {
  if (hour < 11) return 'morning';
  if (hour < 14) return 'midday';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Post conflict warning message to conversation
 * Creates an assistant message with ConflictMeta
 * 
 * @param conversationId - Conversation to post to
 * @param conflictMessage - Conflict description
 * @param alternatives - Alternative time slots
 * @param eventId - Original event ID (if rescheduling)
 * @returns Message ID
 */
export async function postConflictWarning(
  conversationId: string,
  conflictMessage: string,
  alternatives: AlternativeTimeSlot[],
  userId?: string,
  eventId?: string
): Promise<string> {
  // Deterministic conflict ID
  const conflictId = eventId || `conflict_${conversationId.substring(0, 12)}_${Date.now().toString(36)}`;
  const correlationId = conflictId.substring(0, 8);

  try {
    // Create assistant message with conflict metadata
    const messageRef = await admin.firestore()
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add({
        senderId: 'assistant',
        senderName: 'JellyDM Assistant',
        type: 'text',
        messageType: 'conflict_warning',
        text: conflictMessage,
        clientTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        retryCount: 0,
        readBy: [],
        readCount: 0,
        meta: {
          role: 'assistant',
          conflict: {
            conflictId,
            message: conflictMessage,
            suggestedAlternatives: alternatives.map(alt => ({
              startTime: admin.firestore.Timestamp.fromDate(alt.startTime),
              endTime: admin.firestore.Timestamp.fromDate(alt.endTime),
              reason: alt.reason,
            })),
          },
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    logger.info('✅ Posted conflict warning to conversation', {
      correlationId,
      conversationId: conversationId.substring(0, 12),
      messageId: messageRef.id.substring(0, 8),
      alternativesCount: alternatives.length,
    });

    return messageRef.id;
  } catch (error: any) {
    logger.error('❌ Failed to post conflict warning', {
      correlationId,
      error: error.message,
      conversationId: conversationId.substring(0, 12),
    });
    throw error;
  }
}

