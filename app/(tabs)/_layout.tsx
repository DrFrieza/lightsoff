import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import tokens from '../../lib/tokens';

const t = tokens.semantic.dark;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.bgTabBar,
          borderTopColor: t.divider,
          borderTopWidth: 0.5,
          height: tokens.component.tabBar.height,
          paddingBottom: tokens.spacing[7],
          paddingTop: tokens.spacing[2],
        },
        tabBarActiveTintColor: t.textPrimary,
        tabBarInactiveTintColor: t.textMuted,
        tabBarLabelStyle: {
          fontSize: tokens.component.tabBar.labelSize,
          fontWeight: String(tokens.fontWeight.medium) as any,
          marginTop: tokens.spacing[1],
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'moon' : 'moon-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="children"
        options={{
          title: 'Children',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}