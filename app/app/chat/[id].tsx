import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
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
import { usePresence } from "@/hooks/usePresence";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMarkAsRead } from "@/hooks/useMarkAsRead";
import { uploadImage } from "@/services/mediaService";
import { showMessageNotification } from "@/services/notificationService";
import { Conversation } from "@/types/index";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
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

  // Real-time listener for messages
  useEffect(() => {
    let previousMessageIds = new Set<string>();

    const unsubscribe = subscribeToMessages(
      conversationId,
      async (newMessages) => {
        // Detect truly new messages (not from cache or initial load)
        const newMessageIds = new Set(newMessages.map(m => m.id));
        const addedMessages = newMessages.filter(
          m => !previousMessageIds.has(m.id) && m.senderId !== currentUserId
        );

        // Show notifications for new messages from others
        if (addedMessages.length > 0) {
          for (const message of addedMessages) {
            // Get sender name from Firestore
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
        setMessages(newMessages);
      },
      (error) => {
        console.error("Error subscribing to messages:", error);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [conversationId, currentUserId]);

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
    setMessages((prev) => [...prev, newMessage]);

    const result = await sendMessageWithRetry(conversationId, newMessage);
    
    if (result.success) {
      // Success - update retry count if needed
      if (result.retryCount > 0) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, retryCount: result.retryCount } : m))
        );
      }
    } else if (result.isOffline) {
      // Offline - keep in sending state, Firestore will queue it
      console.log('📦 Message queued for offline delivery');
      // Don't change status - leave as "sending"
      // Firestore will auto-send when back online
    } else {
      // Real error after retries - mark as failed
      console.error("Failed to send message after retries");
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: "failed" as const, retryCount: result.retryCount } : m))
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

    // Add to UI optimistically
    setMessages((prev) => [...prev, newMessage]);
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

      // Update local state
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? messageWithImage : m))
      );

      // Send to Firestore
      const result = await sendMessageWithRetry(conversationId, messageWithImage);

      // Clean up upload progress
      const newMap = new Map(uploadingImages);
      newMap.delete(messageId);
      setUploadingImages(newMap);

      if (!result.success && !result.isOffline) {
        // Mark as failed
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, status: "failed" as const } : m))
        );
      }
    } catch (error: any) {
      console.error('❌ Image upload/send failed:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image. Please try again.');

      // Mark as failed
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: "failed" as const, media: { ...m.media!, status: "failed" } } : m))
      );

      // Clean up upload progress
      const newMap = new Map(uploadingImages);
      newMap.delete(messageId);
      setUploadingImages(newMap);
    }
  };

  const handleRetry = async (messageId: string) => {
    // Find the failed message
    const failedMessage = messages.find(m => m.id === messageId);
    if (!failedMessage) return;

    console.log(`🔄 Manual retry for message ${messageId.substring(0, 8)}`);

    // Update status to sending
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, status: "sending" as const } : m))
    );

    const result = await sendMessageWithRetry(conversationId, failedMessage);
    
    if (result.success) {
      console.log('✅ Retry successful');
      // Status will be updated by real-time listener
    } else if (result.isOffline) {
      console.log('📦 Still offline - message queued');
      // Keep in sending state
    } else {
      console.error('❌ Retry failed after all attempts');
      // Back to failed status
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: "failed" as const } : m))
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

      <FlashList
        data={messages}
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
      />

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
});
