import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView, Alert } from 'react-native';
import dayjs from 'dayjs';
import { Event } from './EventListItem';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import RSVPButtons from './RSVPButtons';

interface EventDetailsSheetProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
}

interface ParticipantInfo {
  id: string;
  name: string;
}

export default function EventDetailsSheet({ visible, event, onClose }: EventDetailsSheetProps) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [userRsvp, setUserRsvp] = useState<'accepted' | 'declined' | null>(null);
  const currentUserId = auth.currentUser?.uid;

  // Fetch participant names when event changes
  useEffect(() => {
    if (!event || !event.participants) return;

    const fetchParticipants = async () => {
      setLoadingParticipants(true);
      try {
        const participantInfos: ParticipantInfo[] = [];
        
        for (const participantId of event.participants) {
          const userDoc = await getDoc(doc(db, 'users', participantId));
          if (userDoc.exists()) {
            participantInfos.push({
              id: participantId,
              name: userDoc.data().displayName || 'Unknown User',
            });
          } else {
            participantInfos.push({
              id: participantId,
              name: 'Unknown User',
            });
          }
        }
        
        setParticipants(participantInfos);
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchParticipants();
  }, [event?.id, event?.participants]);

  // Fetch user's RSVP status from the event
  useEffect(() => {
    if (!event || !currentUserId) return;

    const fetchUserRsvp = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', event.id));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          const rsvps = eventData?.rsvps || {};
          if (rsvps[currentUserId]) {
            setUserRsvp(rsvps[currentUserId].response === 'accept' ? 'accepted' : 'declined');
          } else {
            setUserRsvp(null);
          }
        }
      } catch (error) {
        console.error('Error fetching RSVP status:', error);
      }
    };

    fetchUserRsvp();
  }, [event?.id, currentUserId]);

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

  // Handle participant profile navigation
  const handleParticipantPress = (participantId: string) => {
    router.push(`/profile/${participantId}`);
    onClose();
  };

  // Handle RSVP Accept
  const handleRsvpAccept = async () => {
    if (!currentUserId) return;
    
    try {
      const eventRef = doc(db, 'events', event.id);
      
      // Update RSVP
      await updateDoc(eventRef, {
        [`rsvps.${currentUserId}`]: {
          response: 'accept',
          respondedAt: new Date(),
        },
        updatedAt: new Date(),
      });

      // Calculate new status
      const eventDoc = await getDoc(eventRef);
      const eventData = eventDoc.data();
      const rsvps = eventData?.rsvps || {};
      const allParticipants = eventData?.participants || [];

      // If all participants accepted, status = confirmed
      const allAccepted = allParticipants.every((pid: string) => rsvps[pid]?.response === 'accept');
      const newStatus = allAccepted ? 'confirmed' : 'pending';

      // Update event status
      await updateDoc(eventRef, {
        status: newStatus,
      });
      
      setUserRsvp('accepted');
      Alert.alert('Confirmed', 'You have accepted this event');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Handle RSVP Decline
  const handleRsvpDecline = async () => {
    if (!currentUserId) return;
    
    try {
      const eventRef = doc(db, 'events', event.id);
      
      // Update RSVP
      await updateDoc(eventRef, {
        [`rsvps.${currentUserId}`]: {
          response: 'decline',
          respondedAt: new Date(),
        },
        status: 'declined', // Immediately set status to declined
        updatedAt: new Date(),
      });
      
      setUserRsvp('declined');

      // Send notification message to conversation
      if (event.conversationId) {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const currentUser = auth.currentUser;
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        const userName = userDoc.data()?.displayName || 'Someone';

        await addDoc(collection(db, 'conversations', event.conversationId, 'messages'), {
          senderId: 'assistant',
          senderName: 'JellyDM Assistant',
          type: 'text',
          text: `📅 ${userName} has declined "${event.title}". The event status has been updated.`,
          meta: {
            role: 'system',
            eventId: event.id,
          },
          clientTimestamp: serverTimestamp(),
          serverTimestamp: serverTimestamp(),
          status: 'sent',
          retryCount: 0,
          readBy: [],
          readCount: 0,
        });
      }
      
      Alert.alert('Declined', 'You have declined this event. Other participants have been notified.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // BEGIN MOCK_EVENT_ACTIONS
  // TODO: Replace these with real backend calls
  // See JellyDMTasklist.md PR6.3 for replacement code
  const handleMessageGroup = () => {
    // Wire to real navigation
    if (event.conversationId) {
      router.push(`/chat/${event.conversationId}`);
      onClose();
    } else {
      Alert.alert('No Conversation', 'This event is not linked to a conversation yet');
    }
  };

  const handleReschedule = async () => {
    // TODO: Wire when rescheduleEvent CF is deployed
    Alert.alert('Reschedule', 'Reschedule functionality coming soon with AI');
    onClose();
    
    /* REAL IMPLEMENTATION:
    const { rescheduleEvent } = await import('@/services/ai/aiOrchestratorService');
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = await rescheduleEvent(event.id, timezone);
    
    if (result.success && result.alternatives) {
      // Show alternatives in modal or navigate to selection screen
      onClose();
    }
    */
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this session?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try {
            const { deleteEvent } = await import('@/services/schedule/eventService');
            await deleteEvent(event.id);
            Alert.alert('Cancelled', 'Session cancelled successfully');
            onClose();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
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
              {loadingParticipants ? (
                <Text style={styles.value}>Loading participants...</Text>
              ) : participants.length > 0 ? (
                participants.map((participant) => (
                  <TouchableOpacity
                    key={participant.id}
                    style={styles.participantItem}
                    onPress={() => handleParticipantPress(participant.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantAvatarText}>
                        {participant.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.participantName}>{participant.name}</Text>
                    <Text style={styles.viewProfile}>View →</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.value}>{event.participants.length} participants</Text>
              )}
            </View>

            {/* RSVP Section - Only show for pending events */}
            {event.status === 'pending' && (
              <View style={styles.section}>
                <Text style={styles.label}>Your Response</Text>
                <RSVPButtons
                  onAccept={handleRsvpAccept}
                  onDecline={handleRsvpDecline}
                  userResponse={userRsvp}
                  disabled={false}
                />
              </View>
            )}

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
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    marginBottom: 8,
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
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  viewProfile: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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

