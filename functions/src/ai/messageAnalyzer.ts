/**
 * Message Analyzer - Main AI Processing Entry Point
 * 
 * Orchestrates the full AI pipeline:
 * 1. Gating (fast classifier)
 * 2. RAG context retrieval
 * 3. Full LLM with tools (GPT-4 or Claude Sonnet)
 * 4. Tool execution
 * 5. Response formatting
 */

import { gateMessage, logGatingDecision, type GatingResult } from './aiGatingService';
import { classifyUrgency, type UrgencyResult } from './urgencyClassifier';
import { extractTask, type TaskExtractionResult } from './taskExtractor';
import * as logger from 'firebase-functions/logger';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  text: string;
  createdAt: Date;
  meta?: any;
}

export interface AnalysisResult {
  gating: GatingResult;
  urgency?: UrgencyResult;
  task?: TaskExtractionResult;
  shouldProcess: boolean;
  reason?: string;
}

/**
 * Analyzes a message to determine if AI processing is needed
 * 
 * Phase 1 (PR1): Just gating
 * Phase 2 (PR2-3): Add RAG + tool calling
 * 
 * @param message - Message to analyze
 * @param bypassGating - Manual override for testing
 * @returns AnalysisResult with gating decision
 */
export async function analyzeMessage(
  message: Message,
  bypassGating: boolean = false
): Promise<AnalysisResult> {
  logger.info('🔍 Analyzing message', {
    messageId: message.id.substring(0, 8),
    conversationId: message.conversationId.substring(0, 12),
    textLength: message.text.length,
    bypassGating,
  });

  // Step 1: Gate the message
  const gating = await gateMessage(message.text, { bypassGating });

  // Log decision for analytics
  logGatingDecision(gating, message.conversationId);

  // Check confidence threshold (0.6)
  const shouldProcess = gating.confidence >= 0.6;

  if (!shouldProcess) {
    logger.info('🚫 Message gated out (confidence too low)', {
      task: gating.task,
      confidence: gating.confidence,
      threshold: 0.6,
    });

    return {
      gating,
      shouldProcess: false,
      reason: 'confidence_below_threshold',
    };
  }

  // Check if task type is null
  if (gating.task === null) {
    logger.info('🚫 Message gated out (no task detected)', {
      confidence: gating.confidence,
    });

    return {
      gating,
      shouldProcess: false,
      reason: 'no_task_detected',
    };
  }

  logger.info('✅ Message passed gating', {
    task: gating.task,
    confidence: gating.confidence,
  });

  // Step 2: Check for urgency (PR9)
  let urgency: UrgencyResult | undefined;

  if (gating.task === 'urgent') {
    // Gating detected urgency - run detailed classification
    urgency = await classifyUrgency(message.text, message.conversationId);

    logger.info('🚨 Urgency classification complete', {
      isUrgent: urgency.isUrgent,
      confidence: urgency.confidence,
      category: urgency.category,
      shouldNotify: urgency.shouldNotify,
    });
  }

  // Step 3: Check for task/deadline extraction (PR11)
  let task: TaskExtractionResult | undefined;

  if (gating.task === 'task') {
    // Gating detected task - run extraction
    // Use user's timezone (default to America/New_York if not available)
    const timezone = 'America/New_York'; // TODO: Get from user profile

    task = await extractTask(message.text, timezone);

    logger.info('📝 Task extraction complete', {
      found: task.found,
      confidence: task.confidence,
      title: task.title,
      taskType: task.taskType,
    });
  }

  // TODO (PR2-3): Add RAG context retrieval + full LLM with tools
  // For now, just return the gating result

  return {
    gating,
    urgency,
    task,
    shouldProcess: true,
  };
}

/**
 * Processes a message with full AI pipeline
 * 
 * Phase 1 (PR3): Tool framework ready
 * Phase 2 (PR4-6): Implement tool handlers
 * 
 * @param message - Message to process
 * @param gatingResult - Result from gating classifier
 */
export async function processMessageWithAI(
  message: Message,
  gatingResult: GatingResult
): Promise<void> {
  logger.info('🤖 Full AI processing with tools', {
    task: gatingResult.task,
    confidence: gatingResult.confidence,
  });

  try {
    // Step 1: Get RAG context from vector store
    const { getContext } = await import('../rag/contextBuilder');
    const { MockVectorRetriever } = await import('../../../app/src/services/vector/mockRetriever');
    
    const retriever = new MockVectorRetriever([]);
    const ragContext = await getContext(
      message.text,
      message.conversationId,
      retriever,
      { topK: 10, maxTokens: 2048 }
    );

    // Build context string from documents
    const contextString = ragContext.documents
      .map((doc, i) => `${i + 1}. ${doc.content}`)
      .join('\n');

    logger.info('📚 RAG context retrieved', {
      documentsFound: ragContext.documents.length,
      contextLength: contextString.length,
    });

    // Step 2: Build orchestration prompt
    const { buildOrchestrationPrompt } = await import('./promptTemplates');
    
    // Type guard: ensure we have a valid task type for orchestration
    if (gatingResult.task !== 'scheduling' && gatingResult.task !== 'rsvp') {
      logger.warn('⚠️ Invalid task type for orchestration', {
        task: gatingResult.task,
      });
      return;
    }
    
    const prompt = buildOrchestrationPrompt(
      message.text,
      contextString,
      gatingResult.task,
      message.senderId,
      message.conversationId
    );

    // Step 3: Call GPT-4 with tools
    const { generateText } = await import('ai');
    const { openai } = await import('@ai-sdk/openai');
    const toolSchemas = await import('./toolSchemas');
    
    const tools = toolSchemas.getToolsForTaskType(gatingResult.task) as any;

    logger.info('🔧 Calling GPT-4 with tools', {
      task: gatingResult.task,
      toolCount: Object.keys(tools).length,
    });

    const result = await generateText({
      model: openai('gpt-4-turbo'),
      prompt,
      tools: tools as any, // Type assertion for flexibility
      maxSteps: 5, // Allow multi-step workflows
      temperature: 0.7,
    });

    logger.info('✅ GPT-4 orchestration complete', {
      toolCalls: result.toolCalls?.length || 0,
      text: result.text.substring(0, 100),
    });

    // Step 4: Execute tool calls
    const { executeTool } = await import('./toolExecutor');
    
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const toolCall of result.toolCalls) {
        logger.info('🔧 Executing tool', {
          tool: toolCall.toolName,
          args: JSON.stringify(toolCall.args).substring(0, 100),
        });

        const toolResult = await executeTool(
          toolCall.toolName as any,
          toolCall.args
        );
        
        if (!toolResult.success) {
          logger.error('❌ Tool execution failed', {
            tool: toolCall.toolName,
            error: toolResult.error,
          });
        } else {
          logger.info('✅ Tool executed successfully', {
            tool: toolCall.toolName,
          });
        }
      }
    } else {
      logger.warn('⚠️ No tool calls generated', {
        responseText: result.text,
      });
    }

    logger.info('✅ Full AI processing complete');
  } catch (error: any) {
    logger.error('❌ AI processing failed', {
      error: error.message,
      stack: error.stack,
    });
    // Don't throw - allow message to be created even if AI processing fails
  }
}

