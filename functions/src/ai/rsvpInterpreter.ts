/**
 * RSVP Response Interpreter
 * 
 * Classifies natural language responses to event invitations
 * Uses lightweight LLM for fast classification
 * 
 * Target: >80% accuracy
 * Auto-records when confidence >0.7
 * Detects ambiguity words: "maybe", "might", "should work", "probably"
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

/**
 * Ambiguity keywords that require explicit confirmation
 */
const AMBIGUITY_KEYWORDS = [
  'maybe',
  'might',
  'should work',
  'probably',
  'think so',
  'not sure',
  'let me check',
  'i\'ll see',
  'possibly',
];

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

  try {
    // Check for ambiguity keywords first (fast, no LLM needed)
    const textLower = text.toLowerCase();
    const hasAmbiguity = AMBIGUITY_KEYWORDS.some(keyword => 
      textLower.includes(keyword)
    );

    // Use GPT-3.5 or Claude Haiku for fast classification
    const result = await generateObject({
      model: openai('gpt-3.5-turbo'),
      schema: z.object({
        response: z.enum(['accept', 'decline', 'unclear']).describe('RSVP response type'),
        confidence: z.number().min(0).max(1).describe('Confidence score'),
      }),
      prompt: `${RSVP_INTERPRETATION_PROMPT}\n\n"${text}"`,
      temperature: 0.3, // Deterministic
      maxTokens: 50,
    });

    const parsed = result.object;

    // Reduce confidence if ambiguity detected
    let adjustedConfidence = parsed.confidence;
    if (hasAmbiguity) {
      adjustedConfidence = Math.min(parsed.confidence, 0.6); // Cap at 0.6 if ambiguous
      logger.warn('⚠️ Ambiguity detected in RSVP', {
        text: text.substring(0, 50),
        originalConfidence: parsed.confidence,
        adjustedConfidence,
      });
    }

    // Determine if we should auto-record
    const shouldAutoRecord = 
      adjustedConfidence >= 0.7 &&
      !hasAmbiguity &&
      parsed.response !== 'unclear';

    logger.info('✅ RSVP interpreted', {
      response: parsed.response,
      confidence: adjustedConfidence,
      hasAmbiguity,
      shouldAutoRecord,
    });

    return {
      response: parsed.response,
      confidence: adjustedConfidence,
      hasAmbiguity,
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
 * Checks if a message text contains ambiguity keywords
 * 
 * @param text - Message text
 * @returns true if ambiguous
 */
export function hasAmbiguityWords(text: string): boolean {
  const textLower = text.toLowerCase();
  return AMBIGUITY_KEYWORDS.some(keyword => textLower.includes(keyword));
}

