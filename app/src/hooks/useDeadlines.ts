import { useState, useEffect } from 'react';
import { Deadline } from '@/components/DeadlineList';
import dayjs from 'dayjs';

/**
 * Hook to fetch deadlines for the current user
 * Currently returns mock data and manages local state
 * Will be replaced with real Firestore queries when backend is set up
 * 
 * @param userId - Current user's ID
 * @returns Deadlines array, loading state, and actions
 */
export function useDeadlines(userId: string | null) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // BEGIN MOCK_DEADLINES
    // TODO: Replace this entire block with Firestore onSnapshot listener
    // See JellyDMTasklist.md PR11.2 for replacement code
    const loadDeadlines = async () => {
      setLoading(true);

      // Simulate async data fetch
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate mock deadlines
      const mockDeadlines: Deadline[] = [
        {
          id: 'deadline-1',
          title: 'Math Chapter 5 Homework',
          dueDate: dayjs().subtract(2, 'day').toDate(), // Overdue
          assignee: 'user-1',
          assigneeName: 'Sarah Johnson',
          conversationId: 'conv-1',
          completed: false,
          createdAt: dayjs().subtract(5, 'day').toDate(),
        },
        {
          id: 'deadline-2',
          title: 'Physics Lab Report',
          dueDate: dayjs().add(0, 'day').hour(17).minute(0).toDate(), // Today
          assignee: 'user-2',
          assigneeName: 'Michael Chen',
          conversationId: 'conv-2',
          completed: false,
          createdAt: dayjs().subtract(3, 'day').toDate(),
        },
        {
          id: 'deadline-3',
          title: 'Chemistry Quiz Prep',
          dueDate: dayjs().add(2, 'day').hour(14).minute(0).toDate(), // Upcoming
          assignee: 'user-1',
          assigneeName: 'Sarah Johnson',
          conversationId: 'conv-1',
          completed: false,
          createdAt: dayjs().subtract(1, 'day').toDate(),
        },
        {
          id: 'deadline-4',
          title: 'English Essay Draft',
          dueDate: dayjs().add(5, 'day').hour(23).minute(59).toDate(), // Upcoming
          assignee: 'user-3',
          assigneeName: 'Emily Davis',
          conversationId: 'conv-3',
          completed: false,
          createdAt: dayjs().subtract(2, 'day').toDate(),
        },
        {
          id: 'deadline-5',
          title: 'History Reading Assignment',
          dueDate: dayjs().subtract(5, 'day').toDate(), // Overdue
          assignee: 'user-4',
          assigneeName: 'John Smith',
          conversationId: 'conv-4',
          completed: true, // Completed despite being overdue
          createdAt: dayjs().subtract(10, 'day').toDate(),
        },
        {
          id: 'deadline-6',
          title: 'SAT Practice Test',
          dueDate: dayjs().add(7, 'day').hour(10).minute(0).toDate(), // Upcoming
          assignee: 'user-5',
          assigneeName: 'Anna Williams',
          conversationId: 'conv-5',
          completed: false,
          createdAt: dayjs().subtract(1, 'day').toDate(),
        },
        {
          id: 'deadline-7',
          title: 'Biology Chapter Review',
          dueDate: dayjs().subtract(1, 'day').toDate(), // Overdue
          assignee: 'user-1',
          assigneeName: 'Sarah Johnson',
          conversationId: 'conv-1',
          completed: true, // Completed
          createdAt: dayjs().subtract(4, 'day').toDate(),
        },
        {
          id: 'deadline-8',
          title: 'Spanish Vocab Flashcards',
          dueDate: dayjs().add(3, 'day').hour(16).minute(0).toDate(), // Upcoming
          assignee: 'user-6',
          assigneeName: 'David Lee',
          conversationId: 'conv-6',
          completed: false,
          createdAt: dayjs().subtract(2, 'day').toDate(),
        },
      ];

      setDeadlines(mockDeadlines);
      setLoading(false);
    };

    if (userId) {
      loadDeadlines();
    } else {
      setDeadlines([]);
      setLoading(false);
    }
    // END MOCK_DEADLINES
  }, [userId]);

  // BEGIN MOCK_ACTIONS
  // TODO: Replace these with taskService calls to Firestore
  // See JellyDMTasklist.md PR11.3 for replacement code
  // Add a new deadline (mock - adds to local state)
  const addDeadline = (deadline: Omit<Deadline, 'id' | 'createdAt' | 'completed'>) => {
    const newDeadline: Deadline = {
      ...deadline,
      id: `deadline-${Date.now()}`,
      completed: false,
      createdAt: new Date(),
    };

    setDeadlines((prev) => [...prev, newDeadline]);
  };

  // Mark deadline as complete/incomplete
  const toggleComplete = (deadlineId: string) => {
    setDeadlines((prev) =>
      prev.map((d) =>
        d.id === deadlineId ? { ...d, completed: !d.completed } : d
      )
    );
  };

  // Delete a deadline
  const deleteDeadline = (deadlineId: string) => {
    setDeadlines((prev) => prev.filter((d) => d.id !== deadlineId));
  };
  // END MOCK_ACTIONS

  return {
    deadlines,
    loading,
    addDeadline,
    toggleComplete,
    deleteDeadline,
  };
}

