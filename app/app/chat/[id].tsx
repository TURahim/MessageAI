import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { newMessageId } from "@/utils/messageId";
import { Message, MessageStatus } from "@/types/message";
import {
  sendMessage,
  sendMessageWithRetry,
  subscribeToMessages,
  markMessagesAsRead,
  updateMessageStatus,
} from "@/lib/messageService";
import { auth, db } from "@/lib/firebase";
import { Timestamp, doc, getDoc, onSnapshot } from "firebase/firestore";
import { router } from "expo-router";
import MessageBubble from "@/components/MessageBubble";
import MessageInput from "@/components/MessageInput";
import ConnectionBanner from "@/components/ConnectionBanner";
import OnlineIndicator from "@/components/OnlineIndicator";
import TypingIndicator from "@/components/TypingIndicator";
import ImageUploadProgress from "@/components/ImageUploadProgress";
import LoadingSpinner from "@/components/LoadingSpinner";
import { usePresence } from "@/hooks/usePresence";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMarkAsRead } from "@/hooks/useMarkAsRead";
import { useMessages } from "@/hooks/useMessages";
import { uploadImage } from "@/services/mediaService";
import { showMessageNotification } from "@/services/notificationService";
import { Conversation } from "@/types/index";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [uploadingImages, setUploadingImages] = useState<Map<string, number>>(new Map()); // messageId -> progress
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]); // Local queue for offline messages
  
  const conversationId = id || "demo-conversation-1";
  const currentUserId = auth.currentUser?.uid || "anonymous";

  // Track presence for this active conversation
  usePresence(conversationId);

  // Track typing indicator
  const { startTyping, stopTyping } = useTypingIndicator(conversationId, currentUserId);

  // Track read receipts
  const { onViewableItemsChanged, viewabilityConfig } = useMarkAsRead(conversationId, currentUserId);

  // Load messages with pagination
  const { messages, loading, hasMore, loadMore, loadingMore } = useMessages(conversationId, currentUserId);

  // Merge Firestore messages with optimistic local messages
  const allMessages = useMemo(() => {
    // Get IDs of messages already in Firestore
    const firestoreIds = new Set(messages.map(m => m.id));
    
    // Filter out optimistic messages that are now in Firestore
    const pendingOptimistic = optimisticMessages.filter(m => !firestoreIds.has(m.id));
    
    // Merge: Firestore messages + pending optimistic messages
    const merged = [...messages, ...pendingOptimistic];
    
    // Sort by timestamp (clientTimestamp for optimistic, serverTimestamp for synced)
    merged.sort((a, b) => {
      const aTime = (a.serverTimestamp || a.clientTimestamp).toMillis();
      const bTime = (b.serverTimestamp || b.clientTimestamp).toMillis();
      return bTime - aTime; // Newest first (descending)
    });
    
    if (pendingOptimistic.length > 0) {
      console.log(`📦 Showing ${pendingOptimistic.length} optimistic message(s) in UI`);
    }
    
    return merged;
  }, [messages, optimisticMessages]);

  // Clean up optimistic messages when they appear in Firestore
  useEffect(() => {
    const firestoreIds = new Set(messages.map(m => m.id));
    const stillPending = optimisticMessages.filter(m => !firestoreIds.has(m.id));
    
    if (stillPending.length !== optimisticMessages.length) {
      const syncedCount = optimisticMessages.length - stillPending.length;
      console.log(`✅ ${syncedCount} optimistic message(s) synced to Firestore, removing from local queue`);
      setOptimisticMessages(stillPending);
    }
  }, [messages, optimisticMessages]);

  // Set initial navigation options
  useEffect(() => {
    navigation.setOptions({
      headerBackTitle: 'Chats',
    });
  }, [navigation]);

  // Listen to conversation changes (including deletion)
  useEffect(() => {
    const conversationRef = doc(db, 'conversations', conversationId);
    
    const unsubscribe = onSnapshot(
      conversationRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          // Conversation was deleted
          console.log('⚠️ Conversation deleted, navigating back');
          Alert.alert(
            'Conversation Deleted',
            'This conversation has been deleted.',
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ],
            { cancelable: false }
          );
        } else {
          setConversation({ id: snapshot.id, ...snapshot.data() } as Conversation);
        }
      },
      (error) => {
        console.error('Error listening to conversation:', error);
      }
    );

    return () => unsubscribe();
  }, [conversationId]);

  // Update header with conversation name and online indicator
  useEffect(() => {
    if (conversation) {
      let title: string | (() => React.ReactElement) = 'Chat';
      let headerRight;

      if (conversation.type === 'direct') {
        const otherUserId = conversation.participants.find(uid => uid !== currentUserId);
        title = conversation.name || 'Chat';
        // For direct chats, show online indicator in header
        if (otherUserId) {
          headerRight = () => (
            <View style={{ marginRight: 15 }}>
              <OnlineIndicator userId={otherUserId} size={12} />
            </View>
          );
        }
      } else {
        // For group chats, make the title tappable
        const groupName = conversation.name || 'Group Chat';
        const memberCount = conversation.participants?.length || 0;
        
        title = () => (
          <TouchableOpacity
            onPress={() => router.push(`/groupInfo/${conversationId}`)}
            style={{ alignItems: 'center' }}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>
              {groupName}
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
          </TouchableOpacity>
        );

        // Add info icon to header right for groups
        headerRight = () => (
          <TouchableOpacity
            onPress={() => router.push(`/groupInfo/${conversationId}`)}
            style={{ marginRight: 15 }}
          >
            <Text style={{ fontSize: 24, color: '#007AFF' }}>ⓘ</Text>
          </TouchableOpacity>
        );
      }

      navigation.setOptions({
        headerTitle: title,
        headerRight,
        headerBackTitle: 'Chats',
      });
    }
  }, [conversation, currentUserId, navigation, conversationId]);

  // Trigger notifications for new messages (uses messages from useMessages hook)
  useEffect(() => {
    let previousMessageIds = new Set<string>();

    const checkNewMessages = async () => {
      const newMessageIds = new Set(messages.map(m => m.id));
      const addedMessages = messages.filter(
        m => !previousMessageIds.has(m.id) && m.senderId !== currentUserId
      );

      // Show notifications for new messages from others
      if (addedMessages.length > 0 && previousMessageIds.size > 0) {
        for (const message of addedMessages) {
          try {
            const senderDoc = await getDoc(doc(db, 'users', message.senderId));
            const senderName = senderDoc.exists() 
              ? senderDoc.data().displayName || 'Someone'
              : 'Someone';

            await showMessageNotification(
              conversationId,
              senderName,
              message.text,
              message.type
            );
          } catch (error) {
            console.warn('Failed to show notification:', error);
          }
        }
      }

      previousMessageIds = newMessageIds;
    };

    checkNewMessages();
  }, [messages, conversationId, currentUserId]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const messageId = newMessageId();
    const newMessage: Message = {
      id: messageId,
      conversationId,
      senderId: currentUserId,
      type: "text",
      text: text.trim(),
      clientTimestamp: Timestamp.now(),
      serverTimestamp: null,
      status: "sending",
      retryCount: 0,
      readBy: [currentUserId],
      readCount: 1,
    };

    // Add to optimistic state IMMEDIATELY (shows in UI right away)
    setOptimisticMessages(prev => [...prev, newMessage]);
    console.log('📤 Added message to optimistic queue:', messageId.substring(0, 8));

    // Send to Firestore (will queue if offline)
    const result = await sendMessageWithRetry(conversationId, newMessage);
    
    if (result.isOffline) {
      console.log('📦 Message queued offline by Firestore - will auto-sync when connection restored');
      console.log('   Message visible in UI via optimistic state');
    } else if (result.success) {
      console.log('✅ Message sent successfully - will appear via Firestore listener');
      // Message will be removed from optimistic state when Firestore listener fires
    } else {
      console.warn('⚠️ Message send failed after retries');
      // Update optimistic message to "failed" status
      setOptimisticMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, status: "failed" as MessageStatus } : m)
      );
    }
  };

  const handleSendImage = async (imageUri: string) => {
    const messageId = newMessageId();
    
    console.log('🖼️ Sending image message:', messageId.substring(0, 8));

    // Create optimistic image message
    const newMessage: Message = {
      id: messageId,
      conversationId,
      senderId: currentUserId,
      type: "image",
      text: "", // Can add caption support later
      media: {
        status: "uploading",
        url: imageUri, // Temporary local URI
        width: 0,
        height: 0,
      },
      clientTimestamp: Timestamp.now(),
      serverTimestamp: null,
      status: "sending",
      retryCount: 0,
      readBy: [currentUserId],
      readCount: 1,
    };

    // Add to optimistic state IMMEDIATELY (shows in UI right away)
    setOptimisticMessages(prev => [...prev, newMessage]);
    setUploadingImages(new Map(uploadingImages.set(messageId, 0)));
    console.log('📤 Added image message to optimistic queue:', messageId.substring(0, 8));

    try {
      // Upload image to Storage
      const uploadResult = await uploadImage(
        imageUri,
        conversationId,
        messageId,
        (progress) => {
          setUploadingImages(new Map(uploadingImages.set(messageId, progress.progress)));
        }
      );

      console.log('✅ Image uploaded successfully');

      // Update message with upload result
      const messageWithImage: Message = {
        ...newMessage,
        media: {
          status: "ready",
          url: uploadResult.url,
          width: uploadResult.width,
          height: uploadResult.height,
        },
      };

      // Real-time listener will update with the uploaded image

      // Update optimistic message with uploaded image URL
      setOptimisticMessages(prev =>
        prev.map(m => m.id === messageId ? messageWithImage : m)
      );

      // Send to Firestore
      const result = await sendMessageWithRetry(conversationId, messageWithImage);
      
      if (result.isOffline) {
        console.log('📦 Image message queued offline - will send when connection restored');
        console.log('   Message visible in UI via optimistic state');
      } else if (result.success) {
        console.log('✅ Image message sent successfully - will appear via Firestore listener');
        // Message will be removed from optimistic state when Firestore listener fires
      } else {
        console.warn('⚠️ Image message send failed after retries');
        // Update optimistic message to "failed" status
        setOptimisticMessages(prev => 
          prev.map(m => m.id === messageId ? { ...m, status: "failed" as MessageStatus } : m)
        );
      }

      // Clean up upload progress
      const newMap = new Map(uploadingImages);
      newMap.delete(messageId);
      setUploadingImages(newMap);
    } catch (error: any) {
      console.error('❌ Image upload/send failed:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image. Please try again.');

      // Update optimistic message to "failed" status
      setOptimisticMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, status: "failed" as MessageStatus } : m)
      );

      // Clean up upload progress
      const newMap = new Map(uploadingImages);
      newMap.delete(messageId);
      setUploadingImages(newMap);
    }
  };

  const handleRetry = async (messageId: string) => {
    // Check both Firestore messages and optimistic messages
    const failedMessage = allMessages.find(m => m.id === messageId);
    if (!failedMessage) return;

    console.log(`🔄 Manual retry for message ${messageId.substring(0, 8)}`);
    
    // Update optimistic status to "sending"
    setOptimisticMessages(prev => 
      prev.map(m => m.id === messageId ? { ...m, status: "sending" as MessageStatus } : m)
    );
    
    const result = await sendMessageWithRetry(conversationId, failedMessage);
    
    if (result.isOffline) {
      console.log('📦 Retry queued offline - will send when connection restored');
      console.log('   Message visible in UI via optimistic state');
    } else if (result.success) {
      console.log('✅ Retry successful - will appear via Firestore listener');
      // Message will be removed from optimistic state when Firestore listener fires
    } else {
      console.warn('⚠️ Retry failed after attempts');
      // Update back to "failed" status
      setOptimisticMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, status: "failed" as MessageStatus } : m)
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ConnectionBanner />

      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner text="Loading messages..." size="large" />
        </View>
      ) : (
        <FlashList
          data={[...allMessages].reverse()}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.senderId === currentUserId}
              showSenderName={conversation?.type === 'group'}
              conversationType={conversation?.type}
              totalParticipants={conversation?.participants.length}
              onRetry={handleRetry}
            />
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(item) => item.id}
          extraData={allMessages}
          onEndReached={() => {
            // Auto-load more when scrolling to bottom
            if (hasMore && !loadingMore) {
              console.log('🔄 Auto-loading more messages...');
              loadMore();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.loadMoreContainer}>
                {loadingMore ? (
                  <LoadingSpinner text="Loading older messages..." />
                ) : (
                  <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                    <Text style={styles.loadMoreText}>Load Older Messages</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : allMessages.length > 0 ? (
              <View style={styles.endOfMessages}>
                <Text style={styles.endOfMessagesText}>— Beginning of conversation —</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>Send a message to start the conversation</Text>
            </View>
          }
        />
      )}

      {/* Show upload progress */}
      {Array.from(uploadingImages.entries()).map(([messageId, progress]) => (
        <ImageUploadProgress key={messageId} progress={progress} />
      ))}

      <TypingIndicator conversationId={conversationId} currentUserId={currentUserId} />

      <MessageInput 
        onSend={handleSend}
        onSendImage={handleSendImage}
        onTyping={startTyping}
        onStopTyping={stopTyping}
        disabled={uploadingImages.size > 0}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  endOfMessages: {
    padding: 20,
    alignItems: 'center',
  },
  endOfMessagesText: {
    color: '#999',
    fontSize: 13,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
