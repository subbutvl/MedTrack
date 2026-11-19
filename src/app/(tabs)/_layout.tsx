import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { strings } from '@/i18n/strings';
import { fonts, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const tab = (title: string, icon: IconName, iconActive: IconName) => ({
  title,
  tabBarIcon: ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? iconActive : icon} color={typeof color === 'string' ? color : undefined} size={size} />
  ),
});

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabIconActive,
        tabBarInactiveTintColor: colors.tabIconInactive,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={tab(strings.tabs.today, 'today-outline', 'today')} />
      <Tabs.Screen name="medications" options={tab(strings.tabs.medications, 'medkit-outline', 'medkit')} />
      <Tabs.Screen name="settings" options={tab(strings.tabs.settings, 'settings-outline', 'settings')} />
    </Tabs>
  );
}
