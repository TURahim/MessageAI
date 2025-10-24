/**
 * RSVP Response Interpreter
 * 
 * Classifies natural language responses to event invitations
 * Uses lightweight LLM for fast classification with strong local rules
 * 
 * Target: >80% accuracy
 * Auto-records when confidence >0.7
 * Detects ambiguity words: "maybe", "might", "should work", "probably"
 * Fast-path: Skip LLM for obvious accept/decline with confidence 0.9
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { RSVP_INTERPRETATION_PROMPT } from './promptTemplates';
import * as logger from 'firebase-functions/logger';

export type RSVPResponse = 'accept' | 'decline' | 'unclear';

export interface RSVPInterpretationResult {
  response: RSVPResponse;
  confidence: number;
  hasAmbiguity: boolean; // Detected "maybe", "might", etc.
  shouldAutoRecord: boolean; // True if confidence >0.7 and no ambiguity
}

// Helpers
const NORMALIZE = (s: string) =>
  s.toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim();

const clamp01 = (n: number) => Math.max(0, Math.min(1, n ?? 0));

const MIN_LEN_FOR_AUTO = 3;
const LLM_TIMEOUT = 3000; // 3 seconds

/**
 * Robust ambiguity detection with word-boundary regexes
 * Includes conditional blockers like "yes, but...", "however"
 */
const AMBIGUITY_REGEXES: RegExp[] = [
  /\bmaybe\b/i,
  /\bmight\b/i,
  /\bshould\s+work\b/i,
  /\bprobably\b/i,
  /\bthink\s+so\b/i,
  /\bnot\s+sure\b/i,
  /\blet\s+me\s+check\b/i,
  /\bi'?ll\s+see\b/i,
  /\bpossibly\b/i,
  /\b(yes|sure|sounds\s+good),?\s+but\b/i,  // Conditional blockers
  /\bhowever\b/i,
  /\bon\s+second\s+thought\b/i,
  /\bactually\b.*\bnot\b/i, // "actually not"
];

function hasAmbiguity(textN: string): boolean {
  return AMBIGUITY_REGEXES.some(rx => rx.test(textN));
}

/**
 * Strong-rule fast path (deterministic, skip LLM)
 * Returns null if no clear match
 */
const ACCEPT_REGEXES: RegExp[] = [
  /\by(es|up)\b/i,
  /\bsure\b/i,
  /\bsounds\s+good\b/i,
  /\bworks\s+for\s+me\b/i,
  /\bthat\s+works\b/i,
  /\bi'?ll\s+be\s+there\b/i,
  /\bcount\s+me\s+in\b/i,
  /\bperfect\b/i,
  /\bgreat\b(?!\s+but)/i, // "great" but not "great but"
  /\b(we'?re|i'?m)\s+(both\s+)?coming\b/i,
];

const DECLINE_REGEXES: RegExp[] = [
  /\bno(pe)?\b/i,
  /\b(can('t| )?t|cannot)\s+(make|do|come|attend)\b/i,
  /\bsorry[, ]+\s*i('?m)?\s+(busy|booked|not\s+available)\b/i,
  /\bwon'?t\s+be\s+able\s+to\b/i,
  /\bunable\s+to\b/i,
  /\bhave\s+to\s+(cancel|decline)\b/i,
];

function quickClassify(textN: string): RSVPResponse | null {
  if (ACCEPT_REGEXES.some(r => r.test(textN))) return 'accept';
  if (DECLINE_REGEXES.some(r => r.test(textN))) return 'decline';
  return null;
}

/**
 * Interprets a natural language response to an RSVP
 * 
 * @param text - Message text
 * @param eventContext - Optional event details for context
 * @returns RSVP interpretation result
 * 
 * @example
 * const result = await interpretRSVP("Yes that works for me");
 * if (result.shouldAutoRecord) {
 *   await recordResponse(eventId, userId, result.response);
 * }
 */
export async function interpretRSVP(
  text: string,
  eventContext?: {
    eventId: string;
    eventTitle?: string;
  }
): Promise<RSVPInterpretationResult> {
  logger.info('🔍 Interpreting RSVP response', {
    textLength: text.length,
    eventId: eventContext?.eventId?.substring(0, 8),
  });

  // Normalize text once
  const textN = NORMALIZE(text);

  // Step 1: Check ambiguity with regex
  const ambiguous = hasAmbiguity(textN);

  // Step 2: Try fast-path classification (no LLM)
  const quickResult = quickClassify(textN);
  
  if (quickResult && !ambiguous && text.trim().length >= MIN_LEN_FOR_AUTO) {
    // Fast path: Clear accept/decline with no ambiguity
    const shouldAutoRecord = true; // High confidence, clear response
    
    logger.info('⚡ RSVP quick-classified', {
      response: quickResult,
      confidence: 0.9,
      hasAmbiguity: false,
      shouldAutoRecord,
      fastPath: true,
    });

    return {
      response: quickResult,
      confidence: 0.9,
      hasAmbiguity: false,
      shouldAutoRecord,
    };
  }

  // Step 3: Use LLM for unclear cases (with timeout and retry)
  try {
    // Build prompt with event context
    const ctx = eventContext
      ? `\nEvent: ${eventContext.eventTitle ?? 'Untitled'} (ID ${eventContext.eventId.slice(0,8)})`
      : '';
    const prompt = `${RSVP_INTERPRETATION_PROMPT}${ctx}\n\n"${text}"`;

    // Call LLM with timeout
    const parsed = await callModelWithRetry(prompt);

    // Clamp confidence
    let adjustedConfidence = clamp01(parsed.confidence);

    // Cap confidence if ambiguity detected
    if (ambiguous) {
      adjustedConfidence = Math.min(adjustedConfidence, 0.6);
      logger.warn('⚠️ Ambiguity detected, confidence capped', {
        text: text.substring(0, 50),
        originalConfidence: parsed.confidence,
        adjustedConfidence,
      });
    }

    // Safer auto-record policy (min length + confidence + no ambiguity)
    const shouldAutoRecord = 
      adjustedConfidence >= 0.7 &&
      !ambiguous &&
      parsed.response !== 'unclear' &&
      text.trim().length >= MIN_LEN_FOR_AUTO;

    logger.info('✅ RSVP interpreted', {
      response: parsed.response,
      confidence: adjustedConfidence,
      hasAmbiguity: ambiguous,
      shouldAutoRecord,
    });

    return {
      response: parsed.response,
      confidence: adjustedConfidence,
      hasAmbiguity: ambiguous,
      shouldAutoRecord,
    };
  } catch (error: any) {
    logger.error('❌ RSVP interpretation failed', {
      error: error.message,
      text: text.substring(0, 50),
    });

    // Return unclear as fallback
    return {
      response: 'unclear',
      confidence: 0,
      hasAmbiguity: false,
      shouldAutoRecord: false,
    };
  }
}

/**
 * Call LLM with timeout and one retry
 * Returns parsed response or throws
 */
async function callModelWithRetry(prompt: string, attempt: number = 0): Promise<{
  response: RSVPResponse;
  confidence: number;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    logger.warn('⏱️ RSVP LLM timeout triggered', { attempt: attempt + 1 });
  }, LLM_TIMEOUT);

  try {
    const result = await generateObject({
      model: openai('gpt-3.5-turbo'),
      schema: z.object({
        response: z.enum(['accept', 'decline', 'unclear']).describe('RSVP response type'),
        confidence: z.number().min(0).max(1).describe('Confidence score'),
      }),
      prompt,
      temperature: 0.3,
      maxTokens: 50,
      abortSignal: controller.signal,
    });

    clearTimeout(timeoutId);
    return result.object;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Check if timeout/429/5xx
    const isRetryable = 
      error.name === 'AbortError' ||
      error.message?.includes('aborted') ||
      error.status === 429 ||
      (error.status >= 500 && error.status < 600);

    if (isRetryable && attempt === 0) {
      logger.warn('⏱️ RSVP LLM timeout/error; retrying once', {
        error: error.message,
        status: error.status,
      });
      
      // Wait 1s before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return callModelWithRetry(prompt, attempt + 1);
    }

    // Final failure - return unclear
    logger.error('❌ RSVP LLM failed after retry', {
      error: error.message,
    });

    return {
      response: 'unclear',
      confidence: 0,
    };
  }
}

/**
 * Checks if a message text contains ambiguity keywords
 * 
 * Unified with internal regex-based logic to avoid divergence
 * 
 * @param text - Message text
 * @returns true if ambiguous
 */
export function hasAmbiguityWords(text: string): boolean {
  const textN = NORMALIZE(text);
  return hasAmbiguity(textN);
}

