import { Timestamp } from "firebase/firestore";

// Message types
export type MessageStatus = "sending" | "sent" | "failed";
export type MessageType = "text" | "image";

// AI/Assistant metadata types
export interface EventMeta {
  eventId: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  participants: string[];
  status?: 'pending' | 'confirmed' | 'declined';
}

export interface DeadlineMeta {
  deadlineId: string;
  title: string;
  dueDate: Timestamp;
  assignee?: string;
  completed?: boolean;
}

export interface RSVPMeta {
  eventId: string;
  responses?: { [userId: string]: 'accepted' | 'declined' };
}

export interface ConflictMeta {
  conflictId: string;
  message: string;
  suggestedAlternatives?: Array<{
    startTime: Timestamp;
    endTime: Timestamp;
    reason?: string;
  }>;
}

export interface MessageMeta {
  role?: 'assistant' | 'system' | 'user';
  eventId?: string;
  event?: EventMeta;
  deadlineId?: string;
  deadline?: DeadlineMeta;
  rsvp?: RSVPMeta;
  conflict?: ConflictMeta;
}

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
  meta?: MessageMeta; // AI/Assistant metadata
  senderName?: string; // Cached sender name for display
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
  email?: string;
  photoURL: string | null;
  bio?: string; // Short user description/status
  friends: string[]; // Array of friend UIDs
  pushToken?: string; // Expo push token for remote notifications
  pushTokenUpdatedAt?: Timestamp; // When push token was last updated
  timezone?: string; // IANA timezone (e.g., "America/Toronto")
  locale?: string; // Optional for i18n
  presence: UserPresence;
  createdAt?: Timestamp;
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

