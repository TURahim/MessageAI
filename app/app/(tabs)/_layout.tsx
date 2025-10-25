import { Tabs, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TabIcon from '@/components/TabIcon';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e0e0e0',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => router.push('/profile')} 
            style={{ marginRight: 15 }}
          >
            <Ionicons name="person-circle-outline" size={28} color="#007AFF" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Overview',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'home' : 'home-outline'} 
              color={color} 
              focused={focused}
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="chats" 
        options={{ 
          title: 'Chats',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'} 
              color={color} 
              focused={focused}
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="schedule" 
        options={{ 
          title: 'Schedule',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'calendar' : 'calendar-outline'} 
              color={color} 
              focused={focused}
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="tasks" 
        options={{ 
          title: 'Tasks',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} 
              color={color} 
              focused={focused}
            />
          ),
        }} 
      />
      <Tabs.Screen 
        name="assistant" 
        options={{ 
          title: 'Assistant',
          headerShown: true,
          href: null, // Hide from tab bar
        }} 
      />
    </Tabs>
  );
}

