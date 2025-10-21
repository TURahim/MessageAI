import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { newMessageId } from "@/utils/messageId";
import { Message } from "@/types/message";
import {
  sendMessage,
  sendMessageWithRetry,
  subscribeToMessages,
  markMessagesAsRead,
  updateMessageStatus,
} from "@/lib/messageService";
import { auth } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";
import MessageBubble from "@/components/MessageBubble";
import MessageInput from "@/components/MessageInput";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const { isOnline } = useNetworkStatus();
  
  const conversationId = id || "demo-conversation-1";
  const currentUserId = auth.currentUser?.uid || "anonymous";

  // Real-time listener for messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages(
      conversationId,
      (newMessages) => {
        setMessages(newMessages);
        
        // Mark messages from others as read
        const unreadMessages = newMessages.filter(
          (m: Message) => m.senderId !== currentUserId && !m.readBy.includes(currentUserId)
        );
        
        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map((m: Message) => m.id);
          markMessagesAsRead(conversationId, messageIds).catch((err: Error) =>
            console.warn("Failed to mark messages as read:", err)
          );
        }
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

    try {
      const retries = await sendMessageWithRetry(conversationId, newMessage);
      
      // Update retry count in local state
      if (retries > 0) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, retryCount: retries } : m))
        );
      }
    } catch (error) {
      console.error("Failed to send message after retries:", error);

      // Update status to failed
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: "failed" as const } : m))
      );
    }
  };

  const handleRetry = async (messageId: string) => {
    // Find the failed message
    const failedMessage = messages.find(m => m.id === messageId);
    if (!failedMessage) return;

    // Update status to sending
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, status: "sending" as const } : m))
    );

    try {
      await sendMessageWithRetry(conversationId, failedMessage);
      
      // Success - status will be updated by real-time listener
    } catch (error) {
      console.error("Retry failed:", error);
      
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
      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📡 No internet connection</Text>
        </View>
      )}

      <FlashList
        data={messages}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwn={item.senderId === currentUserId}
            showSenderName={false}
            onRetry={handleRetry}
          />
        )}
      />

      <MessageInput onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  offlineBanner: {
    backgroundColor: '#ff9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  messageList: {
    paddingVertical: 10,
  },
});
