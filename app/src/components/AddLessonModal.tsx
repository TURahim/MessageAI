import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';

interface AddLessonModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddLessonModal({ visible, onClose }: AddLessonModalProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) {
      Alert.alert('Empty Input', 'Please describe the lesson you want to schedule');
      return;
    }

    // BEGIN MOCK_AI_PARSE
    // TODO: Replace with aiOrchestratorService.parseLesson() Cloud Function call
    // See JellyDMTasklist.md PR6.2 for replacement code (use httpsCallable, not /api/)
    // Mock action - will be wired to AI later
    Alert.alert(
      'AI Scheduling',
      `AI will parse: "${text.trim()}"\n\nThis will be connected to the AI orchestrator to extract date, time, and create the session.`,
      [
        {
          text: 'OK',
          onPress: () => {
            setText('');
            onClose();
          },
        },
      ]
    );
    // END MOCK_AI_PARSE
  };

  const handleCancel = () => {
    setText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Add Lesson</Text>
              <Text style={styles.subtitle}>
                Describe the lesson and AI will help schedule it
              </Text>
            </View>

            {/* Text input */}
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="e.g., Math tutoring tomorrow at 3pm with Sarah"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />

            {/* Examples */}
            <View style={styles.examples}>
              <Text style={styles.examplesTitle}>Examples:</Text>
              <Text style={styles.exampleText}>• "Physics lesson Friday 4pm"</Text>
              <Text style={styles.exampleText}>• "Chemistry tutoring next week"</Text>
              <Text style={styles.exampleText}>• "English session with John"</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>Create with AI ✨</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    minHeight: 120,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  examples: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  examplesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  exampleText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

