import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TIMEOUT_MS = 10000; // 10 second timeout

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [roleCheckState, setRoleCheckState] = useState<'checking' | 'has_role' | 'no_role' | 'error' | 'timeout'>('checking');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset state when user changes
    if (!user) {
      setRoleCheckState('checking');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    console.log('🔍 Auth Guard: Checking role for user', user.uid.substring(0, 8));

    // Set timeout fallback (assume no role if check takes too long)
    timeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Auth Guard: Role check timed out, assuming no role');
      setRoleCheckState('no_role');
    }, TIMEOUT_MS);

    console.log('🔄 Auth Guard: Setting up onSnapshot listener for user doc');

    // Use reactive listener instead of one-shot getDoc
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        console.log('📨 Auth Guard: onSnapshot fired', {
          exists: snapshot.exists(),
          metadata: snapshot.metadata,
        });

        // Clear timeout on successful response
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        if (!snapshot.exists()) {
          // User document doesn't exist yet (edge case)
          console.warn('⚠️ Auth Guard: User document not found, assuming no role');
          setRoleCheckState('no_role');
          return;
        }

        const userData = snapshot.data();
        console.log('📄 Auth Guard: User document data:', userData);

        const hasRole = !!userData?.role;

        console.log('✅ Auth Guard: Role check complete', {
          hasRole,
          role: userData?.role,
          allKeys: Object.keys(userData || {}),
        });

        setRoleCheckState(hasRole ? 'has_role' : 'no_role');
      },
      (error) => {
        console.error('❌ Auth Guard: onSnapshot error', {
          error: error,
          code: error.code,
          message: error.message,
        });

        // Clear timeout on error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // On Firestore error, assume no role (safe fallback)
        // This allows the user to proceed to role selection
        setRoleCheckState('no_role');
      }
    );

    console.log('✅ Auth Guard: onSnapshot listener setup complete');

    // Cleanup listener and timeout on unmount
    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [user]);

  // Show spinner while auth is initializing
  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    console.log('🔒 Auth Guard: No user, redirecting to login');
    return <Redirect href="/(auth)/login" />;
  }

  // Still checking role - show spinner
  if (roleCheckState === 'checking') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking profile...</Text>
      </View>
    );
  }

  // No role or error/timeout - redirect to role selection
  if (roleCheckState === 'no_role' || roleCheckState === 'error' || roleCheckState === 'timeout') {
    console.log('👤 Auth Guard: No role detected, redirecting to /selectRole');
    return <Redirect href="/selectRole" />;
  }

  // Has role - redirect to main app
  if (roleCheckState === 'has_role') {
    console.log('✅ Auth Guard: Role confirmed, redirecting to /(tabs)');
    return <Redirect href="/(tabs)" />;
  }

  // Fallback (should never reach here)
  console.warn('⚠️ Auth Guard: Unexpected state, showing loading');
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
