import { Timestamp } from "firebase/firestore";

// Message types
export type MessageStatus = "sending" | "sent" | "failed";
export type MessageType = "text" | "image";

export interface Message {
  id: string; // Client-generated UUID (idempotency key)
  conversationId: string;
  senderId: string;
  type: MessageType;
  text: string;
  media?: {
    status: "uploading" | "ready" | "failed";
    url: string;
    width: number;
    height: number;
  };
  clientTimestamp: Timestamp; // Optimistic ordering
  serverTimestamp: Timestamp | null; // Authoritative
  status: MessageStatus;
  retryCount: number;
  readBy: string[]; // For read receipts
  readCount: number; // Aggregate for groups
}

// User types
export type PresenceStatus = "online" | "offline";

export interface UserPresence {
  status: PresenceStatus;
  lastSeen: Timestamp;
  activeConversationId: string | null;
}

export interface User {
  uid: string;
  displayName: string;
  photoURL: string | null;
  presence: UserPresence;
}

// Conversation types
export type ConversationType = "direct" | "group";

export interface LastMessage {
  text: string;
  senderId: string;
  timestamp: Timestamp;
  type: MessageType;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: string[]; // Max 20 for MVP
  lastMessage: LastMessage | null;
  name?: string; // Groups only
  typing?: { [userId: string]: Timestamp }; // Typing indicators
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

