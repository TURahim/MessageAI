import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types/message';

const MESSAGES_PER_PAGE = 50;

interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loadingMore: boolean;
}

/**
 * Hook for paginated message loading
 * - Loads most recent 50 messages initially
 * - Can load older messages with loadMore()
 * - Maintains scroll position when prepending
 */
export function useMessages(conversationId: string, currentUserId: string): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  // Initial load - subscribe to most recent messages
  useEffect(() => {
    console.log(`👂 Subscribing to messages (paginated) for: ${conversationId.substring(0, 12)}`);

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(
      messagesRef,
      orderBy('serverTimestamp', 'desc'),
      limit(MESSAGES_PER_PAGE)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;
        
        console.log(`📥 Received ${snapshot.docs.length} messages (initial/realtime)`, {
          fromCache,
          source: fromCache ? '💾 CACHE' : '☁️ SERVER',
        });

        const parsedMessages: Message[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            conversationId,
            senderId: data.senderId,
            senderName: data.senderName, // Include for assistant messages
            type: data.type || 'text',
            text: data.text || '',
            media: data.media || undefined,
            clientTimestamp: data.clientTimestamp,
            serverTimestamp: data.serverTimestamp || null,
            status: data.status || 'sent',
            retryCount: data.retryCount || 0,
            readBy: data.readBy || [],
            readCount: data.readCount || 0,
            meta: data.meta, // Include AI metadata
          } as Message;
        });

        // Set lastVisible for pagination
        if (snapshot.docs.length > 0) {
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
          setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
        } else {
          setHasMore(false);
        }

        setMessages(parsedMessages);
        setLoading(false);
      },
      (error) => {
        console.error('Error subscribing to messages:', error);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [conversationId]);

  // Load more older messages
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastVisible) {
      console.log('⏭️ Skipping loadMore:', { loadingMore, hasMore, hasLastVisible: !!lastVisible });
      return;
    }

    setLoadingMore(true);
    console.log('📜 Loading more messages...');

    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(
        messagesRef,
        orderBy('serverTimestamp', 'desc'),
        startAfter(lastVisible),
        limit(MESSAGES_PER_PAGE)
      );

      // One-time fetch for older messages (not a listener)
      const snapshot = await new Promise<QueryDocumentSnapshot<DocumentData>[]>((resolve, reject) => {
        const unsubscribe = onSnapshot(
          q,
          (snap) => {
            unsubscribe(); // Immediately unsubscribe
            resolve(snap.docs);
          },
          reject
        );
      });

      console.log(`📥 Loaded ${snapshot.length} older messages`);

      if (snapshot.length > 0) {
        const olderMessages: Message[] = snapshot.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            conversationId,
            senderId: data.senderId,
            senderName: data.senderName, // Include for assistant messages
            type: data.type || 'text',
            text: data.text || '',
            media: data.media || undefined,
            clientTimestamp: data.clientTimestamp,
            serverTimestamp: data.serverTimestamp || null,
            status: data.status || 'sent',
            retryCount: data.retryCount || 0,
            readBy: data.readBy || [],
            readCount: data.readCount || 0,
            meta: data.meta, // Include AI metadata
          } as Message;
        });

        // Prepend older messages
        setMessages((prev) => [...prev, ...olderMessages]);

        // Update lastVisible for next pagination
        setLastVisible(snapshot[snapshot.length - 1]);
        setHasMore(snapshot.length === MESSAGES_PER_PAGE);
      } else {
        console.log('📭 No more messages to load');
        setHasMore(false);
      }
    } catch (error) {
      console.error('❌ Failed to load more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, lastVisible, loadingMore, hasMore]);

  return {
    messages,
    loading,
    hasMore,
    loadMore,
    loadingMore,
  };
}

