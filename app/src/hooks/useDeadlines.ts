import { useState, useEffect } from 'react';
import { Deadline } from '@/components/DeadlineList';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  addDeadline as addDeadlineService,
  toggleComplete as toggleCompleteService,
  deleteDeadline as deleteDeadlineService,
} from '@/services/task/taskService';

/**
 * Hook to fetch deadlines for the current user
 * Wired to Firestore /deadlines collection (PR11)
 * 
 * @param userId - Current user's ID
 * @returns Deadlines array, loading state, and actions
 */
export function useDeadlines(userId: string | null) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // PR11: Real-time Firestore listener (replaced mock data)
    if (!userId) {
      setDeadlines([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Query deadlines where user is assignee
    const deadlinesRef = collection(db, 'deadlines');
    const q = query(
      deadlinesRef,
      where('assignee', '==', userId),
      orderBy('dueDate', 'asc')
    );

    // Real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedDeadlines: Deadline[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            dueDate: (data.dueDate as Timestamp).toDate(),
            assignee: data.assignee,
            assigneeName: data.assigneeName,
            conversationId: data.conversationId,
            completed: data.completed || false,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          };
        });

        setDeadlines(fetchedDeadlines);
        setLoading(false);

        console.log('✅ Deadlines updated from Firestore', {
          count: fetchedDeadlines.length,
          userId: userId.substring(0, 8),
        });
      },
      (err) => {
        console.error('❌ Error fetching deadlines:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => {
      console.log('🧹 Cleaning up deadlines listener');
      unsubscribe();
    };
  }, [userId]);

  // PR11: Real actions using taskService (replaced mock actions)
  const addDeadline = async (deadline: Omit<Deadline, 'id' | 'createdAt' | 'completed'>) => {
    if (!userId) {
      console.error('❌ Cannot add deadline: No user ID');
      return;
    }

    try {
      await addDeadlineService({
        title: deadline.title,
        dueDate: deadline.dueDate,
        assignee: deadline.assignee,
        assigneeName: deadline.assigneeName,
        conversationId: deadline.conversationId,
        createdBy: userId,
      });
      // Real-time listener will update the UI
    } catch (err: any) {
      console.error('❌ Failed to add deadline:', err);
      setError(err.message);
    }
  };

  const toggleComplete = async (deadlineId: string) => {
    try {
      await toggleCompleteService(deadlineId);
      // Real-time listener will update the UI
    } catch (err: any) {
      console.error('❌ Failed to toggle deadline:', err);
      setError(err.message);
    }
  };

  const deleteDeadline = async (deadlineId: string) => {
    try {
      await deleteDeadlineService(deadlineId);
      // Real-time listener will update the UI
    } catch (err: any) {
      console.error('❌ Failed to delete deadline:', err);
      setError(err.message);
    }
  };

  return {
    deadlines,
    loading,
    error,
    addDeadline,
    toggleComplete,
    deleteDeadline,
  };
}


