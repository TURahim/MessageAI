import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { registerForPushNotifications, setupNotificationTapHandler } from '@/services/notificationService';

function AppContent() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // Initialize presence tracking ONLY when user is authenticated
  // Pass undefined to skip when user is null (prevents permission errors)
  usePresence(user ? null : undefined);

  // Setup remote push notifications when user is authenticated
  useEffect(() => {
    if (user) {
      const setupNotifications = async () => {
        // Register for remote push notifications (gets and stores Expo push token)
        const pushToken = await registerForPushNotifications(user.uid);

        if (pushToken) {
          // Setup tap handler for when notifications are tapped
          setupNotificationTapHandler();
          console.log('✅ Remote push notifications initialized');
          console.log('   Device registered with Expo Push Service');
          console.log('   Cloud Functions will send notifications via APNs/FCM');
        } else {
          console.warn('⚠️ Push notifications not available (simulator or permissions denied)');
        }
      };

      setupNotifications();
    }
  }, [user]);

  // Global auth guard: redirect based on auth state from anywhere in the app
  useEffect(() => {
    if (loading) return; // Don't redirect while checking auth state

    // Wait for segments to be ready (avoid redirecting before navigation is initialized)
    if (!segments || segments.length <= 1) {
      console.log('🛡️ Auth guard: Waiting for navigation to initialize...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const currentPath = segments.join('/');

    console.log('🛡️ Auth guard check:', {
      hasUser: !!user,
      currentPath,
      inAuthGroup,
      inTabsGroup,
    });

    if (!user && !inAuthGroup) {
      // User is not authenticated and not in auth screens -> redirect to login
      console.log('🔒 Not authenticated, redirecting to login');
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // User is authenticated but in auth screens -> redirect to tabs
      console.log('✅ Authenticated, redirecting to home');
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="users" 
        options={{ 
          title: 'Select User',
          headerShown: true,
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="newGroup" 
        options={{ 
          title: 'New Group',
          headerShown: true,
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="chat/[id]" 
        options={{ 
          title: 'Chat', 
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="profile/[id]" 
        options={{ 
          title: 'Profile', 
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="groupInfo/[id]" 
        options={{ 
          title: 'Group Info', 
          headerShown: true 
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
