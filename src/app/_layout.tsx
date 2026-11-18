import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ensureSelfProfile } from '@/db/client';
import { configureNotifications, requestPermission } from '@/services/notifications';
import { startReminderEngine } from '@/services/reminders';
import { fontAssets, fonts, ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { colors, scheme } = useTheme();

  useEffect(() => {
    // Paints the root view, so no white flash shows behind screens in dark mode.
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontFamily: fonts.heading, color: colors.text },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="person/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="person/[id]" options={{ title: '' }} />
        <Stack.Screen name="medication/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="meal-times" options={{ title: 'Meal times' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    let stop: (() => void) | undefined;
    (async () => {
      await configureNotifications().catch(() => {});
      await requestPermission().catch(() => false);
      await ensureSelfProfile().catch((e) => console.warn('DB init failed', e));
      stop = startReminderEngine();
    })();
    return () => stop?.();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
