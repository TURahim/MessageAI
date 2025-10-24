import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';

interface AddLessonModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddLessonModal({ visible, onClose }: AddLessonModalProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('Empty Input', 'Please describe the lesson you want to schedule');
      return;
    }

    // BEGIN MOCK_AI_PARSE
    // TODO: Wire to Cloud Function when parseLesson CF is implemented
    // For now, show alert that AI parsing is not yet deployed
    Alert.alert(
      'AI Parsing',
      `Ready to parse: "${text.trim()}"\n\nNote: This will call the parseLesson Cloud Function once deployed.\n\nFor now, create events manually via the Schedule tab.`,
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
    
    /* REAL IMPLEMENTATION (uncomment when parseLesson CF is deployed):
    setLoading(true);
    try {
      const { parseLesson } = await import('@/services/ai/aiOrchestratorService');
      const { useAuth } = await import('@/hooks/useAuth');
      const { user } = useAuth();
      
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await parseLesson(text.trim(), user?.uid || '', timezone);
      
      if (result.success && result.event) {
        const { createEvent } = await import('@/services/schedule/eventService');
        const eventId = await createEvent({
          ...result.event,
          conversationId: 'general', // Or current conversation
          createdBy: user?.uid || '',
        }, timezone);
        
        Alert.alert('Success', `Lesson scheduled! Event ID: ${eventId}`);
        setText('');
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to parse lesson');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
    */
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

