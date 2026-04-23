import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0f0f14', borderTopColor: '#1a1a2e' },
        tabBarActiveTintColor: '#afa9ec',
        tabBarInactiveTintColor: '#444',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tonight',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🌙</Text>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📅</Text>,
        }}
      />
    </Tabs>
  );
}