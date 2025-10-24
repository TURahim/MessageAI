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

export type TaskType = 
  | 'scheduling'   // meeting or lesson setup
  | 'rsvp'         // confirmation or decline
  | 'task'         // general action item (non-deadline)
  | 'urgent'       // cancellation, emergency, high-priority issue
  | 'deadline'     // due dates, homework, assignments
  | 'reminder'     // proactive follow-up or nudge
  | null;

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
      // 1. Setup timeout with AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        logger.warn('⏰ Gating timeout triggered', {
          model: modelConfig.model,
          timeout: GATING_CONFIG.timeout,
        });
      }, GATING_CONFIG.timeout);

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
          abortSignal: controller.signal,
        });

        // Clear timeout on success
        clearTimeout(timeoutId);

        // Parse JSON response (handle markdown code blocks)
        let responseText = result.text.trim();
        
        // Remove markdown code blocks if present
        if (responseText.startsWith('```')) {
          responseText = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        }
        
        // 2. Guard JSON parsing
        let parsed: any;
        try {
          parsed = JSON.parse(responseText);
        } catch (parseError: any) {
          logger.error('⚠️ JSON parse failed', {
            responseText: responseText.substring(0, 200),
            error: parseError.message,
            model: modelConfig.model,
          });
          
          // Clear timeout before continuing
          clearTimeout(timeoutId);
          
          // Return safe fallback
          return {
            task: null,
            confidence: 0,
            processingTime: Date.now() - startTime,
            modelUsed: modelConfig.model,
            tokensUsed: { input: 0, output: 0 },
            cost: 0,
          };
        }

        const task: TaskType = parsed.task;
        
        // 3. Normalize confidence (clamp to 0-1 range)
        const confidence = Math.max(0, Math.min(parsed.confidence ?? 0, 1));

        const processingTime = Date.now() - startTime;

        // 4. Explicit cost accounting with precise rates
        let inputTokens = 0;
        let outputTokens = 0;
        let preciseCost = 0;

        if (result.usage) {
          // Use actual usage from API
          inputTokens = result.usage.promptTokens || 0;
          outputTokens = result.usage.completionTokens || 0;
        } else {
          // Fallback to heuristic
          inputTokens = Math.ceil(text.length / 4);
          outputTokens = Math.ceil(responseText.length / 4);
        }

        // Precise cost calculation based on API pricing
        // OpenAI GPT-3.5-turbo: $0.50/1M input, $1.50/1M output
        // Anthropic Claude Haiku: $0.25/1M input, $1.25/1M output
        if (modelConfig.provider === 'openai') {
          if (modelConfig.model === 'gpt-3.5-turbo') {
            preciseCost = (inputTokens * 0.50 + outputTokens * 1.50) / 1_000_000;
          } else {
            // Fallback to config cost
            preciseCost = (inputTokens + outputTokens) * (modelConfig.cost / 1_000_000);
          }
        } else if (modelConfig.provider === 'anthropic') {
          if (modelConfig.model === 'claude-3-haiku-20240307') {
            preciseCost = (inputTokens * 0.25 + outputTokens * 1.25) / 1_000_000;
          } else {
            preciseCost = (inputTokens + outputTokens) * (modelConfig.cost / 1_000_000);
          }
        } else {
          // Generic fallback
          preciseCost = (inputTokens + outputTokens) * (modelConfig.cost / 1_000_000);
        }

        // Log for weekly analysis
        logger.info('✅ Gating complete', {
          task,
          confidence,
          processingTime,
          model: modelConfig.model,
          inputTokens,
          outputTokens,
          cost: preciseCost,
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
          cost: preciseCost,
        };
      } catch (error: any) {
        // Clear timeout on error
        clearTimeout(timeoutId);

        // Check if timeout/abort error
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          logger.warn('⏰ Gating timed out', {
            model: modelConfig.model,
            timeout: GATING_CONFIG.timeout,
            attempt: attempt + 1,
          });
        } else {
          logger.error(`❌ Gating failed with ${modelConfig.model}`, {
            attempt: attempt + 1,
            error: error.message,
          });
        }

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

