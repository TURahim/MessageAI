import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/authService';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import TimezonePicker from '@/components/TimezonePicker';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto'
  );
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [firestoreProfile, setFirestoreProfile] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Log user object for debugging
  useEffect(() => {
    console.log('👤 Profile screen - Firebase Auth user:', {
      hasUser: !!user,
      uid: user?.uid,
      email: user?.email,
      displayName: user?.displayName,
      photoURL: user?.photoURL,
      emailVerified: user?.emailVerified,
    });
  }, [user]);

  // Fetch Firestore profile data
  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      try {
        console.log('📥 Fetching Firestore profile for:', user.uid);
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log('✅ Firestore profile loaded:', data);
          setFirestoreProfile(data);
          
          // Load timezone from Firestore profile
          if (data.timezone) {
            setTimezone(data.timezone);
          }
          
          setFetchError(null);
        } else {
          console.warn('⚠️ User document does not exist in Firestore');
          setFetchError('User profile not found');
        }
      } catch (error: any) {
        console.error('❌ Error fetching Firestore profile:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        setFetchError(error.message || 'Failed to load profile');
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    try {
      console.log('🚪 User clicked sign out button');
      await signOut();
      console.log('📤 Sign out completed, forcing navigation to login');
      
      // Force navigation to login screen immediately
      // Use replace to prevent back navigation
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('❌ Sign out failed:', error);
      Alert.alert('Sign Out Error', error.message || 'Failed to sign out. Please try again.');
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: displayName.trim() });
      
      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        timezone: timezone,
        updatedAt: new Date(),
      });

      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handlePickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to update your profile photo');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0] && user) {
      await uploadProfilePhoto(result.assets[0].uri);
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    if (!user) return;

    setUploading(true);
    try {
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const storageRef = ref(storage, `profiles/${user.uid}/photo.jpg`);
      await uploadBytes(storageRef, blob);

      // Get download URL
      const photoURL = await getDownloadURL(storageRef);

      // Update Firebase Auth profile
      await updateProfile(user, { photoURL });

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL });

      Alert.alert('Success', 'Profile photo updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  // Get display values with fallback to Firestore data
  const profileDisplayName = user?.displayName || firestoreProfile?.displayName || 'N/A';
  const profileEmail = user?.email || firestoreProfile?.email || 'N/A';
  const profilePhotoURL = user?.photoURL || firestoreProfile?.photoURL || null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Error Message */}
      {fetchError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {fetchError}</Text>
        </View>
      )}

      {/* Profile Photo */}
      <View style={styles.photoContainer}>
        {uploading ? (
          <View style={styles.photoPlaceholder}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : profilePhotoURL ? (
          <Image source={{ uri: profilePhotoURL }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>
              {profileDisplayName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.changePhotoButton} 
          onPress={handlePickImage}
          disabled={uploading}
        >
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Display Name */}
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Display Name:</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter display name"
            autoFocus
          />
        ) : (
          <Text style={styles.value}>{profileDisplayName}</Text>
        )}
      </View>

      {/* Timezone */}
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Timezone:</Text>
        {editing ? (
          <TouchableOpacity
            style={styles.timezoneButton}
            onPress={() => setShowTimezonePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.timezoneText}>{timezone}</Text>
            <Text style={styles.changeText}>Change →</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.value}>{timezone}</Text>
        )}
      </View>

      {/* Email (read-only) */}
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{profileEmail}</Text>
      </View>
      
      {/* TimezonePicker Modal */}
      <TimezonePicker
        visible={showTimezonePicker}
        selectedTimezone={timezone}
        onSelect={setTimezone}
        onClose={() => setShowTimezonePicker(false)}
      />

      {/* Edit/Save Button */}
      {editing ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.saveButton]} 
            onPress={handleSaveProfile}
          >
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={() => {
              setDisplayName(user?.displayName || '');
              setEditing(false);
            }}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.button, styles.editButton]} 
          onPress={() => setEditing(true)}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      {/* Sign Out */}
      <TouchableOpacity 
        style={[styles.button, styles.signOutButton]} 
        onPress={handleSignOut}
        testID="sign-out-button"
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoPlaceholderText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  changePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    color: '#007AFF',
    fontSize: 16,
  },
  infoContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    color: '#000',
  },
  input: {
    fontSize: 18,
    color: '#000',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#34C759',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  timezoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timezoneText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  changeText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});

