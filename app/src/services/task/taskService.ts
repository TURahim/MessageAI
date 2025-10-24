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
 */
export async function toggleComplete(deadlineId: string): Promise<void> {
  const deadlineRef = doc(db, 'deadlines', deadlineId);
  const deadlineSnap = await getDoc(deadlineRef);

  if (!deadlineSnap.exists()) {
    throw new Error('DEADLINE_NOT_FOUND');
  }

  const currentCompleted = deadlineSnap.data().completed || false;

  await updateDoc(deadlineRef, {
    completed: !currentCompleted,
    updatedAt: Timestamp.now(),
  });

  console.log('✅ Deadline toggled:', { deadlineId, completed: !currentCompleted });
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

