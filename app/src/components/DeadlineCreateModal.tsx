import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import dayjs from 'dayjs';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';

interface DeadlineCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (deadline: {
    title: string;
    dueDate: Date;
    assigneeId?: string;
    assigneeName?: string;
  }) => void;
}

export default function DeadlineCreateModal({
  visible,
  onClose,
  onCreate,
}: DeadlineCreateModalProps) {
  const { user } = useAuth();
  const { friends } = useFriends(user?.uid || undefined);

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | undefined>();

  const handleClose = () => {
    // Reset form
    setTitle('');
    setDueDate(new Date());
    setSelectedAssigneeId(undefined);
    onClose();
  };

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a task title');
      return;
    }

    const selectedFriend = friends.find((f) => f.uid === selectedAssigneeId);
    
    onCreate({
      title: title.trim(),
      dueDate,
      assigneeId: selectedAssigneeId,
      assigneeName: selectedFriend?.displayName,
    });

    handleClose();
  };

  // Simplified date/time selection (tap to show alert for now)
  const handleDatePress = () => {
    Alert.alert(
      'Set Date',
      'Date/time picker will be implemented with @react-native-community/datetimepicker in production.\n\nFor now, using default: tomorrow at 5pm',
      [{ text: 'OK' }]
    );
    // Set to tomorrow at 5pm as default
    setDueDate(dayjs().add(1, 'day').hour(17).minute(0).toDate());
  };

  const handleTimePress = () => {
    Alert.alert(
      'Set Time',
      'Date/time picker will be implemented with @react-native-community/datetimepicker in production.\n\nFor now, using default: 5pm',
      [{ text: 'OK' }]
    );
    // Set to 5pm
    setDueDate(dayjs(dueDate).hour(17).minute(0).toDate());
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Task</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Title input */}
            <View style={styles.section}>
              <Text style={styles.label}>Task Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Complete math homework"
                placeholderTextColor="#999"
                autoFocus
              />
            </View>

            {/* Due date */}
            <View style={styles.section}>
              <Text style={styles.label}>Due Date & Time *</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={handleDatePress}
                >
                  <Text style={styles.dateTimeIcon}>📅</Text>
                  <Text style={styles.dateTimeText}>{dayjs(dueDate).format('MMM D, YYYY')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={handleTimePress}
                >
                  <Text style={styles.dateTimeIcon}>🕐</Text>
                  <Text style={styles.dateTimeText}>{dayjs(dueDate).format('h:mm A')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Assignee selector */}
            <View style={styles.section}>
              <Text style={styles.label}>Assign To (Optional)</Text>
              <View style={styles.assigneeList}>
                {/* Self option */}
                <TouchableOpacity
                  style={[
                    styles.assigneeItem,
                    selectedAssigneeId === user?.uid && styles.assigneeItemSelected,
                  ]}
                  onPress={() => setSelectedAssigneeId(user?.uid)}
                >
                  <View style={styles.assigneeAvatar}>
                    <Text style={styles.assigneeAvatarText}>
                      {user?.displayName?.charAt(0).toUpperCase() || 'Y'}
                    </Text>
                  </View>
                  <Text style={styles.assigneeName}>Yourself</Text>
                  {selectedAssigneeId === user?.uid && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>

                {/* Friends */}
                {friends.map((friend) => (
                  <TouchableOpacity
                    key={friend.uid}
                    style={[
                      styles.assigneeItem,
                      selectedAssigneeId === friend.uid && styles.assigneeItemSelected,
                    ]}
                    onPress={() => setSelectedAssigneeId(friend.uid)}
                  >
                    <View style={styles.assigneeAvatar}>
                      <Text style={styles.assigneeAvatarText}>
                        {friend.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.assigneeName}>{friend.displayName}</Text>
                    {selectedAssigneeId === friend.uid && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}

                {friends.length === 0 && (
                  <Text style={styles.noFriendsText}>
                    No friends yet. Add friends to assign tasks to them.
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreate}
              activeOpacity={0.7}
            >
              <Text style={styles.createButtonText}>Create Task</Text>
            </TouchableOpacity>
          </View>
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
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 34,
    paddingHorizontal: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateTimeIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  dateTimeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  assigneeList: {
    gap: 10,
  },
  assigneeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  assigneeItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  assigneeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assigneeAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  assigneeName: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
  },
  noFriendsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

