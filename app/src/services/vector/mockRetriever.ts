/**
 * Mock Vector Retriever for Testing
 * 
 * Returns canned responses without external dependencies
 * Always passes healthCheck()
 * 
 * Usage in tests:
 * ```typescript
 * const mockData = [
 *   { id: 'msg1', content: 'Math homework due Friday', ... }
 * ];
 * const retriever = new MockVectorRetriever(mockData);
 * const results = await retriever.search({ query: 'homework' });
 * ```
 */

import type {
  VectorRetriever,
  VectorDocument,
  SearchOptions,
  SearchResult,
} from '../../types/aiTypes';

export class MockVectorRetriever implements VectorRetriever {
  private documents: Map<string, VectorDocument> = new Map();

  constructor(initialData?: VectorDocument[]) {
    if (initialData) {
      initialData.forEach(doc => {
        this.documents.set(doc.id, doc);
      });
    }
  }

  async upsert(documents: VectorDocument[]): Promise<{ count: number }> {
    documents.forEach(doc => {
      this.documents.set(doc.id, doc);
    });

    return { count: documents.length };
  }

  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, conversationId, topK = 20, scoreThreshold = 0.0 } = options;

    // Simple mock: filter by conversationId and return with mock scores
    let results = Array.from(this.documents.values());

    // Filter by conversationId if provided
    if (conversationId) {
      results = results.filter(doc => doc.metadata.conversationId === conversationId);
    }

    // Simple text matching for mock scores (in real system, use cosine similarity)
    const scoredResults: SearchResult[] = results.map(doc => {
      const content = doc.content.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // Simple scoring: count query word matches
      const queryWords = queryLower.split(' ');
      const matchCount = queryWords.filter(word => content.includes(word)).length;
      const score = Math.min(matchCount / queryWords.length, 1.0);

      return {
        id: doc.id,
        content: doc.content,
        score,
        metadata: doc.metadata,
      };
    });

    // Filter by threshold
    const filtered = scoredResults.filter(r => r.score >= scoreThreshold);

    // Sort by score descending
    const sorted = filtered.sort((a, b) => b.score - a.score);

    // Limit to topK
    return sorted.slice(0, topK);
  }

  async delete(ids: string[]): Promise<{ count: number }> {
    let count = 0;
    ids.forEach(id => {
      if (this.documents.delete(id)) {
        count++;
      }
    });

    return { count };
  }

  async healthCheck(): Promise<boolean> {
    // Mock retriever is always healthy
    return true;
  }

  getName(): string {
    return 'MockVectorRetriever';
  }

  // Test helper: get all documents
  getAllDocuments(): VectorDocument[] {
    return Array.from(this.documents.values());
  }

  // Test helper: clear all documents
  clear(): void {
    this.documents.clear();
  }
}

