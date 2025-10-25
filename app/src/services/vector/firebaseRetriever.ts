/**
 * Firebase Vector Search Retriever
 * 
 * Uses Firestore Vector Search extension for similarity search
 * Requires: Firebase Extensions - Firestore Vector Search installed
 * 
 * Setup:
 * 1. Install extension from Firebase Console
 * 2. Configure collection: 'vector_messages'
 * 3. Set embedding field: 'embedding'
 * 4. Set dimensions: 1536 (OpenAI text-embedding-3-small)
 * 
 * Usage:
 * ```typescript
 * const retriever = new FirebaseVectorRetriever(db);
 * const results = await retriever.search({
 *   query: 'math homework',
 *   conversationId: 'conv123',
 *   topK: 10
 * });
 * ```
 */

import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import type {
  VectorRetriever,
  VectorDocument,
  SearchOptions,
  SearchResult,
} from '../../types/aiTypes';
import { db } from '../../lib/firebase';

export class FirebaseVectorRetriever implements VectorRetriever {
  private collectionName = 'vector_messages';

  async upsert(documents: VectorDocument[]): Promise<{ count: number }> {
    const batch = writeBatch(db);

    documents.forEach(document => {
      const docRef = doc(db, this.collectionName, document.id);
      batch.set(docRef, {
        content: document.content,
        embedding: document.embedding,
        metadata: document.metadata,
        updatedAt: new Date(),
      });
    });

    await batch.commit();

    return { count: documents.length };
  }

  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query: searchQuery, conversationId, topK = 20, scoreThreshold = 0.7 } = options;

    try {
      // Fetch messages from the conversation, ordered by recency
      // This is a basic implementation until Firebase Vector Search extension is active
      let q = query(
        collection(db, this.collectionName),
        where('conversationId', '==', conversationId)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('📚 No vectors found for conversation');
        return [];
      }

      // Simple text matching as fallback (until vector search extension is enabled)
      // In production, this would be replaced with cosine similarity search
      const searchLower = searchQuery.toLowerCase();
      const results: SearchResult[] = snapshot.docs
        .map(doc => {
          const data = doc.data();
          const content = data.textSnippet || '';
          const contentLower = content.toLowerCase();
          
          // Simple relevance score based on keyword matching
          const words = searchLower.split(' ').filter((w: string) => w.length > 2);
          const matchCount = words.filter((word: string) => contentLower.includes(word)).length;
          const score = words.length > 0 ? matchCount / words.length : 0;
          
          return {
            id: doc.id,
            content: content,
            score: score,
            metadata: data.metadata || {
              conversationId: data.conversationId,
              senderId: data.senderId,
              timestamp: data.timestamp,
            },
          };
        })
        .filter(r => r.score >= scoreThreshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      console.log(`📚 Retrieved ${results.length} documents (keyword match fallback)`);
      
      return results;
    } catch (error) {
      console.error('Firebase vector search failed:', error);
      return [];
    }
  }

  async delete(ids: string[]): Promise<{ count: number }> {
    const batch = writeBatch(db);

    ids.forEach(id => {
      const docRef = doc(db, this.collectionName, id);
      batch.delete(docRef);
    });

    await batch.commit();

    return { count: ids.length };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try to read a single document to verify connection
      const testQuery = query(collection(db, this.collectionName));
      await getDocs(testQuery);
      return true;
    } catch (error) {
      console.error('Firebase Vector Retriever health check failed:', error);
      throw new Error(`Firebase Vector Retriever unhealthy: ${error}`);
    }
  }

  getName(): string {
    return 'FirebaseVectorRetriever';
  }
}

