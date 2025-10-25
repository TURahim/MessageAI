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

  console.log('✅ Deadline created:', deadlineRef.id);
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
    
    try {
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
      
      console.log('📨 Sent completion notification to conversation');
    } catch (error) {
      console.error('❌ Failed to send completion notification:', error);
      // Don't throw - task is still marked done
    }
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

