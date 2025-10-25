import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useDeadlines } from '@/hooks/useDeadlines';
import DeadlineList, { Deadline } from '@/components/DeadlineList';
import DeadlineCreateModal from '@/components/DeadlineCreateModal';
import FAB from '@/components/FAB';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function TasksScreen() {
  const { user } = useAuth();
  const { deadlines, loading, addDeadline, toggleComplete } = useDeadlines(user?.uid || null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateDeadline = (deadline: {
    title: string;
    dueDate: Date;
    assigneeId?: string;
    assigneeName?: string;
  }) => {
    addDeadline({
      title: deadline.title,
      dueDate: deadline.dueDate,
      assignee: deadline.assigneeId,
      assigneeName: deadline.assigneeName,
    });
  };

  const handleMarkComplete = (deadlineId: string) => {
    toggleComplete(deadlineId, user?.displayName || 'Student');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Loading tasks..." size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Deadline list with sections */}
      <DeadlineList
        deadlines={deadlines}
        onMarkComplete={handleMarkComplete}
      />

      {/* Create deadline modal */}
      <DeadlineCreateModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateDeadline}
      />

      {/* Floating action button */}
      <FAB
        onPress={() => setShowCreateModal(true)}
        icon="+"
        label="Add Task"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

