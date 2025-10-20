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
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { Message, MessageState } from "../types/message";

/**
 * Sends a message to Firestore with optimistic local state
 */
export async function sendMessage(
  conversationId: string,
  message: Omit<Message, "serverTs">
): Promise<void> {
  try {
    const messageRef = doc(
      db,
      "conversations",
      conversationId,
      "messages",
      message.mid
    );

    await setDoc(messageRef, {
      ...message,
      serverTs: serverTimestamp(),
      state: "sent",
    });
  } catch (error) {
    console.warn("Error sending message:", error);
    throw error;
  }
}

/**
 * Updates the state of a message (e.g., sent -> delivered -> read)
 */
export async function updateMessageState(
  conversationId: string,
  messageId: string,
  newState: MessageState
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
      state: newState,
    });
  } catch (error) {
    console.warn("Error updating message state:", error);
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

    const promises = messageIds.map((mid) => {
      const messageRef = doc(
        db,
        "conversations",
        conversationId,
        "messages",
        mid
      );
      return updateDoc(messageRef, {
        state: "read",
        readBy: [currentUserId], // In production, use arrayUnion
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

  const q = query(messagesRef, orderBy("serverTs", "desc"));

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const messages: Message[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          mid: doc.id,
          senderId: data.senderId,
          text: data.text,
          clientTs: data.clientTs,
          serverTs: data.serverTs,
          state: data.state || "sent",
          readBy: data.readBy || [],
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

