import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList,
  Alert,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types/index';
import UserCheckbox from '@/components/UserCheckbox';
import { createGroupConversation } from '@/services/conversationService';

export default function NewGroupScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers: User[] = [];

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        // Exclude current user
        if (doc.id !== currentUser?.uid) {
          fetchedUsers.push({
            uid: doc.id,
            displayName: userData.displayName,
            photoURL: userData.photoURL || null,
            presence: userData.presence,
          });
        }
      });

      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleCreate = async () => {
    // Trim group name
    const trimmedName = groupName.trim();
    
    if (!trimmedName) {
      Alert.alert('Group Name Required', 'Please enter a name for your group');
      return;
    }

    if (selectedUserIds.length < 2) {
      Alert.alert('More Participants Needed', 'Please select at least 2 other users (3 total including you)');
      return;
    }

    if (selectedUserIds.length > 19) {
      Alert.alert('Error', 'Maximum 20 participants allowed (including you)');
      return;
    }

    if (!currentUser?.uid) {
      Alert.alert('Error', 'You must be logged in to create a group');
      return;
    }

    try {
      setCreating(true);
      
      // Include current user in participants
      const participants = [currentUser.uid, ...selectedUserIds];
      
      console.log('👥 Creating group:', {
        name: trimmedName,
        participants: participants.length,
        creator: currentUser.uid,
      });
      
      const conversationId = await createGroupConversation(
        participants,
        trimmedName,
        currentUser.uid
      );
      
      console.log('✅ Group created with ID:', conversationId);

      Alert.alert('Success', 'Group created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
            router.push(`/chat/${conversationId}`);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating group:', error);
      Alert.alert('Error', error.message || 'Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const totalParticipants = selectedUserIds.length + 1; // +1 for current user

  return (
    <View style={styles.container}>
      {/* Group Name Input */}
      <View style={styles.header}>
        <Text style={styles.inputLabel}>Group Name *</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Enter group name..."
          maxLength={50}
          placeholderTextColor="#999"
          autoFocus
        />
        <Text style={styles.participantCount}>
          {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* User List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <UserCheckbox
            user={item}
            selected={selectedUserIds.includes(item.uid)}
            onToggle={toggleUser}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (selectedUserIds.length < 2 || !groupName.trim() || creating) && styles.createButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={selectedUserIds.length < 2 || !groupName.trim() || creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>
              Create Group ({totalParticipants})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  participantCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  footer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

