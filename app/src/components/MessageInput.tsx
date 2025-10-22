import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text as RNText } from 'react-native';
import AttachmentModal from './AttachmentModal';

interface Props {
  onSend: (text: string) => void;
  onSendImage?: (imageUri: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MessageInput({ 
  onSend, 
  onSendImage,
  onTyping, 
  onStopTyping, 
  placeholder = 'Type a message...',
  disabled = false
}: Props) {
  const [text, setText] = useState('');
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);

  const handleChangeText = (newText: string) => {
    setText(newText);
    
    // Trigger typing event on every text change (hook handles debouncing)
    if (newText.length > 0 && onTyping) {
      onTyping();
    }
  };

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
      
      // Stop typing when message is sent
      if (onStopTyping) {
        onStopTyping();
      }
    }
  };

  const handleOpenAttachments = () => {
    setShowAttachmentModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Modern + attachment button */}
      {onSendImage && (
        <TouchableOpacity
          style={styles.attachmentButton}
          onPress={handleOpenAttachments}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <RNText style={styles.attachmentButtonText}>+</RNText>
        </TouchableOpacity>
      )}

      <TextInput
        style={styles.input}
        value={text}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        multiline
        maxLength={1000}
        placeholderTextColor="#999"
        editable={!disabled}
        textAlignVertical="center"
      />
      <TouchableOpacity
        style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      >
        <RNText style={styles.sendButtonText}>Send</RNText>
      </TouchableOpacity>

      {/* Attachment modal */}
      <AttachmentModal
        visible={showAttachmentModal}
        onClose={() => setShowAttachmentModal(false)}
        onSendImage={onSendImage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    paddingTop: 9,
    paddingBottom: 11,
    marginRight: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  attachmentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  attachmentButtonText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    marginTop: -2, // Optical alignment for +
  },
});

