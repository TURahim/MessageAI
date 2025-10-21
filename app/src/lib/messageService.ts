import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  QuerySnapshot,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { Message, MessageStatus } from "../types/message";

/**
 * Sends a message to Firestore with optimistic local state
 */
export async function sendMessage(
  conversationId: string,
  message: Omit<Message, "serverTimestamp">
): Promise<void> {
  console.log(`📤 Sending message ${message.id.substring(0, 8)}...`, {
    conversationId: conversationId.substring(0, 12),
    text: message.text.substring(0, 30),
  });

  try {
    const messageRef = doc(
      db,
      "conversations",
      conversationId,
      "messages",
      message.id
    );

    const timestamp = serverTimestamp();

    await setDoc(messageRef, {
      ...message,
      serverTimestamp: timestamp,
      status: "sent",
    });

    console.log(`✅ Message ${message.id.substring(0, 8)} sent to Firestore`);

    // Update conversation's lastMessage
    const conversationRef = doc(db, "conversations", conversationId);
    await updateDoc(conversationRef, {
      lastMessage: {
        text: message.text,
        senderId: message.senderId,
        timestamp: timestamp,
        type: message.type,
      },
      updatedAt: timestamp,
    });

    console.log(`✅ Updated lastMessage for conversation ${conversationId.substring(0, 12)}`);
  } catch (error: any) {
    console.error(`❌ Error sending message:`, error.code || error.message);
    
    // Log if this is an offline error that will be queued
    if (error.code === 'unavailable') {
      console.log('📦 Message queued for offline - will send when online');
    }
    
    throw error;
  }
}

/**
 * Sends a message with retry logic
 * CRITICAL: Stops retrying if server ack is detected
 */
export async function sendMessageWithRetry(
  conversationId: string,
  message: Omit<Message, "serverTimestamp">,
  maxRetries: number = 3
): Promise<{ success: boolean; retryCount: number; isOffline: boolean }> {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Check if message already exists with server timestamp (stop retrying)
      const messageRef = doc(db, "conversations", conversationId, "messages", message.id);
      const docSnap = await getDoc(messageRef);
      
      if (docSnap.exists() && docSnap.data().serverTimestamp) {
        console.log(`✅ Message ${message.id.substring(0, 8)} already sent (server ack), stopping retry`);
        return { success: true, retryCount, isOffline: false };
      }

      // Attempt to send
      await sendMessage(conversationId, message);
      console.log(`✅ Message sent successfully on attempt ${retryCount + 1}`);
      return { success: true, retryCount, isOffline: false };
    } catch (error: any) {
      retryCount++;
      const errorCode = error.code || '';
      const errorMessage = error.message || '';

      // Check if this is an offline error
      const isOfflineError = 
        errorCode === 'unavailable' || 
        errorCode === 'failed-precondition' ||
        errorMessage.includes('client is offline') ||
        errorMessage.includes('Failed to get document');

      if (isOfflineError) {
        console.log(`📦 Offline detected on attempt ${retryCount} - message will be queued`);
        
        // If offline, don't continue retrying - let Firestore queue it
        return { success: false, retryCount, isOffline: true };
      }

      // For other errors, log and continue retrying
      console.warn(`⚠️ Send attempt ${retryCount} failed:`, errorMessage);

      if (retryCount >= maxRetries) {
        console.error(`❌ Max retries (${maxRetries}) reached for message ${message.id.substring(0, 8)}`);
        return { success: false, retryCount, isOffline: false };
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.pow(2, retryCount - 1) * 1000;
      console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  return { success: false, retryCount, isOffline: false };
}

/**
 * Updates the status of a message (e.g., sent -> failed)
 */
export async function updateMessageStatus(
  conversationId: string,
  messageId: string,
  newStatus: MessageStatus
): Promise<void> {
  try {
    const messageRef = doc(
      db,
      "conversations",
      conversationId,
      "messages",
      messageId
    );

    await updateDoc(messageRef, {
      status: newStatus,
    });
  } catch (error) {
    console.warn("Error updating message status:", error);
    throw error;
  }
}

/**
 * Marks messages as read by the current user
 */
export async function markMessagesAsRead(
  conversationId: string,
  messageIds: string[]
): Promise<void> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;

    const promises = messageIds.map((messageId) => {
      const messageRef = doc(
        db,
        "conversations",
        conversationId,
        "messages",
        messageId
      );
      return updateDoc(messageRef, {
        readBy: [currentUserId], // In production, use arrayUnion
        readCount: 1,
      });
    });

    await Promise.all(promises);
  } catch (error) {
    console.warn("Error marking messages as read:", error);
  }
}

/**
 * Subscribes to real-time updates for messages in a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onMessagesUpdate: (messages: Message[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  console.log(`👂 Subscribing to messages for conversation ${conversationId.substring(0, 12)}`);

  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  const q = query(messagesRef, orderBy("serverTimestamp", "desc"));

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const fromCache = snapshot.metadata.fromCache;
      const hasPendingWrites = snapshot.metadata.hasPendingWrites;
      
      console.log(`📥 Received ${snapshot.docs.length} messages`, {
        fromCache,
        hasPendingWrites,
        source: fromCache ? '💾 CACHE' : '☁️ SERVER',
      });

      const messages: Message[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          conversationId,
          senderId: data.senderId,
          type: data.type || "text",
          text: data.text || "",
          clientTimestamp: data.clientTimestamp,
          serverTimestamp: data.serverTimestamp || null,
          status: data.status || "sent",
          retryCount: data.retryCount || 0,
          readBy: data.readBy || [],
          readCount: data.readCount || 0,
        } as Message;
      });

      onMessagesUpdate(messages);
    },
    (error) => {
      console.warn("Error in message subscription:", error);
      if (onError) onError(error as Error);
    }
  );
}

