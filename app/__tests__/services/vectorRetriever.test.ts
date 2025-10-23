/**
 * Vector Retriever Tests
 * 
 * Tests vector store abstraction with MockRetriever
 * No Firebase dependencies - runs fast in CI
 * 
 * Run with: cd app && npm test -- vectorRetriever
 */

import { MockVectorRetriever } from '../../src/services/vector/mockRetriever';
import type { VectorDocument } from '../../src/types/aiTypes';
import { Timestamp } from 'firebase/firestore';

describe('VectorRetriever Interface', () => {
  describe('MockVectorRetriever', () => {
    let retriever: MockVectorRetriever;

    beforeEach(() => {
      retriever = new MockVectorRetriever();
    });

    it('should initialize with empty store', async () => {
      const results = await retriever.search({ query: 'test' });
      expect(results).toEqual([]);
    });

    it('should upsert documents', async () => {
      const docs: VectorDocument[] = [
        {
          id: 'msg1',
          content: 'Math homework due Friday',
          embedding: new Array(1536).fill(0.1),
          metadata: {
            conversationId: 'conv1',
            senderId: 'user1',
            timestamp: Timestamp.now(),
          },
        },
      ];

      const result = await retriever.upsert(docs);
      expect(result.count).toBe(1);

      const all = retriever.getAllDocuments();
      expect(all.length).toBe(1);
      expect(all[0].content).toBe('Math homework due Friday');
    });

    it('should search documents with simple matching', async () => {
      const docs: VectorDocument[] = [
        {
          id: 'msg1',
          content: 'Math homework due Friday',
          embedding: [],
          metadata: { conversationId: 'conv1', senderId: 'user1', timestamp: Timestamp.now() },
        },
        {
          id: 'msg2',
          content: 'Physics test tomorrow',
          embedding: [],
          metadata: { conversationId: 'conv1', senderId: 'user2', timestamp: Timestamp.now() },
        },
        {
          id: 'msg3',
          content: 'Math quiz next week',
          embedding: [],
          metadata: { conversationId: 'conv2', senderId: 'user1', timestamp: Timestamp.now() },
        },
      ];

      await retriever.upsert(docs);

      const results = await retriever.search({ query: 'math' });
      
      expect(results.length).toBe(2);
      expect(results[0].content).toContain('Math');
    });

    it('should filter by conversationId', async () => {
      const docs: VectorDocument[] = [
        {
          id: 'msg1',
          content: 'Test 1',
          embedding: [],
          metadata: { conversationId: 'conv1', senderId: 'user1', timestamp: Timestamp.now() },
        },
        {
          id: 'msg2',
          content: 'Test 2',
          embedding: [],
          metadata: { conversationId: 'conv2', senderId: 'user1', timestamp: Timestamp.now() },
        },
      ];

      await retriever.upsert(docs);

      const results = await retriever.search({ query: 'test', conversationId: 'conv1' });
      
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('msg1');
    });

    it('should limit results to topK', async () => {
      const docs: VectorDocument[] = Array.from({ length: 30 }, (_, i) => ({
        id: `msg${i}`,
        content: `Test message ${i}`,
        embedding: [],
        metadata: { conversationId: 'conv1', senderId: 'user1', timestamp: Timestamp.now() },
      }));

      await retriever.upsert(docs);

      const results = await retriever.search({ query: 'test', topK: 10 });
      
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should filter by score threshold', async () => {
      const docs: VectorDocument[] = [
        {
          id: 'msg1',
          content: 'Math homework',
          embedding: [],
          metadata: { conversationId: 'conv1', senderId: 'user1', timestamp: Timestamp.now() },
        },
        {
          id: 'msg2',
          content: 'Unrelated message',
          embedding: [],
          metadata: { conversationId: 'conv1', senderId: 'user1', timestamp: Timestamp.now() },
        },
      ];

      await retriever.upsert(docs);

      const results = await retriever.search({ query: 'math', scoreThreshold: 0.8 });
      
      // High threshold should filter out low matches
      expect(results.every(r => r.score >= 0.8)).toBe(true);
    });

    it('should delete documents', async () => {
      const docs: VectorDocument[] = [
        {
          id: 'msg1',
          content: 'Test 1',
          embedding: [],
          metadata: { conversationId: 'conv1', senderId: 'user1', timestamp: Timestamp.now() },
        },
        {
          id: 'msg2',
          content: 'Test 2',
          embedding: [],
          metadata: { conversationId: 'conv1', senderId: 'user1', timestamp: Timestamp.now() },
        },
      ];

      await retriever.upsert(docs);
      
      const deleteResult = await retriever.delete(['msg1']);
      expect(deleteResult.count).toBe(1);

      const all = retriever.getAllDocuments();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe('msg2');
    });

    it('should pass health check', async () => {
      const healthy = await retriever.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should return correct name', () => {
      expect(retriever.getName()).toBe('MockVectorRetriever');
    });
  });

  describe('Retriever Abstraction', () => {
    it('should allow env-based retriever swap', () => {
      // Test VECTOR_STORE environment variable
      const originalEnv = process.env.VECTOR_STORE;

      // Set to mock
      process.env.VECTOR_STORE = 'mock';
      const { getVectorRetriever } = require('../../src/services/ai/ragService');
      const mockRetriever = getVectorRetriever();
      expect(mockRetriever.getName()).toContain('Mock');

      // Restore
      process.env.VECTOR_STORE = originalEnv;
    });
  });
});

