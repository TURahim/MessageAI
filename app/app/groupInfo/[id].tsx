import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Conversation, User } from '@/types/index';
import OnlineIndicator from '@/components/OnlineIndicator';
import { leaveGroup } from '@/services/conversationService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { user: currentUser } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const conversationId = id;

  // Set header
  useEffect(() => {
    navigation.setOptions({
      title: 'Group Info',
      headerBackTitle: 'Back',
    });
  }, [navigation]);

  // Listen to conversation changes
  useEffect(() => {
    if (!conversationId) return;

    const conversationRef = doc(db, 'conversations', conversationId);
    const unsubscribe = onSnapshot(
      conversationRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const conv = { id: snapshot.id, ...snapshot.data() } as Conversation;
          setConversation(conv);

          // Fetch all members
          const memberPromises = conv.participants.map(async (uid) => {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              return { uid: userDoc.id, ...userDoc.data() } as User;
            }
            return null;
          });

          const fetchedMembers = (await Promise.all(memberPromises)).filter(
            (m): m is User => m !== null
          );
          setMembers(fetchedMembers);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching group info:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId]);

  // Real-time presence updates for each member
  useEffect(() => {
    if (members.length === 0) return;

    const unsubscribes = members.map((member) => {
      const userRef = doc(db, 'users', member.uid);
      return onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          setMembers((prev) =>
            prev.map((m) =>
              m.uid === member.uid
                ? { ...m, presence: userData.presence }
                : m
            )
          );
        }
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [members.length]);

  const handleViewProfile = (member: User) => {
    router.push(`/profile/${member.uid}`);
  };

  const handleAddMember = () => {
    // Navigate to user picker screen (to be implemented)
    Alert.alert(
      'Add Member',
      'This feature will allow you to add members to the group.',
      [{ text: 'OK' }]
    );
    // TODO: Implement add member functionality
  };

  const handleLeaveGroup = () => {
    if (!currentUser?.uid || !conversationId) return;

    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${conversation?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await leaveGroup(conversationId, currentUser.uid);
              Alert.alert('Left Group', 'You have left the group.', [
                {
                  text: 'OK',
                  onPress: () => {
                    router.back(); // Go back to group info
                    setTimeout(() => {
                      router.back(); // Go back to main chat list
                    }, 100);
                  },
                },
              ]);
            } catch (error: any) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', error.message || 'Failed to leave group');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderMember = ({ item }: { item: User }) => {
    const isCurrentUser = item.uid === currentUser?.uid;
    const isOnline = item.presence?.status === 'online';
    const lastSeen = item.presence?.lastSeen
      ? dayjs(item.presence.lastSeen.toDate()).fromNow()
      : 'Unknown';

    return (
      <TouchableOpacity
        style={[styles.memberItem, isDark && styles.memberItemDark]}
        onPress={() => handleViewProfile(item)}
        activeOpacity={0.7}
      >
        <View style={styles.memberLeft}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.memberAvatar} />
          ) : (
            <View style={[styles.memberAvatarPlaceholder, isDark && styles.memberAvatarPlaceholderDark]}>
              <Text style={styles.memberAvatarText}>
                {item.displayName?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}

          <View style={styles.memberInfo}>
            <View style={styles.memberNameRow}>
              <Text style={[styles.memberName, isDark && styles.memberNameDark]}>
                {item.displayName}
                {isCurrentUser && ' (You)'}
              </Text>
              <OnlineIndicator userId={item.uid} size={10} />
            </View>
            <Text style={[styles.memberStatus, isDark && styles.memberStatusDark]}>
              {isOnline ? 'Online' : `Last seen ${lastSeen}`}
            </Text>
          </View>
        </View>

        <Text style={styles.viewProfileText}>View →</Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, isDark && styles.headerDark]}>
      {/* Group Avatar */}
      <View style={[styles.groupAvatarContainer, isDark && styles.groupAvatarContainerDark]}>
        <Text style={styles.groupAvatarText}>
          {conversation?.name?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>

      {/* Group Name */}
      <Text style={[styles.groupName, isDark && styles.groupNameDark]}>
        {conversation?.name || 'Group'}
      </Text>

      {/* Member Count */}
      <Text style={[styles.memberCount, isDark && styles.memberCountDark]}>
        {members.length} {members.length === 1 ? 'member' : 'members'}
      </Text>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, isDark && styles.actionButtonDark]}
          onPress={handleAddMember}
        >
          <Text style={styles.actionButtonText}>+ Add Member</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.leaveButton, isDark && styles.leaveButtonDark]}
          onPress={handleLeaveGroup}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.actionButtonText, styles.leaveButtonText]}>
              Leave Group
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Members Section Header */}
      <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>
        MEMBERS
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Loading group info...
        </Text>
      </View>
    );
  }

  if (!conversation || conversation.type !== 'group') {
    return (
      <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
        <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
          Group not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.uid}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingContainerDark: {
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingTextDark: {
    color: '#999',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  errorTextDark: {
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerDark: {
    backgroundColor: '#1c1c1e',
    borderBottomColor: '#333',
  },
  groupAvatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  groupAvatarContainerDark: {
    backgroundColor: '#0A84FF',
  },
  groupAvatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  groupNameDark: {
    color: '#fff',
  },
  memberCount: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
  },
  memberCountDark: {
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  actionButtonDark: {
    backgroundColor: '#0A84FF',
  },
  leaveButton: {
    backgroundColor: '#FF3B30',
  },
  leaveButtonDark: {
    backgroundColor: '#FF453A',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  leaveButtonText: {
    color: '#fff',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    alignSelf: 'stretch',
    marginTop: 10,
  },
  sectionHeaderDark: {
    color: '#999',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberItemDark: {
    backgroundColor: '#1c1c1e',
    borderBottomColor: '#333',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarPlaceholderDark: {
    backgroundColor: '#0A84FF',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  memberNameDark: {
    color: '#fff',
  },
  memberStatus: {
    fontSize: 13,
    color: '#666',
  },
  memberStatusDark: {
    color: '#999',
  },
  viewProfileText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});

