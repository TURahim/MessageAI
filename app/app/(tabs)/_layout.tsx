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
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
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
            />
          ),
        }} 
      />
    </Tabs>
  );
}

