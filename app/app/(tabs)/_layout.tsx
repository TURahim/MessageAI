import { Tabs } from 'expo-router';
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
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Chats',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'} 
              color={color} 
              focused={focused}
              label="Chats"
            />
          ),
          tabBarLabel: () => null,
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
              label="Schedule"
            />
          ),
          tabBarLabel: () => null,
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
              label="Tasks"
            />
          ),
          tabBarLabel: () => null,
        }} 
      />
      <Tabs.Screen 
        name="assistant" 
        options={{ 
          title: 'Assistant',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'sparkles' : 'sparkles-outline'} 
              color={color} 
              focused={focused}
              label="Assistant"
            />
          ),
          tabBarLabel: () => null,
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon 
              name={focused ? 'person' : 'person-outline'} 
              color={color} 
              focused={focused}
              label="Profile"
            />
          ),
          tabBarLabel: () => null,
        }} 
      />
    </Tabs>
  );
}

