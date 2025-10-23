/**
 * RAG Service (Client-Side)
 * 
 * Provides retrieval-augmented generation context for AI operations
 * Swappable vector store via environment variable
 * 
 * Usage:
 * ```typescript
 * import { getRagContext } from '@/services/ai/ragService';
 * 
 * const context = await getRagContext("math homework", "conv123");
 * // Use context in LLM prompt
 * ```
 */

import { MockVectorRetriever } from '../vector/mockRetriever';
import { FirebaseVectorRetriever } from '../vector/firebaseRetriever';
import { PineconeVectorRetriever } from '../vector/pineconeRetriever';
import type { VectorRetriever, RAGContext } from '@/types/aiTypes';

/**
 * Gets the appropriate vector retriever based on environment
 * 
 * @returns VectorRetriever instance
 * 
 * Environment variable VECTOR_STORE:
 * - 'mock' → MockVectorRetriever (for testing)
 * - 'pinecone' → PineconeVectorRetriever (future)
 * - 'firebase' | undefined → FirebaseVectorRetriever (default)
 */
export function getVectorRetriever(): VectorRetriever {
  const store = process.env.VECTOR_STORE || 'firebase';

  switch (store) {
    case 'mock':
      console.log('📦 Using MockVectorRetriever (test mode)');
      return new MockVectorRetriever();

    case 'pinecone':
      console.log('🌲 Using PineconeVectorRetriever');
      return new PineconeVectorRetriever();

    case 'firebase':
    default:
      console.log('🔥 Using FirebaseVectorRetriever');
      return new FirebaseVectorRetriever();
  }
}

/**
 * Gets RAG context for a query
 * Convenience wrapper around retriever
 * 
 * @param query - Search query
 * @param conversationId - Conversation ID to filter
 * @param options - Additional options
 * @returns RAG context with documents
 */
export async function getRagContext(
  query: string,
  conversationId: string,
  options?: {
    topK?: number;
    maxTokens?: number;
  }
): Promise<RAGContext> {
  const retriever = getVectorRetriever();

  // Verify retriever is healthy
  const healthy = await retriever.healthCheck();
  if (!healthy) {
    throw new Error(`Vector retriever ${retriever.getName()} failed health check`);
  }

  // Search for context
  const startTime = Date.now();
  const results = await retriever.search({
    query,
    conversationId,
    topK: options?.topK || 20,
    scoreThreshold: 0.5,
  });

  // Calculate total tokens (rough estimate)
  const totalTokens = results.reduce((sum, r) => sum + Math.ceil(r.content.length / 4), 0);

  return {
    documents: results,
    totalTokens,
    retrievalTime: Date.now() - startTime,
    source: retriever.getName(),
  };
}

