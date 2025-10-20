import { Timestamp } from "firebase/firestore";

export type MessageState = "sending" | "sent" | "delivered" | "read";

export interface Message {
  mid: string; // client-generated ID
  senderId: string;
  text: string;
  clientTs: number; // Date.now()
  serverTs?: Timestamp; // set by Firestore
  state: MessageState;
  readBy?: string[];
}

