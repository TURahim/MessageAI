/**
 * Task Service
 * 
 * PR11: Wire Tasks Backend
 * 
 * CRUD operations for deadlines/tasks
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DeadlineDocument {
  id: string;
  title: string;
  dueDate: Timestamp;
  assignee: string; // User ID
  assigneeName?: string; // Cached for display
  conversationId?: string; // Optional link to conversation
  completed: boolean;
  type: 'homework' | 'topic'; // homework=for parent, topic=for tutor
  creatorRole: 'tutor' | 'parent' | 'system'; // Who created the task
  createdBy: string; // User ID who created
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateDeadlineInput {
  title: string;
  dueDate: Date;
  assignee: string;
  assigneeName?: string;
  conversationId?: string;
  createdBy: string;
  type?: 'homework' | 'topic'; // Default to 'homework' if not specified
  creatorRole?: 'tutor' | 'parent' | 'system'; // Default to 'system' if not specified
}

/**
 * Create a new deadline
 */
export async function addDeadline(input: CreateDeadlineInput): Promise<string> {
  // Build data object, omitting undefined fields
  const deadlineData: any = {
    title: input.title,
    dueDate: Timestamp.fromDate(input.dueDate),
    assignee: input.assignee,
    completed: false,
    type: input.type || 'homework', // Default to homework
    creatorRole: input.creatorRole || 'system', // Default to system
    createdBy: input.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Only include optional fields if defined
  if (input.assigneeName !== undefined) {
    deadlineData.assigneeName = input.assigneeName;
  }
  if (input.conversationId !== undefined) {
    deadlineData.conversationId = input.conversationId;
  }

  const deadlineRef = await addDoc(collection(db, 'deadlines'), deadlineData);

  console.log('✅ Deadline created:', deadlineRef.id, `(type: ${deadlineData.type})`);
  return deadlineRef.id;
}

/**
 * Toggle deadline completion status
 * Sends notification to conversation when marked as done
 */
export async function toggleComplete(deadlineId: string, userId?: string, userName?: string): Promise<void> {
  const deadlineRef = doc(db, 'deadlines', deadlineId);
  const deadlineSnap = await getDoc(deadlineRef);

  if (!deadlineSnap.exists()) {
    throw new Error('DEADLINE_NOT_FOUND');
  }

  const deadlineData = deadlineSnap.data();
  const currentCompleted = deadlineData.completed || false;
  const newCompleted = !currentCompleted;

  await updateDoc(deadlineRef, {
    completed: newCompleted,
    completedAt: newCompleted ? Timestamp.now() : null,
    completedBy: newCompleted ? userId : null,
    updatedAt: Timestamp.now(),
  });

  console.log('✅ Deadline toggled:', { deadlineId, completed: newCompleted });

  // Send notification when marked as DONE (not when unmarked)
  if (newCompleted && deadlineData.conversationId) {
    const completedByName = userName || 'Someone';
    
    console.log('📨 Attempting to send completion notification:', {
      conversationId: deadlineData.conversationId,
      deadlineTitle: deadlineData.title,
      completedBy: userId,
      hasConversationId: !!deadlineData.conversationId,
    });
    
    try {
      // First verify the conversation exists and user is participant
      const conversationRef = doc(db, 'conversations', deadlineData.conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        console.warn('⚠️ Conversation not found, skipping notification');
        return;
      }
      
      const conversationData = conversationSnap.data();
      const isParticipant = userId && conversationData.participants?.includes(userId);
      
      console.log('🔍 Conversation check:', {
        exists: conversationSnap.exists(),
        participants: conversationData.participants,
        isUserParticipant: isParticipant,
        userId,
      });
      
      if (!isParticipant) {
        console.warn('⚠️ User not in conversation participants, skipping notification');
        return;
      }
      
      await addDoc(collection(db, 'conversations', deadlineData.conversationId, 'messages'), {
        senderId: 'assistant',
        senderName: 'JellyDM Assistant',
        type: 'text',
        text: `✅ ${completedByName} completed "${deadlineData.title}"`,
        meta: {
          role: 'system',
          deadlineId: deadlineId,
        },
        clientTimestamp: Timestamp.now(),
        serverTimestamp: Timestamp.now(),
        status: 'sent',
        retryCount: 0,
        readBy: [],
        readCount: 0,
      });
      
      console.log('✅ Completion notification sent successfully');
    } catch (error: any) {
      console.error('❌ Failed to send completion notification:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        conversationId: deadlineData.conversationId,
      });
      // Don't throw - task is still marked done
    }
  } else if (newCompleted && !deadlineData.conversationId) {
    console.log('ℹ️ No conversationId on deadline, skipping notification');
  }
}

/**
 * Delete a deadline
 */
export async function deleteDeadline(deadlineId: string): Promise<void> {
  const deadlineRef = doc(db, 'deadlines', deadlineId);
  await deleteDoc(deadlineRef);
  console.log('✅ Deadline deleted:', deadlineId);
}

/**
 * Update deadline
 */
export async function updateDeadline(
  deadlineId: string,
  updates: {
    title?: string;
    dueDate?: Date;
    assignee?: string;
    assigneeName?: string;
  }
): Promise<void> {
  const deadlineRef = doc(db, 'deadlines', deadlineId);

  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  if (updates.dueDate) {
    updateData.dueDate = Timestamp.fromDate(updates.dueDate);
  }

  await updateDoc(deadlineRef, updateData);
  console.log('✅ Deadline updated:', deadlineId);
}

/**
 * Get a single deadline by ID
 */
export async function getDeadline(deadlineId: string): Promise<DeadlineDocument | null> {
  const deadlineRef = doc(db, 'deadlines', deadlineId);
  const deadlineSnap = await getDoc(deadlineRef);

  if (!deadlineSnap.exists()) {
    return null;
  }

  return {
    id: deadlineSnap.id,
    ...deadlineSnap.data(),
  } as DeadlineDocument;
}

