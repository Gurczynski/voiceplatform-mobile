import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from '../src/theme/ThemeProvider';
import { useAuthStore } from '../src/stores';
import { registerForPushNotifications, setupNotificationListeners } from '../src/lib/notifications';

function RootLayoutNav() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const [ready, setReady] = useState(false);
  const loadSession = useAuthStore((s) => s.loadSession);

  useEffect(() => {
    const init = async () => {
      await loadSession();

      // Register for push notifications
      const token = await registerForPushNotifications();
      if (token) {
        console.log('Push token registered:', token);
      }

      // Set up notification listeners
      const cleanup = setupNotificationListeners();

      setReady(true);

      return cleanup;
    };

    init();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
        animationDuration: 200,
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
