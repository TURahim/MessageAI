import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Alert } from 'react-native';

interface AIQuickActionsProps {
  visible: boolean;
  onClose: () => void;
  onSuggestTime?: () => void;
  onSummarize?: () => void;
  onCreateDeadline?: () => void;
  onSetReminder?: () => void;
}

export default function AIQuickActions({
  visible,
  onClose,
  onSuggestTime,
  onSummarize,
  onCreateDeadline,
  onSetReminder,
}: AIQuickActionsProps) {
  const handleAction = (actionName: string, action?: () => void) => {
    if (action) {
      action();
    } else {
      // Default no-op with toast
      Alert.alert('Coming Soon', `${actionName} will be available once AI orchestrator is connected.`);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Bottom sheet */}
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>AI Quick Actions</Text>
            <Text style={styles.subtitle}>Let AI help with scheduling and tasks</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction('Suggest Time', onSuggestTime)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>📅</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Suggest Time</Text>
                <Text style={styles.actionDescription}>Find available times for a session</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction('Summarize', onSummarize)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>📝</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Summarize</Text>
                <Text style={styles.actionDescription}>Get a summary of recent messages</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction('Create Deadline', onCreateDeadline)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>✅</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Create Deadline</Text>
                <Text style={styles.actionDescription}>Add a task or homework deadline</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction('Set Reminder', onSetReminder)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>⏰</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Set Reminder</Text>
                <Text style={styles.actionDescription}>Create a reminder for this conversation</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 34, // Extra space for safe area
    paddingHorizontal: 16,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 10,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: '#666',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

