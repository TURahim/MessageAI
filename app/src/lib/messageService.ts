import {
  collection,
  doc,
  setDoc,
  updateDoc,
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
  } catch (error) {
    console.warn("Error sending message:", error);
    throw error;
  }
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

