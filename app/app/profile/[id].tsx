import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types/index';
import { disconnectTutorParent, blockUser, areUsersConnected, isUserBlocked } from '@/services/connectionService';
import { getOrCreateDirectConversation } from '@/services/conversationService';
import OnlineIndicator from '@/components/OnlineIndicator';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const userId = id || '';
  const isOwnProfile = currentUser?.uid === userId;

  useEffect(() => {
    navigation.setOptions({
      title: 'Profile',
      headerBackTitle: 'Back',
    });
  }, [navigation]);

  useEffect(() => {
    fetchUserProfile();
    checkConnectionStatus();
    findConversation();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setProfileUser({ uid: userDoc.id, ...userDoc.data() } as User);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    if (!currentUser?.uid || isOwnProfile) return;
    
    try {
      const [connected, blocked] = await Promise.all([
        areUsersConnected(currentUser.uid, userId),
        isUserBlocked(currentUser.uid, userId),
      ]);
      setIsConnected(connected);
      setIsBlocked(blocked);
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const findConversation = async () => {
    if (!currentUser?.uid || isOwnProfile) return;
    
    try {
      // Find conversation between current user and profile user
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', currentUser.uid),
        where('type', '==', 'direct')
      );
      
      const snapshot = await getDocs(q);
      const conv = snapshot.docs.find((doc) => {
        const data = doc.data();
        return data.participants.includes(userId) && !data.archived;
      });
      
      if (conv) {
        setConversationId(conv.id);
      }
    } catch (error) {
      console.error('Error finding conversation:', error);
    }
  };

  const handleRemoveConnection = async () => {
    if (!currentUser?.uid || !profileUser) return;

    const connectionLabel = profileUser.role === 'tutor' ? 'Tutor' : 'Parent';

    Alert.alert(
      `Remove ${connectionLabel}`,
      `Are you sure you want to remove ${profileUser.displayName}? You can reconnect later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await disconnectTutorParent(currentUser.uid, userId, conversationId || undefined);
              setIsConnected(false);
              Alert.alert('Success', `${profileUser.displayName} has been removed.`);
              router.back();
            } catch (error: any) {
              console.error('Error removing connection:', error);
              Alert.alert('Error', error.message || 'Failed to remove connection');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = async () => {
    if (!currentUser?.uid || !profileUser) return;

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${profileUser.displayName}? This will remove your connection and prevent future communication.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await blockUser(currentUser.uid, userId, conversationId || undefined);
              setIsBlocked(true);
              setIsConnected(false);
              Alert.alert('Success', `${profileUser.displayName} has been blocked.`);
              router.back();
            } catch (error: any) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', error.message || 'Failed to block user');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMessage = async () => {
    if (!currentUser?.uid) return;

    setActionLoading(true);
    try {
      const conversationId = await getOrCreateDirectConversation(currentUser.uid, userId);
      // Navigate directly to chat instead of using back()
      router.push(`/chat/${conversationId}`);
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', error.message || 'Failed to start conversation');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        {profileUser.photoURL ? (
          <Image source={{ uri: profileUser.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {profileUser.displayName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        
        {/* Online Indicator */}
        <View style={styles.onlineIndicatorWrapper}>
          <OnlineIndicator userId={userId} size={20} />
        </View>
      </View>

      {/* Name Section */}
      <Text style={styles.displayName}>{profileUser.displayName}</Text>
      {profileUser.email && (
        <Text style={styles.email}>{profileUser.email}</Text>
      )}

      {/* Bio Section */}
      {profileUser.bio && (
        <View style={styles.bioSection}>
          <Text style={styles.bioLabel}>About</Text>
          <Text style={styles.bioText}>{profileUser.bio}</Text>
        </View>
      )}

      {/* Role Badge */}
      {profileUser.role && (
        <View style={styles.roleSection}>
          <Text style={styles.roleLabel}>
            {profileUser.role === 'tutor' ? '👨‍🏫 Tutor' : '👨‍👩‍👧 Parent'}
          </Text>
          {profileUser.role === 'tutor' && profileUser.subjects && profileUser.subjects.length > 0 && (
            <Text style={styles.subjectsText}>{profileUser.subjects.join(', ')}</Text>
          )}
          {profileUser.role === 'parent' && profileUser.studentContext && (
            <Text style={styles.studentText}>Parent of {profileUser.studentContext}</Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      {!isOwnProfile && (
        <View style={styles.actionsSection}>
          {isBlocked ? (
            <View style={styles.blockedNote}>
              <Text style={styles.blockedText}>This user is blocked</Text>
            </View>
          ) : isConnected ? (
            <>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={handleMessage}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.messageButtonText}>💬 Message</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeConnectionButton}
                onPress={handleRemoveConnection}
                disabled={actionLoading}
              >
                <Text style={styles.removeConnectionButtonText}>
                  Remove {profileUser?.role === 'tutor' ? 'Tutor' : 'Parent'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.blockButton}
                onPress={handleBlockUser}
                disabled={actionLoading}
              >
                <Text style={styles.blockButtonText}>Block User</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.notConnectedNote}>
              <Text style={styles.notConnectedText}>
                Not connected. {profileUser?.role === 'tutor' ? 'Use their tutor code to connect.' : 'They need to connect using your tutor code.'}
              </Text>
            </View>
          )}
        </View>
      )}

      {isOwnProfile && (
        <View style={styles.ownProfileNote}>
          <Text style={styles.ownProfileText}>This is your profile</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  onlineIndicatorWrapper: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  displayName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  bioSection: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    marginVertical: 20,
    borderRadius: 12,
    marginHorizontal: 20,
  },
  bioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  roleSection: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  subjectsText: {
    fontSize: 14,
    color: '#666',
  },
  studentText: {
    fontSize: 14,
    color: '#666',
  },
  actionsSection: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  messageButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  removeConnectionButton: {
    backgroundColor: '#fff',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF3B30',
    marginBottom: 10,
  },
  removeConnectionButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  blockButton: {
    backgroundColor: '#fff',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#999',
    marginBottom: 10,
  },
  blockButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  blockedNote: {
    width: '100%',
    padding: 20,
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
  },
  blockedText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    fontWeight: '500',
  },
  notConnectedNote: {
    width: '100%',
    padding: 20,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  notConnectedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  ownProfileNote: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  ownProfileText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

