import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { signInWithEmail } from '@/services/authService';
import ErrorBanner from '@/components/ErrorBanner';
import { getFirebaseErrorMessage } from '@/utils/errorMessages';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      const friendlyError = getFirebaseErrorMessage(err);
      setError(friendlyError.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Signing in...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MessageAI</Text>
      
      {error && (
        <ErrorBanner 
          message={error} 
          onDismiss={() => setError(null)}
          type="error"
        />
      )}
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.loginButton} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.signupButton}
        onPress={() => router.push('/(auth)/signup')}
      >
        <Text style={styles.signupButtonText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#000',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    marginTop: 20,
    padding: 10,
  },
  signupButtonText: {
    color: '#007AFF',
    fontSize: 14,
    textAlign: 'center',
  },
});

