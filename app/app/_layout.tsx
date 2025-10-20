import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
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
          name="chat/[id]" 
          options={{ 
            title: 'Chat', 
            headerShown: true 
          }} 
        />
      </Stack>
    </AuthProvider>
  );
}
