import { Stack } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';

export default function SettingsLayout() {
  const { theme } = useThemeContext();
  const { colors } = theme;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
