import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../../theme/ThemeProvider';
import { useRouter } from 'expo-router';
import { ThemedText } from './ThemedText';
import { Icon, icons } from './Icon';

interface ThemedHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export function ThemedHeader({
  title,
  subtitle,
  showBack = false,
  rightAction,
  transparent = false,
}: ThemedHeaderProps) {
  const { theme, isDark } = useThemeContext();
  const { colors, fontSize } = theme;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: transparent ? 'transparent' : colors.headerBg,
          borderBottomColor: transparent ? 'transparent' : colors.headerBorder,
          paddingTop: insets.top + 8,
        },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.content}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Icon name={icons.back} size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <ThemedText variant="subtitle" numberOfLines={1}>
              {title}
            </ThemedText>
            {subtitle && (
              <ThemedText variant="caption" numberOfLines={1}>
                {subtitle}
              </ThemedText>
            )}
          </View>
        </View>
        {rightAction && <View style={styles.right}>{rightAction}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  titleContainer: {
    flex: 1,
    gap: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  backButton: {
    padding: 4,
    marginRight: 4,
  },
});
