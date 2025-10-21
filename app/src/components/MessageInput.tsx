import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text as RNText, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

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

  const handleChangeText = (newText: string) => {
    setText(newText);
    
    // Trigger typing event when user types
    if (newText.length > text.length && onTyping) {
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

  const handlePickImage = async () => {
    if (!onSendImage) {
      Alert.alert('Not Available', 'Image sending is not available');
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to send images');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1, // We'll compress it ourselves
      });

      if (!result.canceled && result.assets[0]) {
        onSendImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Image picker button */}
      {onSendImage && (
        <TouchableOpacity
          style={styles.imageButton}
          onPress={handlePickImage}
          disabled={disabled}
        >
          <RNText style={styles.imageButtonText}>📷</RNText>
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
      />
      <TouchableOpacity
        style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      >
        <RNText style={styles.sendButtonText}>Send</RNText>
      </TouchableOpacity>
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
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
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
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  imageButtonText: {
    fontSize: 24,
  },
});

