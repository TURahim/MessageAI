import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { newMessageId } from "@/utils/messageId";
import { Message } from "@/types/message";
import {
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
} from "@/lib/messageService";
import { auth } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";
import MessageBubble from "@/components/MessageBubble";
import MessageInput from "@/components/MessageInput";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  
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
      await sendMessage(conversationId, newMessage);
    } catch (error) {
      console.error("Failed to send message:", error);

      // Update status to failed
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
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwn={item.senderId === currentUserId}
            showSenderName={false}
          />
        )}
        contentContainerStyle={styles.messageList}
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
  messageList: {
    paddingVertical: 10,
  },
});
