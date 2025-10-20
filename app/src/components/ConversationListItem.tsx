import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Conversation, User } from '@/types/index';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Props {
  conversation: Conversation;
  currentUserId: string;
}

export default function ConversationListItem({ conversation, currentUserId }: Props) {
  const [otherUser, setOtherUser] = useState<User | null>(null);

  useEffect(() => {
    // Get other user's info for direct conversations
    if (conversation.type === 'direct') {
      const otherUserId = conversation.participants.find(uid => uid !== currentUserId);
      if (otherUserId) {
        fetchUserInfo(otherUserId);
      }
    }
  }, [conversation, currentUserId]);

  const fetchUserInfo = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setOtherUser({ uid: userDoc.id, ...userDoc.data() } as User);
      }
    } catch (error) {
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

  const isOnline = () => {
    if (conversation.type === 'group') return false;
    return otherUser?.presence?.status === 'online';
  };

  const handlePress = () => {
    router.push(`/chat/${conversation.id}`);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
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

      {/* Online Indicator */}
      {isOnline() && <View style={styles.onlineIndicator} />}
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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
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
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    marginLeft: 8,
  },
});

