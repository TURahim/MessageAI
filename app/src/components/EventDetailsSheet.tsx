import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView, Alert } from 'react-native';
import dayjs from 'dayjs';
import { Event } from './EventListItem';

interface EventDetailsSheetProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
}

export default function EventDetailsSheet({ visible, event, onClose }: EventDetailsSheetProps) {
  if (!event) return null;

  const formatDateTime = () => {
    const start = dayjs(event.startTime);
    const end = dayjs(event.endTime);
    
    // Same day: "Mon, Jan 15 • 3:00 PM - 4:30 PM"
    if (start.isSame(end, 'day')) {
      return `${start.format('ddd, MMM D')} • ${start.format('h:mm A')} - ${end.format('h:mm A')}`;
    }
    
    // Different days
    return `${start.format('MMM D, h:mm A')} - ${end.format('MMM D, h:mm A')}`;
  };

  const getStatusColor = () => {
    switch (event.status) {
      case 'confirmed':
        return '#4CAF50';
      case 'declined':
        return '#F44336';
      case 'pending':
        return '#FF9800';
      default:
        return '#007AFF';
    }
  };

  // BEGIN MOCK_EVENT_ACTIONS
  // TODO: Replace these with real backend calls
  // See JellyDMTasklist.md PR6.3 for replacement code
  const handleMessageGroup = () => {
    Alert.alert('Message Group', 'This will open the group chat (mock action)');
    onClose();
  };

  const handleReschedule = () => {
    Alert.alert('Reschedule', 'Reschedule functionality coming soon with AI');
    onClose();
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this session?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => {
          Alert.alert('Cancelled', 'Session cancelled (mock action)');
          onClose();
        }},
      ]
    );
  };
  // END MOCK_EVENT_ACTIONS

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Bottom sheet */}
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle bar */}
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Event icon and title */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>📅</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>{event.title}</Text>
                {event.status && (
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor() }]}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Date & Time */}
            <View style={styles.section}>
              <Text style={styles.label}>Date & Time</Text>
              <Text style={styles.value}>{formatDateTime()}</Text>
            </View>

            {/* Participants */}
            <View style={styles.section}>
              <Text style={styles.label}>Participants ({event.participants.length})</Text>
              {event.participantNames && event.participantNames.length > 0 ? (
                event.participantNames.map((name, index) => (
                  <View key={index} style={styles.participantItem}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantAvatarText}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.participantName}>{name}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.value}>{event.participants.length} participants</Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleMessageGroup}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionText}>Message Group</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleReschedule}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>🔄</Text>
                <Text style={styles.actionText}>Reschedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>❌</Text>
                <Text style={[styles.actionText, styles.cancelText]}>Cancel Session</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Close</Text>
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
    paddingBottom: 34,
    paddingHorizontal: 16,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: '#000',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  participantName: {
    fontSize: 16,
    color: '#000',
  },
  actions: {
    marginTop: 8,
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
  cancelButton: {
    backgroundColor: '#FFEBEE',
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  cancelText: {
    color: '#F44336',
  },
  closeButton: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

