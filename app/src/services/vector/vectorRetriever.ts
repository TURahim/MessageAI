/**
 * Vector Retriever Interface Export
 * 
 * Provides type definitions for vector store implementations
 * 
 * Usage:
 * ```typescript
 * import { VectorRetriever } from '@/services/vector/vectorRetriever';
 * 
 * class MyRetriever implements VectorRetriever {
 *   async upsert(documents) { ... }
 *   async search(options) { ... }
 *   async delete(ids) { ... }
 *   async healthCheck() { return true; }
 *   getName() { return 'MyRetriever'; }
 * }
 * ```
 */

export {
  VectorRetriever,
  VectorDocument,
  SearchOptions,
  SearchResult,
  RAGContext,
} from '@/types/aiTypes';

