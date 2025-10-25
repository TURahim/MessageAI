import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { findTutorByCode, isValidTutorCode } from '@/utils/tutorCode';
import { getOrCreateDirectConversation } from '@/services/conversationService';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function JoinTutorScreen() {
  const { user } = useAuth();
  const [tutorCode, setTutorCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinTutor = async () => {
    if (!user) return;

    const code = tutorCode.trim().toUpperCase();

    // Validate format
    if (!isValidTutorCode(code)) {
      Alert.alert('Invalid Code', 'Please enter a valid tutor code (format: TUT-XXXXX)');
      return;
    }

    setLoading(true);
    try {
      // Find tutor by code
      const tutor = await findTutorByCode(code);

      if (!tutor) {
        Alert.alert('Not Found', 'No tutor found with this code. Please check and try again.');
        setLoading(false);
        return;
      }

      // Check if it's the user's own code
      if (tutor.uid === user.uid) {
        Alert.alert('Invalid Action', 'You cannot connect to your own tutor code.');
        setLoading(false);
        return;
      }

      // Create or get direct conversation with tutor
      const conversationId = await getOrCreateDirectConversation(user.uid, tutor.uid);

      // Add tutor to parent's linkedTutorIds
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        linkedTutorIds: arrayUnion(tutor.uid),
      });

      console.log(`✅ Parent connected to tutor: ${tutor.displayName} (${code})`);

      // Navigate to chat with tutor
      Alert.alert(
        'Success!',
        `You're now connected with ${tutor.displayName}${tutor.businessName ? ` (${tutor.businessName})` : ''}`,
        [
          {
            text: 'Start Chatting',
            onPress: () => router.replace(`/chat/${conversationId}`),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error joining tutor:', error);
      Alert.alert('Error', 'Failed to connect with tutor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTutorCode = (text: string) => {
    // Auto-format as TUT-XXXXX
    let formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (formatted.startsWith('TUT')) {
      formatted = formatted.slice(3);
    }
    
    if (formatted.length > 5) {
      formatted = formatted.slice(0, 5);
    }
    
    return formatted ? `TUT-${formatted}` : '';
  };

  const handleTextChange = (text: string) => {
    const formatted = formatTutorCode(text);
    setTutorCode(formatted);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="person-add" size={64} color="#007AFF" />
        </View>

        <Text style={styles.title}>Connect with a Tutor</Text>
        <Text style={styles.subtitle}>
          Enter the tutor code provided by your tutor to start receiving lesson updates and homework reminders
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tutor Code</Text>
          <TextInput
            style={styles.input}
            placeholder="TUT-XXXXX"
            value={tutorCode}
            onChangeText={handleTextChange}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={9}
            editable={!loading}
          />
          <Text style={styles.hint}>
            Code format: TUT followed by 5 characters (e.g., TUT-A3F9B)
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.joinButton, loading && styles.joinButtonDisabled]}
          onPress={handleJoinTutor}
          disabled={loading || tutorCode.length < 9}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.joinButtonText}>Connect</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Don't have a tutor code? Ask your tutor to share their unique code with you.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    color: '#000',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  joinButtonDisabled: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

