/**
 * Fast-Path Orchestrator
 * 
 * Server-side scheduling without LLM calls
 * Target latency: 2-3 seconds (vs 10-15s with full LLM orchestration)
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { parseDateTime, extractEventTitle } from '../utils/chronoParser';
import { formatEventConfirmation } from './messageTemplates';
import { executeTool } from './toolExecutor';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  text: string;
  createdAt: Date;
}

export interface FastPathResult {
  success: boolean;
  usedFastPath: boolean;
  eventId?: string;
  latency?: number;
  reason?: string;
}

/**
 * Fast-path scheduling: No LLM, deterministic parsing, templated responses
 * 
 * Flow:
 * 1. Parse time with chrono-node (~5ms)
 * 2. Extract title with regex (~1ms)
 * 3. Create event in Firestore (~800ms, includes idempotency + conflict check)
 * 4. Post templated confirmation (~200ms)
 * 
 * Total: ~2-3 seconds
 */
export async function scheduleFastPath(
  message: Message,
  correlationId: string
): Promise<FastPathResult> {
  const t_start = Date.now();
  
  logger.info('⚡ Attempting fast-path scheduling', {
    correlationId,
    text: message.text.substring(0, 50),
  });

  try {
    // Get user's timezone from preferences
    const { getUserTimezone } = await import('../utils/timezone');
    const timezone = await getUserTimezone(message.senderId);

    // Step 1: Parse time deterministically with chrono-node
    const t_parseStart = Date.now();
    const parseResult = parseDateTime(message.text, timezone);
    const t_parseEnd = Date.now();

    if (!parseResult.success) {
      // Check if it's a past date rejection
      if (parseResult.error?.startsWith('PAST_DATE:')) {
        logger.warn('⚠️ Fast-path: Past date detected, posting rejection', {
          correlationId,
          error: parseResult.error,
        });
        
        // Post friendly rejection message
        await executeTool(
          'messages.post_system',
          {
            conversationId: message.conversationId,
            text: 'That time has already passed. Please choose a future date to schedule this lesson.',
            meta: { role: 'assistant' },
          },
          { correlationId }
        );
        
        return {
          success: false,
          usedFastPath: true, // We handled it (with rejection)
          reason: 'PAST_DATE_REJECTED',
        };
      }
      
      logger.warn('⚠️ Fast-path: Parse failed', {
        correlationId,
        needsDisambiguation: parseResult.needsDisambiguation,
        error: parseResult.error,
      });
      
      return {
        success: false,
        usedFastPath: false,
        reason: parseResult.needsDisambiguation ? 'NEEDS_DISAMBIGUATION' : 'PARSE_FAILED',
      };
    }

    // Step 2: Extract event title
    const title = extractEventTitle(message.text);

    logger.info('📝 Fast-path: Extracted info', {
      correlationId,
      title,
      startTime: parseResult.startTime,
      parseLatency: t_parseEnd - t_parseStart,
    });

    // Step 3: Get conversation participants
    const convDoc = await admin.firestore()
      .doc(`conversations/${message.conversationId}`)
      .get();
    const participants = convDoc.data()?.participants || [];

    // Step 4: Create event (uses existing idempotency + conflict check)
    const t_eventStart = Date.now();
    const eventResult = await executeTool(
      'schedule.create_event',
      {
        title,
        startTime: parseResult.startTime!,
        endTime: parseResult.endTime!,
        timezone,
        participants,
        conversationId: message.conversationId,
        createdBy: message.senderId,
      },
      { correlationId }
    );
    const t_eventEnd = Date.now();

    if (!eventResult.success || !eventResult.data?.eventId) {
      logger.error('❌ Fast-path: Event creation failed', {
        correlationId,
        error: eventResult.error,
      });
      
      return {
        success: false,
        usedFastPath: false,
        reason: 'EVENT_CREATION_FAILED',
      };
    }

    // Check if there was a conflict
    if (eventResult.data.hasConflict) {
      logger.info('⚠️ Fast-path: Conflict detected, skipping confirmation', {
        correlationId,
        eventId: eventResult.data.eventId,
      });
      
      // Conflict handler already posted the conflict card
      // Don't post a regular confirmation
      const totalLatency = Date.now() - t_start;
      
      return {
        success: true,
        usedFastPath: true,
        eventId: eventResult.data.eventId,
        latency: totalLatency,
      };
    }

    // Step 5: Post templated confirmation (no LLM!) - only if NO conflict
    const t_confirmStart = Date.now();
    const confirmationText = await formatEventConfirmation(
      title,
      parseResult.startTime!,
      message.senderId // Pass userId for per-viewer timezone formatting
    );

    await executeTool(
      'messages.post_system',
      {
        conversationId: message.conversationId,
        text: confirmationText,
        meta: {
          type: 'event',
          eventId: eventResult.data.eventId,
          title,
          startTime: parseResult.startTime,
          endTime: parseResult.endTime,
          status: 'pending',
        },
      },
      { correlationId, fromFastPath: true } as any
    );
    const t_confirmEnd = Date.now();

    const totalLatency = Date.now() - t_start;

    logger.info('✅ Fast-path scheduling complete', {
      correlationId,
      eventId: eventResult.data.eventId,
      title,
      totalLatency,
      breakdown: {
        parse: t_parseEnd - t_parseStart,
        event: t_eventEnd - t_eventStart,
        confirm: t_confirmEnd - t_confirmStart,
      },
      usedLLM: false,
    });

    return {
      success: true,
      usedFastPath: true,
      eventId: eventResult.data.eventId,
      latency: totalLatency,
    };
  } catch (error: any) {
    logger.error('❌ Fast-path error', {
      correlationId,
      error: error.message,
    });

    return {
      success: false,
      usedFastPath: false,
      reason: `ERROR: ${error.message}`,
    };
  }
}

