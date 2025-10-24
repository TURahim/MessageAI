import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { Message } from '@/types/index';
import ImageMessage from './ImageMessage';
import AssistantBubble from './AssistantBubble';
import EventCard from './EventCard';
import DeadlineCard from './DeadlineCard';
import ConflictWarning from './ConflictWarning';
import RSVPButtons from './RSVPButtons';
import LoadingCard from './LoadingCard';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dayjs from 'dayjs';

interface Props {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  conversationType?: 'direct' | 'group';
  totalParticipants?: number;
  onRetry?: (messageId: string) => void;
}

export default function MessageBubble({ 
  message, 
  isOwn, 
  showSenderName = false, 
  conversationType = 'direct',
  totalParticipants = 2,
  onRetry 
}: Props) {
  const [senderName, setSenderName] = useState<string>('');
  const sendingOpacity = useRef(new Animated.Value(1)).current;

  // Fetch sender's display name for group chats
  useEffect(() => {
    if (showSenderName && !isOwn && conversationType === 'group') {
      const fetchSenderName = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', message.senderId));
          if (userDoc.exists()) {
            setSenderName(userDoc.data().displayName || 'Unknown User');
          } else {
            setSenderName('Unknown User');
          }
        } catch (error) {
          console.error('Error fetching sender name:', error);
          setSenderName('Unknown User');
        }
      };

      fetchSenderName();
    }
  }, [message.senderId, showSenderName, isOwn, conversationType]);

  // Pulse animation for "Sending..." status
  useEffect(() => {
    if (message.status === 'sending') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(sendingOpacity, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(sendingOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      sendingOpacity.setValue(1);
    }
  }, [message.status, sendingOpacity]);

  const getTimestamp = () => {
    const timestamp = message.serverTimestamp || message.clientTimestamp;
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return dayjs(date).format('h:mm A');
  };

  const getStatusDisplay = () => {
    if (!isOwn) return null;

    // Failed status
    if (message.status === 'failed') {
      return {
        text: 'Failed',
        color: '#FF3B30',
        icon: null,
      };
    }

    // Sending status
    if (message.status === 'sending') {
      return {
        text: 'Sending...',
        color: 'rgba(255, 255, 255, 0.7)',
        icon: null,
      };
    }

    // Read receipts
    const readCount = message.readBy?.length || 0;
    
    if (conversationType === 'direct') {
      // For direct chats: ✓ sent, ✓✓ read
      const isRead = readCount > 1;
      return {
        text: null,
        color: isRead ? '#4CD964' : 'rgba(255, 255, 255, 0.7)',
        icon: isRead ? '✓✓' : '✓',
      };
    } else if (conversationType === 'group') {
      // For groups: show checkmark with read count
      const othersReadCount = readCount - 1; // Exclude sender
      if (othersReadCount > 0) {
        return {
          text: null,
          color: '#4CD964',
          icon: `✓ ${othersReadCount}`,
        };
      }
      return {
        text: null,
        color: 'rgba(255, 255, 255, 0.7)',
        icon: '✓',
      };
    }

    return {
      text: null,
      color: 'rgba(255, 255, 255, 0.7)',
      icon: '✓',
    };
  };

  // Determine if this is an assistant/system message
  const isAssistantMessage = message.senderId === 'assistant' || message.meta?.role === 'assistant' || message.meta?.role === 'system';

  // Determine if this is an image message
  const isImageMessage = message.type === 'image' && message.media;

  // BEGIN MOCK_CARD_HANDLERS
  // TODO: Replace these with real backend calls
  // See JellyDMTasklist.md PR6.4, PR6.5 for replacement code
  // Handle inline card actions (mock for now)
  const handleEventPress = () => {
    // MOCK: handleEventPress - Navigate to Schedule tab or open event details
    if (message.meta?.event?.eventId) {
      // Option 1: Navigate to Schedule tab (simple)
      const { router } = require('expo-router');
      router.push('/schedule'); // Could add ?eventId= param later
      
      // Option 2: Open EventDetailsSheet (would need state management)
      // For now, just navigate to Schedule tab
    } else {
      Alert.alert('Event Details', 'Event details will open here once AI orchestrator is connected.');
    }
  };

  const handleDeadlinePress = () => {
    // Navigate to Tasks tab to see deadline
    if (message.meta?.deadline?.deadlineId) {
      const { router } = require('expo-router');
      router.push('/tasks');
    } else {
      Alert.alert('Deadline Details', 'Deadline details will open here once AI orchestrator is connected.');
    }
  };

  const handleMarkDone = () => {
    // TODO: Wire to taskService when implemented (PR11)
    Alert.alert('Mark Done', 'Deadline marked as done (mock action)');
  };

  // BEGIN MOCK_RSVP_HANDLERS
  const handleRSVPAccept = async () => {
    if (!message.meta?.rsvp?.eventId) return;
    
    try {
      const { recordRSVP } = await import('@/services/schedule/eventService');
      const { auth } = await import('@/lib/firebase');
      const currentUserId = auth.currentUser?.uid || '';
      
      await recordRSVP(message.meta.rsvp.eventId, currentUserId, 'accepted');
      Alert.alert('RSVP', 'You accepted the invite!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRSVPDecline = async () => {
    if (!message.meta?.rsvp?.eventId) return;
    
    try {
      const { recordRSVP } = await import('@/services/schedule/eventService');
      const { auth } = await import('@/lib/firebase');
      const currentUserId = auth.currentUser?.uid || '';
      
      await recordRSVP(message.meta.rsvp.eventId, currentUserId, 'declined');
      Alert.alert('RSVP', 'You declined the invite.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };
  // END MOCK_RSVP_HANDLERS

  const handleConflictSelect = async (index: number) => {
    // MOCK: handleConflictSelect - Wire to conflictService (PR10)
    Alert.alert('Alternative Selected', `You selected alternative #${index + 1}\n\nThis will be wired to create a new event with the selected time in PR10.`);
    
    /* REAL IMPLEMENTATION (PR10):
    if (!message.meta?.conflict?.suggestedAlternatives) return;
    
    const alternative = message.meta.conflict.suggestedAlternatives[index];
    if (!alternative) return;
    
    try {
      const { selectAlternative } = await import('@/services/schedule/conflictService');
      const { auth } = await import('@/lib/firebase');
      
      const newEventId = await selectAlternative(
        message.meta.conflict.conflictId,
        index,
        'original-event-id', // Would come from conflict meta
        auth.currentUser?.uid || ''
      );
      
      Alert.alert('Rescheduled', `Event rescheduled to ${alternative.startTime}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
    */
  };
  // END MOCK_CARD_HANDLERS

  // Render AI loading card
  if (message.meta?.type === 'ai_loading') {
    return <LoadingCard />;
  }

  // Render assistant message with inline cards
  if (isAssistantMessage) {
    return (
      <AssistantBubble message={message}>
        {/* Event card */}
        {message.meta?.event && (
          <EventCard event={message.meta.event} onPress={handleEventPress} />
        )}
        
        {/* RSVP buttons */}
        {message.meta?.rsvp && (
          <RSVPButtons
            onAccept={handleRSVPAccept}
            onDecline={handleRSVPDecline}
          />
        )}
        
        {/* Deadline card */}
        {message.meta?.deadline && (
          <DeadlineCard
            deadline={message.meta.deadline}
            onMarkDone={handleMarkDone}
            onPress={handleDeadlinePress}
          />
        )}
        
        {/* Conflict warning */}
        {message.meta?.conflict && (
          <ConflictWarning
            conflict={message.meta.conflict}
            onSelectAlternative={handleConflictSelect}
          />
        )}
      </AssistantBubble>
    );
  }

  // Regular user message
  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble, message.status === 'failed' && styles.failedBubble]}>
        {showSenderName && !isOwn && conversationType === 'group' && (
          <Text style={styles.senderName}>{senderName || 'Loading...'}</Text>
        )}
        
        {/* Image message */}
        {isImageMessage ? (
          <View style={styles.imageContainer}>
            <ImageMessage
              imageUrl={message.media!.url}
              width={message.media!.width}
              height={message.media!.height}
              status={message.media!.status}
            />
            {/* Caption if present */}
            {message.text && (
              <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText, styles.imageCaption]}>
                {message.text}
              </Text>
            )}
          </View>
        ) : (
          /* Text message */
          <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>
            {message.text}
          </Text>
        )}
        
        <View style={styles.footer}>
          <Text style={[styles.timestamp, isOwn ? styles.ownTimestamp : styles.otherTimestamp]}>
            {getTimestamp()}
          </Text>
          {(() => {
            const statusDisplay = getStatusDisplay();
            if (!statusDisplay) return null;
            
            const isSending = message.status === 'sending';
            
            return (
              <View style={styles.statusContainer}>
                {statusDisplay.text && (
                  <Animated.Text 
                    style={[
                      styles.statusText, 
                      { color: statusDisplay.color },
                      isSending && { opacity: sendingOpacity }
                    ]}
                  >
                    {statusDisplay.text}
                  </Animated.Text>
                )}
                {statusDisplay.icon && (
                  <Text style={[styles.statusIcon, { color: statusDisplay.color }]}>
                    {statusDisplay.icon}
                  </Text>
                )}
              </View>
            );
          })()}
        </View>
        
        {/* Retry button for failed messages */}
        {message.status === 'failed' && isOwn && onRetry && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => onRetry(message.id)}
          >
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 4,
    fontWeight: '600',
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  timestamp: {
    fontSize: 11,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusIcon: {
    fontSize: 12,
    fontWeight: '600',
  },
  failedBubble: {
    backgroundColor: '#FF3B30',
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  imageContainer: {
    maxWidth: '100%',
  },
  imageCaption: {
    marginTop: 8,
  },
});

