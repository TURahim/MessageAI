/**
 * AI Gating Service
 * 
 * Fast classifier to determine if a message needs AI processing
 * Uses lightweight models (GPT-3.5-turbo or Claude Haiku) for cost efficiency
 * 
 * Target Metrics:
 * - P95 latency: <500ms
 * - Accuracy: >85%
 * - Precision (urgency): ≥90%
 * - Cost: <$0.001 per message
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { GATING_CLASSIFIER_PROMPT } from './promptTemplates';
import * as logger from 'firebase-functions/logger';

export type TaskType = 'scheduling' | 'rsvp' | 'task' | 'urgent' | null;

export interface GatingResult {
  task: TaskType;
  confidence: number;
  processingTime: number; // milliseconds
  modelUsed: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  cost: number; // USD
}

/**
 * Configuration for gating classifier
 */
const GATING_CONFIG = {
  // Confidence threshold: only process if ≥0.6
  confidenceThreshold: 0.6,
  
  // Model priority (try in order, fallback if error)
  models: [
    { provider: 'openai', model: 'gpt-3.5-turbo', cost: 0.0005 }, // $0.50 per 1M input tokens
    { provider: 'anthropic', model: 'claude-3-haiku-20240307', cost: 0.00025 }, // $0.25 per 1M tokens
  ],
  
  // Retry configuration
  maxRetries: 2,
  retryDelay: 1000, // ms
  
  // Timeout
  timeout: 5000, // 5s max
};

/**
 * Gates a message to determine if AI processing is needed
 * 
 * @param text - Message text to classify
 * @param options - Optional configuration overrides
 * @returns GatingResult with task type and confidence
 * 
 * @example
 * const result = await gateMessage("Can we meet tomorrow at 3pm?");
 * if (result.confidence >= 0.6) {
 *   // Process with full AI
 * }
 */
export async function gateMessage(
  text: string,
  options?: { model?: string; bypassGating?: boolean }
): Promise<GatingResult> {
  const startTime = Date.now();

  // Manual override for testing
  if (options?.bypassGating) {
    logger.info('⚡ Gating bypassed via manual override');
    return {
      task: 'scheduling', // Assume scheduling for testing
      confidence: 1.0,
      processingTime: 0,
      modelUsed: 'bypassed',
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
    };
  }

  // Try models in order with retry logic
  for (let attempt = 0; attempt <= GATING_CONFIG.maxRetries; attempt++) {
    for (const modelConfig of GATING_CONFIG.models) {
      try {
        logger.info(`🔍 Gating attempt ${attempt + 1}/${GATING_CONFIG.maxRetries + 1}`, {
          model: modelConfig.model,
          textLength: text.length,
        });

        const model = modelConfig.provider === 'openai' 
          ? openai(modelConfig.model)
          : anthropic(modelConfig.model);

        const result = await generateText({
          model,
          prompt: `${GATING_CLASSIFIER_PROMPT}\n\n"${text}"`,
          maxTokens: 50, // Small response
          temperature: 0.3, // Deterministic
        });

        // Parse JSON response
        const parsed = JSON.parse(result.text);
        const task: TaskType = parsed.task;
        const confidence: number = parsed.confidence;

        const processingTime = Date.now() - startTime;

        // Estimate cost (simplified)
        const inputTokens = Math.ceil(text.length / 4); // ~4 chars per token
        const outputTokens = result.usage?.completionTokens || 20;
        const costPerToken = modelConfig.cost / 1_000_000;
        const estimatedCost = (inputTokens + outputTokens) * costPerToken;

        // Log for weekly analysis
        logger.info('✅ Gating complete', {
          task,
          confidence,
          processingTime,
          model: modelConfig.model,
          inputTokens,
          outputTokens,
          cost: estimatedCost,
        });

        // Log false positives for urgency (precision tracking)
        if (task === 'urgent' && confidence > 0.6) {
          logger.warn('⚠️ URGENCY FLAGGED - Review weekly for false positives', {
            text: text.substring(0, 100), // First 100 chars
            confidence,
          });
        }

        return {
          task,
          confidence,
          processingTime,
          modelUsed: modelConfig.model,
          tokensUsed: {
            input: inputTokens,
            output: outputTokens,
          },
          cost: estimatedCost,
        };
      } catch (error: any) {
        logger.error(`❌ Gating failed with ${modelConfig.model}`, {
          attempt: attempt + 1,
          error: error.message,
        });

        // If last attempt with last model, throw
        if (attempt === GATING_CONFIG.maxRetries && 
            modelConfig === GATING_CONFIG.models[GATING_CONFIG.models.length - 1]) {
          throw new Error(`GATING_FAILED: All retries exhausted. Last error: ${error.message}`);
        }

        // Wait before retry
        if (attempt < GATING_CONFIG.maxRetries) {
          await new Promise(resolve => 
            setTimeout(resolve, GATING_CONFIG.retryDelay * (attempt + 1))
          );
        }
      }
    }
  }

  // Should never reach here
  throw new Error('GATING_FAILED: Unexpected error in retry loop');
}

/**
 * Logs gating decision for weekly analytics
 * 
 * @param result - GatingResult to log
 * @param conversationId - Conversation ID for grouping
 */
export function logGatingDecision(result: GatingResult, conversationId: string): void {
  // Structured log for BigQuery export
  const logData = {
    type: 'gating_decision',
    task: result.task,
    confidence: result.confidence,
    passed: result.confidence >= GATING_CONFIG.confidenceThreshold,
    processingTime: result.processingTime,
    model: result.modelUsed,
    inputTokens: result.tokensUsed.input,
    outputTokens: result.tokensUsed.output,
    cost: result.cost,
    conversationId,
    timestamp: new Date().toISOString(),
  };

  logger.info('📊 Gating decision logged', logData);
}

/**
 * Gets weekly gating statistics (for manual review)
 * This data comes from BigQuery exports
 * 
 * Stats to track:
 * - Total messages gated
 * - Task type distribution
 * - Confidence score distribution
 * - False positive rate (especially for urgency)
 * - Average cost per message
 * - P50/P95/P99 latency
 */
export function getGatingThresholds() {
  return {
    confidenceThreshold: GATING_CONFIG.confidenceThreshold,
    targetLatencyP95: 500, // ms
    targetAccuracy: 0.85,
    targetPrecisionUrgency: 0.90,
  };
}

