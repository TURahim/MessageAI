import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { newMessageId } from "@/utils/messageId";
import { Message } from "@/types/message";
import {
  sendMessage,
  sendMessageWithRetry,
  subscribeToMessages,
  markMessagesAsRead,
  updateMessageStatus,
} from "@/lib/messageService";
import { auth, db } from "@/lib/firebase";
import { Timestamp, doc, getDoc } from "firebase/firestore";
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

  // Fetch conversation details
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const convDoc = await getDoc(doc(db, 'conversations', conversationId));
        if (convDoc.exists()) {
          setConversation({ id: convDoc.id, ...convDoc.data() } as Conversation);
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };

    fetchConversation();
  }, [conversationId]);

  // Update header with conversation name and online indicator
  useEffect(() => {
    if (conversation) {
      let title = 'Chat';
      let headerRight;

      if (conversation.type === 'direct') {
        const otherUserId = conversation.participants.find(uid => uid !== currentUserId);
        // For direct chats, show online indicator in header
        if (otherUserId) {
          headerRight = () => (
            <View style={{ marginRight: 15 }}>
              <OnlineIndicator userId={otherUserId} size={12} />
            </View>
          );
        }
      } else {
        title = conversation.name || 'Group Chat';
      }

      navigation.setOptions({
        title,
        headerRight,
      });
    }
  }, [conversation, currentUserId, navigation]);

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

    // Optimistic: Add to UI immediately
    // Note: With pagination, we manage messages in useMessages hook
    // The real-time listener will pick up our optimistic message

    await sendMessageWithRetry(conversationId, newMessage);
    // Real-time listener will update the message status
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

    // Add to UI optimistically (real-time listener will pick it up)
    setUploadingImages(new Map(uploadingImages.set(messageId, 0)));

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

      // Send to Firestore
      const result = await sendMessageWithRetry(conversationId, messageWithImage);

      // Clean up upload progress
      const newMap = new Map(uploadingImages);
      newMap.delete(messageId);
      setUploadingImages(newMap);

      // Real-time listener will handle status updates
    } catch (error: any) {
      console.error('❌ Image upload/send failed:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image. Please try again.');

      // Real-time listener will handle failed status

      // Clean up upload progress
      const newMap = new Map(uploadingImages);
      newMap.delete(messageId);
      setUploadingImages(newMap);
    }
  };

  const handleRetry = async (messageId: string) => {
    const failedMessage = messages.find(m => m.id === messageId);
    if (!failedMessage) return;

    console.log(`🔄 Manual retry for message ${messageId.substring(0, 8)}`);
    await sendMessageWithRetry(conversationId, failedMessage);
    // Real-time listener will update the status
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
          data={[...messages].reverse()}
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
            ) : messages.length > 0 ? (
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
