import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { Icon, icons } from '../../src/components/ui';

export default function TabsLayout() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icon name={icons.home} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color }) => <Icon name={icons.call} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <Icon name={icons.chat} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="voicemail"
        options={{
          title: 'Voicemail',
          tabBarIcon: ({ color }) => <Icon name={icons.mic} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <Icon name={icons.menu} size={24} color={color as string} />,
        }}
      />

      {/* Hidden screens - accessible via navigation only */}
      <Tabs.Screen name="contacts" options={{ href: null }} />
      <Tabs.Screen name="recordings" options={{ href: null }} />
    </Tabs>
  );
}
