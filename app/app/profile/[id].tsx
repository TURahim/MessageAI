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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types/index';
import { addFriend, removeFriend, isFriend } from '@/services/friendService';
import { getOrCreateDirectConversation } from '@/services/conversationService';
import OnlineIndicator from '@/components/OnlineIndicator';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFriendStatus, setIsFriendStatus] = useState(false);
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
    checkFriendStatus();
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

  const checkFriendStatus = async () => {
    if (!currentUser?.uid || isOwnProfile) return;
    
    try {
      const status = await isFriend(currentUser.uid, userId);
      setIsFriendStatus(status);
    } catch (error) {
      console.error('Error checking friend status:', error);
    }
  };

  const handleAddFriend = async () => {
    if (!currentUser?.uid) return;

    setActionLoading(true);
    try {
      await addFriend(currentUser.uid, userId);
      setIsFriendStatus(true);
      // Close profile screen, then close suggested contacts screen
      router.back(); // Close profile
      setTimeout(() => {
        router.back(); // Close suggested contacts → back to main chat screen
      }, 100);
    } catch (error: any) {
      console.error('Error adding friend:', error);
      Alert.alert('Error', error.message || 'Failed to add friend');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!currentUser?.uid) return;

    Alert.alert(
      'Remove Friend',
      `Remove ${profileUser?.displayName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await removeFriend(currentUser.uid, userId);
              setIsFriendStatus(false);
              // Close profile screen, then close suggested contacts screen
              router.back(); // Close profile
              setTimeout(() => {
                router.back(); // Close suggested contacts → back to main chat screen
              }, 100);
            } catch (error: any) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', error.message || 'Failed to remove friend');
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
      // Close profile screen, then close suggested contacts screen
      router.back(); // Close profile
      setTimeout(() => {
        router.back(); // Close suggested contacts → back to main chat screen
        // Then open the chat
        setTimeout(() => {
          router.push(`/chat/${conversationId}`);
        }, 100);
      }, 100);
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

      {/* Action Buttons */}
      {!isOwnProfile && (
        <View style={styles.actionsSection}>
          {isFriendStatus ? (
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
                style={styles.removeFriendButton}
                onPress={handleRemoveFriend}
                disabled={actionLoading}
              >
                <Text style={styles.removeFriendButtonText}>Remove Friend</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.addFriendButton}
              onPress={handleAddFriend}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addFriendButtonText}>👋 Add Friend</Text>
              )}
            </TouchableOpacity>
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
  actionsSection: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  addFriendButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  addFriendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
  removeFriendButton: {
    backgroundColor: '#fff',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  removeFriendButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
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

