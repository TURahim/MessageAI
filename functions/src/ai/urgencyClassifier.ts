/**
 * Urgency Classifier - High-Precision Message Urgency Detection
 * 
 * PR9: Urgency Detection
 * 
 * Target: ≥90% precision (low false positives - urgency is high-stakes)
 * Approach: Keyword-first with LLM confirmation for edge cases
 * Conservative: Prefer false negatives over false positives
 * 
 * Keywords that indicate urgency:
 * - Explicit: "URGENT", "ASAP", "emergency", "immediately"
 * - Cancellation: "cancel session", "can't make it today", "cancel appointment"
 * - Rescheduling: "need to reschedule", "have to move", "change time"
 * - Tests/exams: "test tomorrow", "exam today", "quiz in 1 hour"
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import * as logger from 'firebase-functions/logger';
import { z } from 'zod';

// Urgency classification result
export interface UrgencyResult {
  isUrgent: boolean;
  confidence: number; // 0.0-1.0
  reason: string; // Brief explanation
  keywords?: string[]; // Matched keywords
  category?: 'cancellation' | 'reschedule' | 'emergency' | 'deadline' | 'general';
  shouldNotify: boolean; // Whether to send push notification
}

// Keywords organized by urgency type
const URGENCY_KEYWORDS = {
  // Explicit urgency markers
  explicit: [
    'urgent',
    'asap',
    'emergency',
    'immediately',
    'right now',
    'as soon as possible',
  ],
  
  // Cancellation indicators (high priority)
  cancellation: [
    'cancel session',
    'cancel appointment',
    'cancel class',
    'cancel lesson',
    'cancel meeting',
    'need to cancel',
    'have to cancel',
    'cannot make it',
    "can't make it today",
    "won't be able to make",
  ],
  
  // Rescheduling indicators (medium-high priority)
  reschedule: [
    'need to reschedule',
    'have to reschedule',
    'need to move',
    'have to move',
    'change time',
    'change date',
    'different time',
    'running late',
  ],
  
  // Time-sensitive deadlines (context-dependent)
  deadline: [
    'test tomorrow',
    'exam tomorrow',
    'test today',
    'exam today',
    'quiz in',
    'test in',
    'exam in',
    'due today',
    'due tomorrow',
  ],
};

// Low-confidence phrases (reduce urgency score)
const HEDGING_PHRASES = [
  'maybe',
  'might',
  'possibly',
  'perhaps',
  'if possible',
  'when you can',
  'no rush',
  'whenever',
];

/**
 * Fast keyword-based urgency detection
 * Returns null if no keywords detected, result if keywords found
 */
function detectUrgencyKeywords(text: string): UrgencyResult | null {
  const lowerText = text.toLowerCase();
  const matchedKeywords: string[] = [];
  let category: UrgencyResult['category'] = 'general';
  let confidence = 0.0;

  // Check for hedging phrases (reduce urgency)
  const hasHedging = HEDGING_PHRASES.some(phrase => lowerText.includes(phrase));

  // Check explicit urgency
  for (const keyword of URGENCY_KEYWORDS.explicit) {
    if (lowerText.includes(keyword)) {
      matchedKeywords.push(keyword);
      category = 'emergency';
      confidence = hasHedging ? 0.75 : 0.95; // High confidence
    }
  }

  // Check cancellation (highest priority)
  for (const keyword of URGENCY_KEYWORDS.cancellation) {
    if (lowerText.includes(keyword)) {
      matchedKeywords.push(keyword);
      category = 'cancellation';
      confidence = Math.max(confidence, hasHedging ? 0.7 : 0.9);
    }
  }

  // Check rescheduling
  for (const keyword of URGENCY_KEYWORDS.reschedule) {
    if (lowerText.includes(keyword)) {
      matchedKeywords.push(keyword);
      category = 'reschedule';
      confidence = Math.max(confidence, hasHedging ? 0.65 : 0.85);
    }
  }

  // Check time-sensitive deadlines (requires context validation)
  for (const keyword of URGENCY_KEYWORDS.deadline) {
    if (lowerText.includes(keyword)) {
      matchedKeywords.push(keyword);
      category = 'deadline';
      // Lower confidence - needs LLM validation for context
      confidence = Math.max(confidence, hasHedging ? 0.5 : 0.7);
    }
  }

  if (matchedKeywords.length === 0) {
    return null; // No urgency detected
  }

  const isUrgent = confidence >= 0.7; // Threshold for urgency
  const shouldNotify = confidence >= 0.85; // Higher threshold for notifications

  return {
    isUrgent,
    confidence,
    reason: `Matched keywords: ${matchedKeywords.join(', ')}`,
    keywords: matchedKeywords,
    category,
    shouldNotify,
  };
}

/**
 * LLM-based urgency validation for edge cases
 * Only called when keyword detection needs confirmation (confidence 0.5-0.85)
 */
async function validateUrgencyWithLLM(
  text: string,
  keywordResult: UrgencyResult
): Promise<UrgencyResult> {
  logger.info('🤖 Validating urgency with LLM', {
    keywordConfidence: keywordResult.confidence,
    keywords: keywordResult.keywords,
  });

  try {
    const prompt = `Analyze this tutoring message for urgency. Be CONSERVATIVE - only mark as urgent if action is needed within 24 hours.

Message: "${text}"

Context: Keyword detection found: ${keywordResult.keywords?.join(', ')}
Category: ${keywordResult.category}

Return JSON:
{
  "isUrgent": true/false,
  "confidence": 0.0-1.0,
  "reason": "Brief explanation"
}

Guidelines:
- "urgent", "ASAP", "emergency" → almost always urgent
- Cancellations/rescheduling for today/tomorrow → urgent
- General questions, even with "urgent" → NOT urgent
- "Test tomorrow" in context of study help → NOT urgent (just important)
- "Test tomorrow" with panic/stress → potentially urgent
- Prefer false negatives over false positives`;

    const schema = z.object({
      isUrgent: z.boolean(),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
    });

    const result = await generateText({
      model: openai('gpt-3.5-turbo'), // Fast and cheap for validation
      prompt,
      temperature: 0.3, // Low temperature for consistency
      maxTokens: 150,
    });

    // Parse JSON from response
    const parsed = schema.parse(JSON.parse(result.text));

    // Combine keyword and LLM confidence (weighted average)
    const combinedConfidence = (keywordResult.confidence * 0.6) + (parsed.confidence * 0.4);

    // Conservative threshold: only notify if both agree it's urgent
    const shouldNotify = keywordResult.shouldNotify && parsed.isUrgent && combinedConfidence >= 0.85;

    logger.info('✅ LLM validation complete', {
      llmConfidence: parsed.confidence,
      llmUrgent: parsed.isUrgent,
      combinedConfidence,
      shouldNotify,
    });

    return {
      isUrgent: parsed.isUrgent && combinedConfidence >= 0.7,
      confidence: combinedConfidence,
      reason: `${keywordResult.reason}. LLM: ${parsed.reason}`,
      keywords: keywordResult.keywords,
      category: keywordResult.category,
      shouldNotify,
    };
  } catch (error: any) {
    logger.error('❌ LLM validation failed, using keyword result', {
      error: error.message,
    });

    // Fallback to conservative keyword result
    return {
      ...keywordResult,
      shouldNotify: false, // Don't notify if LLM failed
    };
  }
}

/**
 * Main urgency classification function
 * 
 * Strategy:
 * 1. Fast keyword detection (no API call if no keywords)
 * 2. LLM validation for edge cases (confidence 0.5-0.85)
 * 3. Log all decisions for false positive analysis
 * 
 * @param text - Message text to analyze
 * @param conversationId - For logging context
 * @returns UrgencyResult with classification and notification decision
 */
export async function classifyUrgency(
  text: string,
  conversationId: string
): Promise<UrgencyResult> {
  const startTime = Date.now();

  // Step 1: Fast keyword detection
  const keywordResult = detectUrgencyKeywords(text);

  if (!keywordResult) {
    // No urgency keywords found - skip LLM call
    logger.info('✅ No urgency detected (no keywords)', {
      conversationId: conversationId.substring(0, 12),
      latency: Date.now() - startTime,
    });

    return {
      isUrgent: false,
      confidence: 0.0,
      reason: 'No urgency keywords detected',
      shouldNotify: false,
    };
  }

  // Step 2: High confidence keyword match - skip LLM
  if (keywordResult.confidence >= 0.9) {
    logger.info('✅ High-confidence urgency (keywords only)', {
      conversationId: conversationId.substring(0, 12),
      confidence: keywordResult.confidence,
      category: keywordResult.category,
      latency: Date.now() - startTime,
    });

    logUrgencyDecision(keywordResult, conversationId, text);
    return keywordResult;
  }

  // Step 3: Medium confidence - validate with LLM
  const finalResult = await validateUrgencyWithLLM(text, keywordResult);

  logger.info('✅ Urgency classification complete', {
    conversationId: conversationId.substring(0, 12),
    isUrgent: finalResult.isUrgent,
    confidence: finalResult.confidence,
    shouldNotify: finalResult.shouldNotify,
    latency: Date.now() - startTime,
  });

  logUrgencyDecision(finalResult, conversationId, text);
  return finalResult;
}

/**
 * Log urgency decisions for false positive analysis
 * 
 * Logs to Firestore /urgency_logs collection for weekly review
 * Helps identify patterns and improve classifier over time
 */
function logUrgencyDecision(
  result: UrgencyResult,
  conversationId: string,
  messageText: string
): void {
  // TODO: Store in Firestore /urgency_logs for analysis
  // For now, just log to Cloud Functions logs
  logger.info('📊 Urgency decision logged', {
    conversationId: conversationId.substring(0, 12),
    isUrgent: result.isUrgent,
    confidence: result.confidence,
    category: result.category,
    keywords: result.keywords,
    shouldNotify: result.shouldNotify,
    messagePreview: messageText.substring(0, 100),
    timestamp: new Date().toISOString(),
  });

  // In production, log false positive indicators for review:
  // - High confidence (>0.85) but user marked as not urgent
  // - Low confidence (<0.7) but user wanted notification
  // Weekly review these logs to refine keywords/prompts
}

/**
 * Helper: Check if message contains urgency indicators for gating
 * Used by gating classifier to route urgent messages
 */
export function hasUrgencyIndicators(text: string): boolean {
  const result = detectUrgencyKeywords(text);
  return result !== null && result.confidence >= 0.6;
}

