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

export type AnalysisReason = 
  | 'confidence_below_threshold' 
  | 'no_task_detected' 
  | 'gating_error';

export type NextAction = 
  | 'orchestrate'  // scheduling/rsvp/reminder → full GPT-4
  | 'none'         // no processing needed
  | 'notify'       // urgent → send push
  | 'index';       // task/deadline → extraction only

export interface AnalysisResult {
  gating: GatingResult;
  urgency?: UrgencyResult;
  task?: TaskExtractionResult;
  shouldProcess: boolean;
  reason?: AnalysisReason;
  nextAction?: NextAction;
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
  const correlationId = message.id.substring(0, 8);
  const t_gateStart = Date.now();

  logger.info('🔍 Analyzing message', {
    correlationId,
    conversationId: message.conversationId.substring(0, 12),
    textLength: message.text.length,
    bypassGating,
  });

  // Step 1: Gate the message (fail-safe)
  let gating: GatingResult;
  
  try {
    gating = await gateMessage(message.text, { bypassGating });
    const t_gateEnd = Date.now();
    
    logger.info('⏱️ Gating latency', {
      correlationId,
      duration: t_gateEnd - t_gateStart,
    });
  } catch (error: any) {
    const t_gateEnd = Date.now();
    
    logger.error('❌ Gating failed, using safe fallback', {
      correlationId,
      error: error.message,
      duration: t_gateEnd - t_gateStart,
    });
    
    // Safe fallback
    return {
      gating: {
        task: null,
        confidence: 0,
        processingTime: t_gateEnd - t_gateStart,
        modelUsed: 'n/a',
        tokensUsed: { input: 0, output: 0 },
        cost: 0,
      },
      shouldProcess: false,
      reason: 'gating_error',
      nextAction: 'none',
    };
  }

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
      nextAction: 'none',
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
      nextAction: 'none',
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

  if (gating.task === 'deadline' || gating.task === 'task') {
    const t_extractStart = Date.now();
    
    // Gating detected deadline or task - run extraction
    // Fetch sender's timezone
    const { getUserTimezone } = await import('../utils/timezone');
    const timezone = await getUserTimezone(message.senderId);
    const referenceTime = message.createdAt ?? new Date();

    task = await extractTask(message.text, timezone, referenceTime);

    const t_extractEnd = Date.now();

    logger.info('📝 Task extraction complete', {
      correlationId,
      found: task.found,
      confidence: task.confidence,
      title: task.title,
      taskType: task.taskType,
      gatingTask: gating.task,
      duration: t_extractEnd - t_extractStart,
    });
  }

  // Determine next action based on gating result
  let nextAction: NextAction = 'none';
  
  if (gating.task === 'scheduling' || gating.task === 'rsvp' || gating.task === 'reminder') {
    nextAction = 'orchestrate';
  } else if (gating.task === 'urgent' && urgency?.shouldNotify) {
    nextAction = 'notify';
  } else if ((gating.task === 'task' || gating.task === 'deadline') && task?.found) {
    nextAction = 'index';
  }

  return {
    gating,
    urgency,
    task,
    shouldProcess: true,
    nextAction,
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
  gatingResult: GatingResult,
  retriever?: any  // Optional retriever injection (mock in tests, real in prod)
): Promise<void> {
  const correlationId = message.id.substring(0, 8);

  logger.info('🤖 Full AI processing with tools', {
    correlationId,
    task: gatingResult.task,
    confidence: gatingResult.confidence,
  });

  try {
    // Step 1: Get RAG context from vector store
    const t_ragStart = Date.now();
    const { getContext } = await import('../rag/contextBuilder');
    
    // Use injected retriever or fallback to mock
    let vectorRetriever = retriever;
    if (!vectorRetriever) {
      const { MockVectorRetriever } = await import('../../../app/src/services/vector/mockRetriever');
      vectorRetriever = new MockVectorRetriever([]);
    }
    
    const ragContext = await getContext(
      message.text,
      message.conversationId,
      vectorRetriever,
      { topK: 10, maxTokens: 2048 }
    );

    const t_ragEnd = Date.now();

    // Build context string from documents
    const contextString = ragContext.documents
      .map((doc, i) => `${i + 1}. ${doc.content}`)
      .join('\n');

    logger.info('📚 RAG context retrieved', {
      correlationId,
      documentsFound: ragContext.documents.length,
      contextLength: contextString.length,
      duration: t_ragEnd - t_ragStart,
    });

    // Step 2: Build orchestration prompt
    const { buildOrchestrationPrompt } = await import('./promptTemplates');
    
    // Type guard: ensure we have a valid task type for orchestration
    if (gatingResult.task !== 'scheduling' && 
        gatingResult.task !== 'rsvp' && 
        gatingResult.task !== 'reminder') {
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

    // Step 3: Call GPT-4 with tools (2-round loop)
    const t_llmStart = Date.now();
    const { generateText } = await import('ai');
    const { openai } = await import('@ai-sdk/openai');
    const toolSchemas = await import('./toolSchemas');
    
    const originalTools = toolSchemas.getToolsForTaskType(gatingResult.task) ?? {};

    // Convert tool names: dots to underscores (OpenAI requires ^[a-zA-Z0-9_-]+$)
    const tools: any = {};
    for (const [key, value] of Object.entries(originalTools)) {
      const normalizedKey = key.replace(/\./g, '_'); // "time.parse" → "time_parse"
      tools[normalizedKey] = value;
    }

    logger.info('🔧 Calling GPT-4 with tools', {
      correlationId,
      task: gatingResult.task,
      toolCount: Object.keys(tools).length,
      toolNames: Object.keys(tools),
    });

    // Round 1: Initial tool call
    const round1Result = await generateText({
      model: openai('gpt-4-turbo'),
      prompt,
      tools: tools as any,
      maxSteps: 1, // Single step for Round 1
      temperature: 0.7,
    });

    const t_llmEnd = Date.now();

    logger.info('✅ GPT-4 Round 1 complete', {
      correlationId,
      toolCalls: round1Result.toolCalls?.length || 0,
      duration: t_llmEnd - t_llmStart,
    });

    // Step 4: Execute tools from Round 1
    const { executeTool } = await import('./toolExecutor');
    const t_toolsStart = Date.now();
    const toolOutputs: Array<{ tool: string; result: any }> = [];
    
    if (round1Result.toolCalls && round1Result.toolCalls.length > 0) {
      for (const toolCall of round1Result.toolCalls) {
        // Convert tool name back: underscores to dots
        const originalToolName = toolCall.toolName.replace(/_/g, '.'); // "time_parse" → "time.parse"
        
        logger.info('🔧 Executing tool', {
          correlationId,
          tool: originalToolName,
          args: JSON.stringify(toolCall.args).substring(0, 100),
        });

        const toolResult = await executeTool(
          originalToolName as any,
          toolCall.args
        );
        
        toolOutputs.push({
          tool: toolCall.toolName,
          result: toolResult,
        });
        
        if (!toolResult.success) {
          logger.error('❌ Tool execution failed', {
            correlationId,
            tool: toolCall.toolName,
            error: toolResult.error,
          });
        } else {
          logger.info('✅ Tool executed successfully', {
            correlationId,
            tool: toolCall.toolName,
          });
        }
      }

      const t_toolsEnd = Date.now();

      logger.info('⏱️ Tools execution latency', {
        correlationId,
        duration: t_toolsEnd - t_toolsStart,
        toolCount: toolOutputs.length,
      });

      // Round 2: Call model with tool results
      const toolResultsSection = toolOutputs.map((output, i) => 
        `${i + 1}. ${output.tool}: ${JSON.stringify(output.result, null, 2)}`
      ).join('\n\n');

      const augmentedPrompt = `${prompt}\n\n# Tool Results\n${toolResultsSection}\n\nBased on these tool results, provide a final response or call additional tools if needed.`;

      const t_llm2Start = Date.now();

      logger.info('🔧 GPT-4 Round 2 with tool results', {
        correlationId,
      });

      const round2Result = await generateText({
        model: openai('gpt-4-turbo'),
        prompt: augmentedPrompt,
        tools: tools as any,
        maxSteps: 1, // Single step for Round 2
        temperature: 0.7,
      });

      const t_llm2End = Date.now();

      logger.info('✅ GPT-4 Round 2 complete', {
        correlationId,
        text: round2Result.text.substring(0, 100),
        duration: t_llm2End - t_llm2Start,
      });

      // Execute any additional tool calls from Round 2 (if any)
      if (round2Result.toolCalls && round2Result.toolCalls.length > 0) {
        for (const toolCall of round2Result.toolCalls) {
          // Convert tool name back: underscores to dots
          const originalToolName = toolCall.toolName.replace(/_/g, '.');
          
          logger.info('🔧 Executing Round 2 tool', {
            correlationId,
            tool: originalToolName,
          });

          await executeTool(originalToolName as any, toolCall.args);
        }
      }
    } else {
      // No tools in Round 1, stop early
      logger.warn('⚠️ No tool calls generated in Round 1', {
        correlationId,
        responseText: round1Result.text.substring(0, 100),
      });
    }

    const t_totalEnd = Date.now();

    logger.info('✅ Full AI processing complete', {
      correlationId,
      totalDuration: t_totalEnd - t_llmStart,
    });
  } catch (error: any) {
    logger.error('❌ AI processing failed', {
      correlationId,
      error: error.message,
      stack: error.stack,
    });
    // Don't throw - allow message to be created even if AI processing fails
  }
}

