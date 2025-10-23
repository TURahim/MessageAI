/**
 * Embedding Service
 * 
 * Generates vector embeddings using OpenAI text-embedding-3-small
 * Dimensions: 1536
 * Cost: ~$0.00002 per 1K tokens ($0.02 per 1M tokens)
 * 
 * Supports single and batch embedding for cost efficiency
 */

import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import * as logger from 'firebase-functions/logger';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;

/**
 * Generates embedding for a single text
 * 
 * @param text - Text to embed
 * @returns Float array of embedding values
 * 
 * @example
 * const embedding = await embedMessage("Math homework due Friday");
 * // Returns: number[] with 1536 dimensions
 */
export async function embedMessage(text: string): Promise<number[]> {
  try {
    const result = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      value: text,
    });

    logger.info('✅ Embedding generated', {
      textLength: text.length,
      dimensions: result.embedding.length,
      tokens: result.usage?.tokens || 0,
    });

    return result.embedding;
  } catch (error: any) {
    logger.error('❌ Embedding generation failed', {
      error: error.message,
      textLength: text.length,
    });
    throw new Error(`EMBEDDING_FAILED: ${error.message}`);
  }
}

/**
 * Generates embeddings for multiple texts (batch)
 * More efficient than calling embedMessage() multiple times
 * 
 * @param texts - Array of texts to embed
 * @returns Array of embedding arrays (preserves order)
 * 
 * @example
 * const embeddings = await embedMessagesBatch([
 *   "Message 1",
 *   "Message 2",
 *   "Message 3"
 * ]);
 * // Returns: number[][] with 3 embeddings
 */
export async function embedMessagesBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  if (texts.length === 1) {
    const embedding = await embedMessage(texts[0]);
    return [embedding];
  }

  try {
    const result = await embedMany({
      model: openai.embedding(EMBEDDING_MODEL),
      values: texts,
    });

    logger.info('✅ Batch embeddings generated', {
      count: texts.length,
      dimensions: result.embeddings[0]?.length || 0,
      tokens: result.usage?.tokens || 0,
      avgTextLength: texts.reduce((sum, t) => sum + t.length, 0) / texts.length,
    });

    return result.embeddings;
  } catch (error: any) {
    logger.error('❌ Batch embedding generation failed', {
      error: error.message,
      count: texts.length,
    });
    throw new Error(`BATCH_EMBEDDING_FAILED: ${error.message}`);
  }
}

/**
 * Calculates cosine similarity between two embeddings
 * 
 * @param embedding1 - First embedding vector
 * @param embedding2 - Second embedding vector
 * @returns Similarity score (0-1, where 1 is identical)
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same dimensions');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  
  return similarity;
}

/**
 * Gets embedding model info
 */
export function getEmbeddingModelInfo() {
  return {
    model: EMBEDDING_MODEL,
    dimensions: DIMENSIONS,
    costPer1MTokens: 0.02, // USD
    provider: 'OpenAI',
  };
}

