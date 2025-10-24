import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Conversation, User } from '@/types/index';
import OnlineIndicator from './OnlineIndicator';
import { deleteConversation } from '@/services/conversationService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Props {
  conversation: Conversation;
  currentUserId: string;
}

export default function ConversationListItem({ conversation, currentUserId }: Props) {
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const navigationInProgress = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Get other user's info for direct conversations
    if (conversation.type === 'direct') {
      const otherUserId = conversation.participants.find(uid => uid !== currentUserId);
      if (otherUserId) {
        fetchUserInfo(otherUserId);
      }
    }
  }, [conversation, currentUserId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const fetchUserInfo = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setOtherUser({ uid: userDoc.id, ...userDoc.data() } as User);
      }
    } catch (error: any) {
      // Silently ignore permission errors (happens after sign out)
      if (error.message?.includes('Missing or insufficient permissions')) {
        return;
      }
      console.error('Error fetching user info:', error);
    }
  };

  const getDisplayName = () => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }
    return otherUser?.displayName || 'Unknown User';
  };

  const getLastMessagePreview = () => {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }

    const text = conversation.lastMessage.text;
    const maxLength = 50;
    
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    
    return text;
  };

  const getTimestamp = () => {
    if (!conversation.lastMessage?.timestamp) {
      return '';
    }

    const timestamp = conversation.lastMessage.timestamp.toDate();
    return dayjs(timestamp).fromNow();
  };

  const handlePress = () => {
    // Guard against double-tap / rapid taps
    if (navigationInProgress.current) {
      console.log('⚠️ Navigation already in progress, ignoring tap');
      return;
    }

    navigationInProgress.current = true;
    router.push(`/chat/${conversation.id}`);

    // Reset flag after navigation animation completes (typical duration ~300-500ms)
    // Clear any existing timeout first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      navigationInProgress.current = false;
      timeoutRef.current = null;
    }, 1000);
  };

  const handleLongPress = () => {
    const conversationName = getDisplayName();
    
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${conversationName}"? This will permanently delete all messages.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDelete,
        },
      ]
    );
  };

  const handleDelete = async () => {
    try {
      await deleteConversation(conversation.id);
      console.log('✅ Conversation deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting conversation:', error);
      Alert.alert('Delete Failed', error.message || 'Failed to delete conversation. Please try again.');
    }
  };

  const getOtherUserId = () => {
    if (conversation.type === 'direct') {
      return conversation.participants.find(uid => uid !== currentUserId);
    }
    return null;
  };

  const otherUserId = getOtherUserId();

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      <View style={styles.avatarContainer}>
        {/* Avatar */}
        {otherUser?.photoURL ? (
          <Image source={{ uri: otherUser.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {getDisplayName().charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        {/* Online Indicator - positioned on avatar */}
        {conversation.type === 'direct' && otherUserId && (
          <View style={styles.onlineIndicatorWrapper}>
            <OnlineIndicator userId={otherUserId} size={14} />
          </View>
        )}
      </View>

      {/* Conversation Info */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {getDisplayName()}
          </Text>
          <Text style={styles.timestamp}>{getTimestamp()}</Text>
        </View>
        
        <View style={styles.messagePreview}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {getLastMessagePreview()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  onlineIndicatorWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  timestamp: {
    fontSize: 13,
    color: '#999',
    marginLeft: 8,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});


