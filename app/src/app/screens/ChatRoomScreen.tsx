import React, { useState, useEffect } from "react";
import { View, TextInput, Button, FlatList, Text, StyleSheet } from "react-native";
import { newMessageId } from "../../utils/messageId";
import { Message } from "../../types/message";
import {
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
} from "../../lib/messageService";
import { auth } from "../../lib/firebase";

interface ChatRoomScreenProps {
  route?: {
    params?: {
      conversationId?: string;
    };
  };
}

export default function ChatRoomScreen({ route }: ChatRoomScreenProps) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  
  // For demo purposes, use a default conversationId if none provided
  const conversationId = route?.params?.conversationId || "demo-conversation-1";
  const currentUserId = auth.currentUser?.uid || "anonymous";

  // Real-time listener for messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages(
      conversationId,
      (newMessages) => {
        setMessages(newMessages);
        
        // Mark messages from others as read
        const unreadMessages = newMessages.filter(
          (m) => m.senderId !== currentUserId && m.state !== "read"
        );
        
        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map((m) => m.mid);
          markMessagesAsRead(conversationId, messageIds).catch((err) =>
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

  const send = async () => {
    if (!text.trim()) return;

    const mid = newMessageId();
    const optimisticMessage: Message = {
      mid,
      senderId: currentUserId,
      text: text.trim(),
      state: "sending",
      clientTs: Date.now(),
    };

    // Optimistic UI update
    setMessages((prev) => [optimisticMessage, ...prev]);
    setText("");

    try {
      // Send to Firestore
      await sendMessage(conversationId, optimisticMessage);
      
      // Update local state to "sent"
      setMessages((prev) =>
        prev.map((m) =>
          m.mid === mid ? { ...m, state: "sent" as const } : m
        )
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      
      // Update to failed state (or remove from list)
      setMessages((prev) =>
        prev.map((m) =>
          m.mid === mid ? { ...m, state: "sent" as const } : m
        )
      );
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        inverted
        style={styles.messageList}
        data={messages}
        keyExtractor={(m) => m.mid}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.senderId === currentUserId
                ? styles.myMessage
                : styles.theirMessage,
            ]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.messageState}>
              {item.state} • {new Date(item.clientTs).toLocaleTimeString()}
            </Text>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          style={styles.input}
          multiline
        />
        <Button title="Send" onPress={send} disabled={!text.trim()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f5f5f5",
  },
  messageList: {
    flex: 1,
    marginBottom: 12,
  },
  messageBubble: {
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    maxWidth: "80%",
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
  },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#E5E5EA",
  },
  messageText: {
    fontSize: 16,
    color: "#000",
  },
  messageState: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#fff",
    maxHeight: 100,
  },
});
