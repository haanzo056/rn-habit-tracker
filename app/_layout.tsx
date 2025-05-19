import '@/i18n';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { detectLanguage } from '@/i18n';
import { setupNotificationChannel } from '@/notifications/reminders';
import { useHabits } from '@/store/habits';
import { useSettings } from '@/store/settings';
import { useSync } from '@/sync/useSync';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}

function Root() {
  const { t, i18n } = useTranslation();
  const { scheme, colors } = useTheme();
  const ready = useHabits((s) => s.ready);
  const load = useHabits((s) => s.load);
  const language = useSettings((s) => s.language);

  useSync();

  useEffect(() => {
    void load().finally(() => SplashScreen.hideAsync());
    setupNotificationChannel().catch((err) => console.warn('notification channel', err));
  }, [load]);

  useEffect(() => {
    void i18n.changeLanguage(language === 'system' ? detectLanguage() : language);
  }, [language, i18n]);

  // Keeps the root view from flashing white behind modals in dark mode.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const habitId = response.notification.request.content.data?.habitId;
      if (typeof habitId === 'string') router.push(`/habit/${habitId}`);
    });
    return () => sub.remove();
  }, []);

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  if (!ready) return null;

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerBackTitle: t('common.back') }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="habit/new" options={{ title: t('habit.new'), presentation: 'modal' }} />
        <Stack.Screen name="habit/[id]" options={{ title: '' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
