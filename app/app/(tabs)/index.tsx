import React, { useState, useEffect } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useFriends } from '@/hooks/useFriends';
import { useUserPresence } from '@/hooks/useUserPresence';
import { getOrCreateDirectConversation } from '@/services/conversationService';
import ConversationListItem from '@/components/ConversationListItem';
import EmptyState from '@/components/EmptyState';
import OnlineIndicator from '@/components/OnlineIndicator';
import { SkeletonConversationList } from '@/components/SkeletonLoader';
import { User, Conversation } from '@/types/index';

type SectionData = 
  | { title: string; data: User[]; type: 'friends' }
  | { title: string; data: Conversation[]; type: 'conversations' };

export default function ChatsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { conversations, loading: conversationsLoading } = useConversations(user?.uid);
  const { friends, loading: friendsLoading } = useFriends(user?.uid);
  const [messageLoading, setMessageLoading] = useState<string | null>(null);

  const loading = conversationsLoading || friendsLoading;

  // Set up header with "New Group" button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push('/newGroup')}
          style={{ marginRight: 15 }}
        >
          <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>
            New Group
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleMessageFriend = async (friend: User) => {
    if (!user?.uid) return;

    setMessageLoading(friend.uid);
    try {
      const conversationId = await getOrCreateDirectConversation(user.uid, friend.uid);
      router.push(`/chat/${conversationId}`);
    } catch (error: any) {
      console.error('Error starting conversation:', error);
    } finally {
      setMessageLoading(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonConversationList count={8} />
      </View>
    );
  }

  // Empty state: no friends yet
  if (friends.length === 0 && conversations.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="👋"
          title="No friends yet"
          subtitle={`Welcome, ${user?.displayName || 'there'}! Add friends to start messaging.`}
          actionLabel="Find Friends"
          onAction={() => router.push('/users')}
        />
        <View style={styles.emptyStateFooter}>
          <Text style={styles.orText}>or</Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/newGroup')}
          >
            <Text style={styles.secondaryButtonText}>Create a Group</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Prepare sections for SectionList
  const sections: SectionData[] = [];

  if (friends.length > 0) {
    sections.push({
      title: `Friends (${friends.length})`,
      data: friends,
      type: 'friends' as const,
    });
  }

  if (conversations.length > 0) {
    sections.push({
      title: 'Recent Conversations',
      data: conversations,
      type: 'conversations' as const,
    });
  }

  const FriendItem = ({ item }: { item: User }) => {
    const { status, displayText } = useUserPresence(item.uid);
    
    return (
      <View style={styles.friendItem}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.friendAvatar} />
        ) : (
          <View style={styles.friendAvatarPlaceholder}>
            <Text style={styles.friendAvatarText}>
              {item.displayName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.displayName}</Text>
          <View style={styles.friendOnlineContainer}>
            <OnlineIndicator userId={item.uid} size={10} />
            <Text style={[styles.friendOnlineText, status === 'online' && styles.friendOnlineTextActive]}>
              {displayText}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => handleMessageFriend(item)}
          disabled={messageLoading === item.uid}
        >
          {messageLoading === item.uid ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.messageButtonText}>Message</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderFriendItem = ({ item }: { item: User }) => <FriendItem item={item} />;

  const renderConversationItem = ({ item }: { item: any }) => (
    <ConversationListItem 
      conversation={item} 
      currentUserId={user?.uid || ''} 
    />
  );

  const renderItem = ({ item, section }: any) => {
    if (section.type === 'friends') {
      return renderFriendItem({ item });
    }
    return renderConversationItem({ item });
  };

  const renderSectionHeader = ({ section }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections as any}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item: any, index: number) => 
          item.uid ? item.uid : item.id
        }
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
            ListFooterComponent={
              conversations.length > 0 ? (
                <View style={styles.footerHint}>
                  <Text style={styles.footerHintText}>💡 Long press a conversation to delete it</Text>
                  <Text style={[styles.footerHintText, { marginTop: 5 }]}>
                    Tap + for friends • Tap "New Group" for groups
                  </Text>
                </View>
              ) : null
            }
      />
      
      {/* Simplified FAB - goes directly to Find Friends */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/users')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  friendOnlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendOnlineText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 13,
    paddingTop: 1,
  },
  friendOnlineTextActive: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  messageButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },
  footerHint: {
    padding: 20,
    alignItems: 'center',
  },
  footerHintText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyStateFooter: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  orText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 15,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});


