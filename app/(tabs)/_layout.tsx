import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { Icon, icons } from '../../src/components/ui';

export default function TabsLayout() {
  const { theme } = useThemeContext();
  const { colors, fontSize } = theme;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Icon name={icons.home} size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color, size }) => <Icon name={icons.call} size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Icon name={icons.chat} size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="voicemail"
        options={{
          title: 'Voicemail',
          tabBarIcon: ({ color, size }) => <Icon name={icons.mic} size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => <Icon name={icons.people} size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Icon name={icons.settings} size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
