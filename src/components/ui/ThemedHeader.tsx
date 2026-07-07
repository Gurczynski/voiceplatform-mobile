import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useThemeContext } from '../../theme/ThemeProvider';
import { useRouter } from 'expo-router';

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
  const { colors, spacing, fontSize } = theme;
  const router = useRouter();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: transparent ? 'transparent' : colors.headerBg,
          borderBottomColor: transparent ? 'transparent' : colors.headerBorder,
          paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight || 0 + 16,
        },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.content}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={[styles.backIcon, { color: colors.primary }]}>‹</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text style={[styles.title, { color: colors.text, fontSize: fontSize.xxl }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
                {subtitle}
              </Text>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    marginRight: 4,
  },
  backIcon: {
    fontSize: 32,
    fontWeight: '300',
    marginTop: -4,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 1,
  },
});
