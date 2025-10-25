/**
 * Feature Flags
 * 
 * Toggle features for gradual rollout and easy rollback
 */

export const FEATURE_FLAGS = {
  /**
   * Use fast-path scheduling (chrono-node + templates) instead of full LLM orchestration
   * Set to false to revert to legacy GPT-4 flow
   */
  USE_FAST_PATH_SCHEDULING: true,

  /**
   * Use GPT-4o-mini instead of GPT-4-turbo for cost and speed
   */
  USE_GPT4O_MINI: true,

  /**
   * Skip RAG retrieval for scheduling tasks (not needed for simple time parsing)
   */
  SKIP_RAG_FOR_SCHEDULING: true,

  /**
   * Use pre-LLM heuristics for gating classification
   */
  USE_FAST_PATH_GATING: true,

  /**
   * Use real vector search (Firebase/Pinecone) instead of mock retriever
   * Set to false during development or to revert to mock
   * Requires: generateMessageEmbedding function enabled
   */
  USE_REAL_VECTOR_SEARCH: false, // Start with false until validated
};

