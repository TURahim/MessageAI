import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import ConversationListItem from '@/components/ConversationListItem';

export default function ChatsScreen() {
  const { user } = useAuth();
  const { conversations, loading } = useConversations(user?.uid);
  const [showNewChatMenu, setShowNewChatMenu] = useState(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No conversations yet</Text>
        <Text style={styles.subText}>
          Welcome, {user?.displayName}! Start a new conversation to get started.
        </Text>
        
        <TouchableOpacity 
          style={styles.newChatButton}
          onPress={() => router.push('/users')}
        >
          <Text style={styles.newChatButtonText}>+ New Conversation</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={({ item }) => (
          <ConversationListItem 
            conversation={item} 
            currentUserId={user?.uid || ''} 
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
      
      {/* FAB with menu */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowNewChatMenu(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* New Chat Menu Modal */}
      <Modal
        visible={showNewChatMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewChatMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNewChatMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowNewChatMenu(false);
                router.push('/users');
              }}
            >
              <Text style={styles.menuIcon}>💬</Text>
              <Text style={styles.menuText}>New Chat</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowNewChatMenu(false);
                router.push('/newGroup');
              }}
            >
              <Text style={styles.menuIcon}>👥</Text>
              <Text style={styles.menuText}>New Group</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  newChatButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingBottom: 90,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
});


