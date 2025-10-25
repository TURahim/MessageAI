import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { setUserRole } from '@/services/authService';
import { generateUniqueTutorCode } from '@/utils/tutorCode';
import { Ionicons } from '@expo/vector-icons';

export default function SelectRoleScreen() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'tutor' | 'parent' | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Tutor fields
  const [subjects, setSubjects] = useState<string[]>([]);
  const [currentSubject, setCurrentSubject] = useState('');
  const [businessName, setBusinessName] = useState('');
  
  // Parent fields
  const [studentContext, setStudentContext] = useState('');

  const handleContinue = async () => {
    if (!selectedRole || !user) return;

    // Validation
    if (selectedRole === 'tutor' && subjects.length === 0) {
      Alert.alert('Missing Information', 'Please add at least one subject you teach.');
      return;
    }

    setLoading(true);
    try {
      if (selectedRole === 'tutor') {
        // Generate and reserve unique tutor code atomically
        const tutorCode = await generateUniqueTutorCode(user.uid);
        
        // Build tutor data, only including optional fields if they have values
        const tutorData: any = {
          tutorCode,
          subjects,
        };
        
        const trimmedBusinessName = businessName.trim();
        if (trimmedBusinessName) {
          tutorData.businessName = trimmedBusinessName;
        }
        
        await setUserRole(user.uid, 'tutor', tutorData);
        
        console.log('✅ Tutor role set with code:', tutorCode);
        
        // Show success message for tutors
        Alert.alert(
          'Welcome, Tutor!',
          `Your tutor code is ${tutorCode}. You can share this with parents to connect.`,
          [{ text: 'Got it', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        // Parent role - build data with only defined values
        const parentData: any = {
          linkedTutorIds: [],
        };
        
        const trimmedStudentContext = studentContext.trim();
        if (trimmedStudentContext) {
          parentData.studentContext = trimmedStudentContext;
        }
        
        await setUserRole(user.uid, 'parent', parentData);
        
        console.log('✅ Parent role set');
        
        // Navigate immediately for parents
        // Small delay to ensure Firestore propagates (auth guard will also handle)
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 300);
      }
    } catch (error: any) {
      console.error('Error setting role:', error);
      Alert.alert('Error', 'Failed to set role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addSubject = () => {
    const subject = currentSubject.trim();
    if (subject && !subjects.includes(subject)) {
      setSubjects([...subjects, subject]);
      setCurrentSubject('');
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter(s => s !== subject));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Setting up your account...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to MessageAI</Text>
        <Text style={styles.subtitle}>Select your role to get started</Text>
      </View>

      {/* Role Selection Cards */}
      {!selectedRole && (
        <View style={styles.roleCards}>
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => setSelectedRole('tutor')}
          >
            <View style={styles.roleIcon}>
              <Ionicons name="school" size={48} color="#007AFF" />
            </View>
            <Text style={styles.roleTitle}>I'm a Tutor</Text>
            <Text style={styles.roleDescription}>
              Manage lessons, communicate with parents, and track student progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => setSelectedRole('parent')}
          >
            <View style={styles.roleIcon}>
              <Ionicons name="people" size={48} color="#34C759" />
            </View>
            <Text style={styles.roleTitle}>I'm a Parent</Text>
            <Text style={styles.roleDescription}>
              Stay updated on lessons, homework, and your child's progress
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tutor Details Form */}
      {selectedRole === 'tutor' && (
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setSelectedRole(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>Tutor Setup</Text>
          </View>

          <Text style={styles.label}>What subjects do you teach? *</Text>
          <View style={styles.subjectInputContainer}>
            <TextInput
              style={styles.subjectInput}
              placeholder="e.g., Mathematics"
              value={currentSubject}
              onChangeText={setCurrentSubject}
              onSubmitEditing={addSubject}
            />
            <TouchableOpacity style={styles.addButton} onPress={addSubject}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.subjectList}>
            {subjects.map((subject) => (
              <View key={subject} style={styles.subjectChip}>
                <Text style={styles.subjectText}>{subject}</Text>
                <TouchableOpacity onPress={() => removeSubject(subject)}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <Text style={styles.label}>Business Name (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Smith Tutoring Services"
            value={businessName}
            onChangeText={setBusinessName}
          />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              We'll generate a unique tutor code that parents can use to connect with you
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.continueButton, subjects.length === 0 && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={subjects.length === 0}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Parent Details Form */}
      {selectedRole === 'parent' && (
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setSelectedRole(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>Parent Setup</Text>
          </View>

          <Text style={styles.label}>Student Initials (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., J.S."
            value={studentContext}
            onChangeText={setStudentContext}
            maxLength={10}
          />
          <Text style={styles.helperText}>
            This helps tutors provide personalized updates
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#34C759" />
            <Text style={styles.infoText}>
              You'll be able to connect with tutors using their unique tutor codes
            </Text>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  roleCards: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleIcon: {
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    marginTop: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 12,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  subjectInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  subjectInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addButton: {
    width: 50,
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    minHeight: 40,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  subjectText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

