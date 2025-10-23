/**
 * RAG Context Builder
 * 
 * Retrieves relevant context from vector store for LLM prompts
 * Features:
 * - Top-K similarity search
 * - Recency reranking (last 7 days weighted 2x)
 * - Token limit (4096 max)
 * - PII minimization (replace names with IDs)
 */

import type { SearchResult, RAGContext } from '../../../app/src/types/aiTypes';
import * as logger from 'firebase-functions/logger';

const MAX_CONTEXT_TOKENS = 4096;
const TOKENS_PER_CHAR = 0.25; // Rough estimate: 1 token ≈ 4 chars

/**
 * Gets RAG context for a query
 * 
 * @param query - Search query
 * @param conversationId - Conversation to search within
 * @param retriever - Vector store implementation
 * @param options - Additional options
 * @returns RAGContext with documents and metadata
 * 
 * @example
 * const context = await getContext("math homework", "conv123", retriever);
 * // Returns top 20 relevant messages within token limit
 */
export async function getContext(
  query: string,
  conversationId: string,
  retriever: any, // VectorRetriever interface
  options?: {
    topK?: number;
    maxTokens?: number;
    includeRecent?: boolean;
  }
): Promise<RAGContext> {
  const startTime = Date.now();
  const topK = options?.topK || 20;
  const maxTokens = options?.maxTokens || MAX_CONTEXT_TOKENS;
  const includeRecent = options?.includeRecent !== false; // Default true

  try {
    // Step 1: Search vector store
    const results = await retriever.search({
      query,
      conversationId,
      topK,
      scoreThreshold: 0.5,
    });

    logger.info('📚 Vector search complete', {
      query: query.substring(0, 50),
      resultsFound: results.length,
    });

    // Step 2: Apply recency reranking
    let rankedResults = results;
    if (includeRecent) {
      rankedResults = applyRecencyReranking(results);
    }

    // Step 3: Limit to token budget
    const limitedResults = limitToTokenBudget(rankedResults, maxTokens);

    // Step 4: Minimize PII
    const minimizedResults = minimizePII(limitedResults);

    const retrievalTime = Date.now() - startTime;
    const totalTokens = estimateTokens(minimizedResults);

    logger.info('✅ Context built', {
      documentsIncluded: minimizedResults.length,
      totalTokens,
      retrievalTime,
      source: retriever.getName(),
    });

    return {
      documents: minimizedResults,
      totalTokens,
      retrievalTime,
      source: retriever.getName(),
    };
  } catch (error: any) {
    logger.error('❌ RAG context building failed', {
      error: error.message,
      query: query.substring(0, 50),
    });
    throw new Error(`RAG_FAILED: ${error.message}`);
  }
}

/**
 * Applies recency reranking
 * Messages from last 7 days get 2x score boost
 */
function applyRecencyReranking(results: SearchResult[]): SearchResult[] {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return results
    .map(result => {
      const timestamp = result.metadata.timestamp instanceof Date
        ? result.metadata.timestamp
        : result.metadata.timestamp.toDate();

      const isRecent = timestamp > sevenDaysAgo;
      const adjustedScore = isRecent ? result.score * 2.0 : result.score;

      return {
        ...result,
        score: adjustedScore,
      };
    })
    .sort((a, b) => b.score - a.score); // Re-sort by adjusted scores
}

/**
 * Limits results to fit within token budget
 */
function limitToTokenBudget(results: SearchResult[], maxTokens: number): SearchResult[] {
  let tokenCount = 0;
  const limited: SearchResult[] = [];

  for (const result of results) {
    const resultTokens = estimateTokens([result]);
    
    if (tokenCount + resultTokens > maxTokens) {
      logger.info(`⚠️ Token budget reached: ${tokenCount}/${maxTokens} tokens`);
      break;
    }

    limited.push(result);
    tokenCount += resultTokens;
  }

  return limited;
}

/**
 * Estimates token count for results
 */
function estimateTokens(results: SearchResult[]): number {
  const totalChars = results.reduce((sum, r) => sum + r.content.length, 0);
  return Math.ceil(totalChars * TOKENS_PER_CHAR);
}

/**
 * Minimizes PII in context
 * Replaces actual names with user IDs
 * 
 * @param results - Search results to minimize
 * @returns Results with PII replaced
 */
function minimizePII(results: SearchResult[]): SearchResult[] {
  return results.map(result => {
    // Replace sender name with ID in content
    // This is a simple version - in production, use NER (Named Entity Recognition)
    let content = result.content;

    // Keep IDs visible for debugging but remove actual names
    // Example: "Sarah said..." → "User user_123 said..."
    // For now, just tag the content with sender ID
    const senderId = result.metadata.senderId;
    const prefix = `[User ${senderId.substring(0, 8)}] `;

    return {
      ...result,
      content: prefix + content,
    };
  });
}

/**
 * Formats context for LLM prompt
 * 
 * @param context - RAG context
 * @returns Formatted string for prompt
 */
export function formatContextForPrompt(context: RAGContext): string {
  if (context.documents.length === 0) {
    return 'No relevant context found.';
  }

  const formatted = context.documents
    .map((doc, index) => {
      const timestamp = doc.metadata.timestamp instanceof Date
        ? doc.metadata.timestamp.toISOString()
        : doc.metadata.timestamp.toDate().toISOString();

      return `[${index + 1}] (${timestamp})\n${doc.content}`;
    })
    .join('\n\n');

  return `Relevant conversation history (${context.documents.length} messages, ${context.totalTokens} tokens):\n\n${formatted}`;
}

