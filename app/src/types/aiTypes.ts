/**
 * AI-Specific Type Definitions
 * 
 * Shared types for AI services, RAG, and vector search
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Document stored in vector database
 */
export interface VectorDocument {
  id: string; // messageId or documentId
  content: string; // Message text or document content
  embedding: number[]; // Vector embedding (1536 dims for OpenAI)
  metadata: {
    conversationId: string;
    senderId: string;
    timestamp: Timestamp | Date;
    messageType?: 'text' | 'image';
    [key: string]: any; // Additional metadata
  };
}

/**
 * Search options for vector queries
 */
export interface SearchOptions {
  query: string; // Search query text
  conversationId?: string; // Filter by conversation
  topK?: number; // Number of results (default: 20)
  scoreThreshold?: number; // Minimum similarity score (0-1)
  filter?: Record<string, any>; // Additional metadata filters
}

/**
 * Search result from vector query
 */
export interface SearchResult {
  id: string;
  content: string;
  score: number; // Similarity score (0-1)
  metadata: VectorDocument['metadata'];
}

/**
 * Vector Retriever Interface
 * 
 * Abstraction for different vector store implementations
 * (Firebase, Pinecone, Mock)
 */
export interface VectorRetriever {
  /**
   * Insert or update documents in vector store
   * 
   * @param documents - Array of documents to upsert
   * @returns Promise with upserted count
   * 
   * @example
   * await retriever.upsert([
   *   { id: 'msg1', content: 'Hello', embedding: [...], metadata: {...} }
   * ]);
   */
  upsert(documents: VectorDocument[]): Promise<{ count: number }>;

  /**
   * Search for similar documents
   * 
   * @param options - Search parameters
   * @returns Promise with array of results
   * 
   * @example
   * const results = await retriever.search({
   *   query: 'math homework',
   *   conversationId: 'conv123',
   *   topK: 10
   * });
   */
  search(options: SearchOptions): Promise<SearchResult[]>;

  /**
   * Delete documents by IDs
   * 
   * @param ids - Array of document IDs to delete
   * @returns Promise with deleted count
   */
  delete(ids: string[]): Promise<{ count: number }>;

  /**
   * Health check to verify connection
   * 
   * @returns Promise<true> if healthy, throws if not
   * 
   * @example
   * const healthy = await retriever.healthCheck();
   * if (!healthy) throw new Error('Retriever unhealthy');
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get retriever name (for logging)
   */
  getName(): string;
}

/**
 * RAG Context for LLM prompts
 */
export interface RAGContext {
  documents: SearchResult[];
  totalTokens: number; // Estimated token count
  retrievalTime: number; // Milliseconds
  source: string; // 'firebase' | 'pinecone' | 'mock'
}

/**
 * Gating result (from aiGatingService)
 */
export interface GatingResult {
  task: 'scheduling' | 'rsvp' | 'task' | 'urgent' | null;
  confidence: number;
  processingTime: number;
  modelUsed: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  cost: number;
}

