/**
 * RAG Pipeline Integration Tests
 * 
 * Tests end-to-end RAG functionality with MockRetriever
 * Verifies: top-K, recency reranking, token limits, PII minimization
 * 
 * Run with: cd app && npm test -- rag-pipeline
 */

import { MockVectorRetriever } from '../../src/services/vector/mockRetriever';
import { getContext } from '../../../functions/src/rag/contextBuilder';
import type { VectorDocument } from '../../src/types/aiTypes';
import { Timestamp } from 'firebase/firestore';

describe('RAG Pipeline Integration Tests', () => {
  let retriever: MockVectorRetriever;

  beforeEach(() => {
    retriever = new MockVectorRetriever();
  });

  describe('Top-K Retrieval', () => {
    it('should return top K most relevant documents', async () => {
      const docs: VectorDocument[] = Array.from({ length: 50 }, (_, i) => ({
        id: `msg${i}`,
        content: `Test message ${i} about math homework`,
        embedding: [],
        metadata: {
          conversationId: 'conv1',
          senderId: 'user1',
          timestamp: Timestamp.now(),
        },
      }));

      await retriever.upsert(docs);

      const context = await getContext('math homework', 'conv1', retriever, { topK: 10 });

      expect(context.documents.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Recency Reranking', () => {
    it('should boost recent messages (last 7 days) by 2x', async () => {
      const now = new Date();
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const docs: VectorDocument[] = [
        {
          id: 'old',
          content: 'Math homework',
          embedding: [],
          metadata: {
            conversationId: 'conv1',
            senderId: 'user1',
            timestamp: Timestamp.fromDate(eightDaysAgo),
          },
        },
        {
          id: 'recent',
          content: 'Math homework',
          embedding: [],
          metadata: {
            conversationId: 'conv1',
            senderId: 'user1',
            timestamp: Timestamp.fromDate(twoDaysAgo),
          },
        },
      ];

      await retriever.upsert(docs);

      const context = await getContext('math', 'conv1', retriever);

      // Recent message should be boosted to top (2x score)
      expect(context.documents[0].id).toBe('recent');
    });
  });

  describe('Token Limits', () => {
    it('should limit context to 4096 tokens by default', async () => {
      // Create documents with ~500 chars each (~125 tokens)
      const longText = 'x'.repeat(500);
      const docs: VectorDocument[] = Array.from({ length: 50 }, (_, i) => ({
        id: `msg${i}`,
        content: `${longText} message ${i}`,
        embedding: [],
        metadata: {
          conversationId: 'conv1',
          senderId: 'user1',
          timestamp: Timestamp.now(),
        },
      }));

      await retriever.upsert(docs);

      const context = await getContext('message', 'conv1', retriever);

      // Should be limited to ~4096 tokens
      expect(context.totalTokens).toBeLessThanOrEqual(4200); // Small buffer for overhead
    });

    it('should respect custom token limit', async () => {
      const docs: VectorDocument[] = Array.from({ length: 20 }, (_, i) => ({
        id: `msg${i}`,
        content: `Message ${i}`,
        embedding: [],
        metadata: {
          conversationId: 'conv1',
          senderId: 'user1',
          timestamp: Timestamp.now(),
        },
      }));

      await retriever.upsert(docs);

      const context = await getContext('message', 'conv1', retriever, { maxTokens: 100 });

      expect(context.totalTokens).toBeLessThanOrEqual(100);
    });
  });

  describe('PII Minimization', () => {
    it('should replace user content with ID-prefixed format', async () => {
      const docs: VectorDocument[] = [
        {
          id: 'msg1',
          content: 'Sarah said the homework is due Friday',
          embedding: [],
          metadata: {
            conversationId: 'conv1',
            senderId: 'user_sarah_123',
            timestamp: Timestamp.now(),
          },
        },
      ];

      await retriever.upsert(docs);

      const context = await getContext('homework', 'conv1', retriever);

      // Should have user ID prefix for PII minimization
      expect(context.documents[0].content).toContain('User user_sar');
      expect(context.documents[0].content).toContain('Sarah'); // Content preserved but tagged
    });
  });

  describe('Health Check', () => {
    it('should pass health check for MockRetriever', async () => {
      const healthy = await retriever.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('Environment-Based Swap', () => {
    it('should swap to MockRetriever when VECTOR_STORE=mock', async () => {
      process.env.VECTOR_STORE = 'mock';
      
      const { getVectorRetriever } = require('../../src/services/ai/ragService');
      const retriever = getVectorRetriever();
      
      expect(retriever.getName()).toBe('MockVectorRetriever');
      
      const healthy = await retriever.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should use FirebaseVectorRetriever by default', () => {
      process.env.VECTOR_STORE = 'firebase';
      
      const { getVectorRetriever } = require('../../src/services/ai/ragService');
      const retriever = getVectorRetriever();
      
      expect(retriever.getName()).toBe('FirebaseVectorRetriever');
    });
  });

  describe('RAG Context Building', () => {
    it('should build context with metadata', async () => {
      const docs: VectorDocument[] = [
        {
          id: 'msg1',
          content: 'Math homework',
          embedding: [],
          metadata: {
            conversationId: 'conv1',
            senderId: 'user1',
            timestamp: Timestamp.now(),
          },
        },
      ];

      await retriever.upsert(docs);

      const context = await getContext('math', 'conv1', retriever);

      expect(context).toHaveProperty('documents');
      expect(context).toHaveProperty('totalTokens');
      expect(context).toHaveProperty('retrievalTime');
      expect(context).toHaveProperty('source');
      expect(context.source).toBe('MockVectorRetriever');
    });

    it('should filter empty results', async () => {
      const context = await getContext('nonexistent query', 'conv1', retriever);
      
      expect(context.documents).toEqual([]);
      expect(context.totalTokens).toBe(0);
    });
  });
});

