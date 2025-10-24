/**
 * Event Type Definitions for Firestore
 * 
 * Aligns with shipped Event interface from EventListItem.tsx
 * Uses startTime/endTime (not dateTime + duration) to match UI
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Event document in Firestore /events collection
 * 
 * Schema aligns with EventMeta from shipped UI
 */
export interface EventDocument {
  id: string;
  title: string;
  startTime: Timestamp; // Matches EventMeta and Event interface
  endTime: Timestamp; // Matches EventMeta and Event interface
  participants: string[]; // User IDs (array-contains queries)
  participantNames?: string[]; // Cached for display
  status: 'pending' | 'confirmed' | 'declined';
  conversationId?: string; // Optional link to conversation
  createdBy: string; // User ID who created
  location?: string; // Optional location
  rsvps?: {
    [userId: string]: {
      response: 'accepted' | 'declined';
      respondedAt: Timestamp;
    };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Input for creating an event
 */
export interface CreateEventInput {
  title: string;
  startTime: Date;
  endTime: Date;
  participants: string[];
  participantNames?: string[];
  conversationId?: string;
  createdBy: string;
  location?: string;
}

/**
 * Input for updating an event
 */
export interface UpdateEventInput {
  title?: string;
  startTime?: Date;
  endTime?: Date;
  participants?: string[];
  status?: 'pending' | 'confirmed' | 'declined';
  location?: string;
}

/**
 * Conflict detection result
 */
export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingEvents: Array<{
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
  }>;
}

